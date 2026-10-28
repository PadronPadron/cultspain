import {env} from 'cloudflare:workers';
import {all,one,stmt,database,now,auditStmt} from './store';
import {InputError} from './accounting';
import {whatsappCall,validWhatsAppConfig,groupId,groupMember,whatsappMessage,WhatsAppError} from './whatsapp-core';
import {notificationCurrent} from './telegram-core';
export const WHATSAPP_WEBHOOK_URL='https://cultspain.com/api/whatsapp/webhook';
export const whatsappConfig=()=>({apiUrl:env.WHATSAPP_API_URL||'',instance:env.WHATSAPP_INSTANCE_ID||'',token:env.WHATSAPP_API_TOKEN||''});
export async function setting(key:string){return (await one('SELECT value FROM settings WHERE key=?',[key]))?.value||''}
export const saveSetting=(key:string,value:string)=>stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[key,value]);
async function testPending(){const value=await setting('whatsapp_test');if(!value)return false;return JSON.parse(value).expiresAt>=Math.floor(Date.now()/1000)}
export async function whatsappStatus(){const count=await one("SELECT COUNT(*) AS n FROM notifications WHERE channel='whatsapp' AND status IN ('pending','sending')"),last=await one("SELECT last_error FROM notifications WHERE channel='whatsapp' AND status IN ('pending','sending') AND last_error!='' ORDER BY updated_at DESC LIMIT 1");return {configured:validWhatsAppConfig(whatsappConfig()),connected:!!await setting('whatsapp_group_id'),verified:await setting('whatsapp_verified')==='1',groupTitle:await setting('whatsapp_group_title'),testPending:await testPending(),pending:Number(count?.n||0),lastError:last?.last_error||''}}
export async function beginWhatsAppPair(actor:string,authorized:boolean){
 if(!authorized)throw new InputError('Confirma el acceso del proveedor a la cuenta de WhatsApp antes de conectarla.');
 if(await setting('notifications_channel')==='whatsapp')throw new InputError('Selecciona Telegram antes de cambiar la conexión de WhatsApp.',409);
 const config=whatsappConfig(),state=await whatsappCall(config,'getStateInstance');if(state.stateInstance!=='authorized')throw new InputError('Vincula primero el número de Olga en GREEN-API con su teléfono.',409);
 const current=await whatsappCall(config,'getSettings');if(current.webhookUrl&&current.webhookUrl!==WHATSAPP_WEBHOOK_URL)throw new InputError('Esta conexión utiliza otro webhook. Crea una instancia exclusiva para CULT SPAIN; no se ha cambiado nada.',409);
 let secret=await setting('whatsapp_webhook_secret');if(!secret){secret=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');await saveSetting('whatsapp_webhook_secret',secret).run()}
 await whatsappCall(config,'setSettings',{webhookUrl:WHATSAPP_WEBHOOK_URL,webhookUrlToken:secret,incomingWebhook:'yes',outgoingMessageWebhook:'yes',outgoingAPIMessageWebhook:'no',markIncomingMessagesReaded:'no',markIncomingMessagesReadedOnReply:'no',keepOnlineStatus:'no'});
 const code=crypto.randomUUID().replaceAll('-',''),createdAt=Math.floor(Date.now()/1000),pair={code,createdAt,expiresAt:createdAt+600};
 await database().batch([saveSetting('whatsapp_pair',JSON.stringify(pair)),stmt("DELETE FROM settings WHERE key='whatsapp_pair_candidate'"),auditStmt(actor,'settings','whatsapp','pair-start',null,{expiresAt:pair.expiresAt})]);return {command:`VINCULAR ${code}`,expiresAt:pair.expiresAt};
}
export async function connectWhatsApp(actor:string){
 if(await setting('notifications_channel')==='whatsapp')throw new InputError('Selecciona Telegram antes de cambiar el grupo.',409);
 const value=await setting('whatsapp_pair'),candidate=await setting('whatsapp_pair_candidate');if(!value||!candidate)throw new InputError('Envía primero el comando de vinculación en el grupo del salón.');
 const pair=JSON.parse(value),match=JSON.parse(candidate);if(pair.expiresAt<Math.floor(Date.now()/1000)||match.code!==pair.code||!groupId(match.chatId))throw new InputError('El código caducó. Genera uno nuevo.');
 const config=whatsappConfig(),group=await whatsappCall(config,'getGroupData',{groupId:match.chatId});if(group.groupId!==match.chatId||!groupMember(group,match.sender))throw new InputError('No se pudo comprobar la pertenencia al grupo.',409);
 const delivered=await whatsappCall(config,'sendMessage',{chatId:match.chatId,message:'CULT SPAIN · Prueba de conexión.\nResponde a ESTE mensaje con VERIFICAR para comprobar que el salón puede recibir y responder avisos.\nTodavía no se han cambiado los avisos de Telegram.'});if(typeof delivered.idMessage!=='string')throw new WhatsAppError('No se recibió la referencia del mensaje de prueba.');
 await database().batch([saveSetting('whatsapp_test',JSON.stringify({chatId:match.chatId,title:String(group.subject||'Grupo del salón').slice(0,200),messageId:delivered.idMessage,expiresAt:Math.floor(Date.now()/1000)+3600})),auditStmt(actor,'settings','whatsapp','test-sent',null,{testSent:true})]);return {testSent:true};
}
export async function selectNotificationChannel(channel:string,actor:string){
 if(!['telegram','whatsapp'].includes(channel))throw new InputError('Canal no válido.');
 if(channel==='whatsapp'){const status=await whatsappStatus();if(!status.configured||!status.verified||!status.connected||status.testPending)throw new InputError('Completa la prueba de recepción y respuesta en WhatsApp antes de activar los avisos.',409);const session=await whatsappCall(whatsappConfig(),'getStateInstance');if(session.stateInstance!=='authorized')throw new InputError('La sesión de WhatsApp no está conectada.',409)}
 else if(!env.TELEGRAM_BOT_TOKEN||!await setting('telegram_chat_id')&&!env.TELEGRAM_CHAT_ID)throw new InputError('Telegram no está conectado.',409);
 await database().batch([saveSetting('notifications_channel',channel),auditStmt(actor,'settings','notifications','channel-changed',null,{channel})]);return {channel};
}
export async function flushWhatsApp(limit=5){
 const config=whatsappConfig(),target=await setting('whatsapp_group_id');if(!validWhatsAppConfig(config)||!groupId(target)||await setting('whatsapp_verified')!=='1')return {sent:0,configured:false};
 const stamp=now(),stale=new Date(Date.now()-120000).toISOString();let sent=0;
 const rows=await all("SELECT id FROM notifications WHERE channel='whatsapp' AND ((status='pending' AND next_attempt_at<=?) OR (status='sending' AND updated_at<?)) ORDER BY updated_at LIMIT ?",[stamp,stale,limit]);
 for(const row of rows){const claim=await stmt("UPDATE notifications SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND channel='whatsapp' AND ((status='pending' AND next_attempt_at<=?) OR (status='sending' AND updated_at<?)) RETURNING *",[stamp,row.id,stamp,stale]).first<any>();if(!claim)continue;
  const data=JSON.parse(claim.payload),current=await one('SELECT status,date,time FROM bookings WHERE id=?',[claim.booking_id]);if(!notificationCurrent(data,current)){await stmt("UPDATE notifications SET status='discarded',updated_at=?,last_error='' WHERE id=?",[now(),claim.id]).run();continue}
  try{const delivered=await whatsappCall(config,'sendMessage',{chatId:target,message:whatsappMessage(data),linkPreview:false});if(typeof delivered.idMessage!=='string'||!delivered.idMessage)throw new WhatsAppError('No se recibió la referencia del aviso.');await stmt("UPDATE notifications SET status='sent',updated_at=?,last_error='',whatsapp_message_id=?,whatsapp_chat_id=? WHERE id=?",[now(),delivered.idMessage,target,claim.id]).run();sent++}
  catch(error){await stmt("UPDATE notifications SET status='pending',updated_at=?,next_attempt_at=?,last_error=? WHERE id=?",[now(),new Date(Date.now()+Math.min(3600,30*2**Math.min(claim.attempts,7))*1000).toISOString(),error instanceof WhatsAppError?error.message:'No se pudo enviar el aviso de WhatsApp.',claim.id]).run()}
 }return {sent,configured:true};
}
