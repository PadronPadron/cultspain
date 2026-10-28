import {one,database,auditStmt} from './store';
import {changeBooking} from './booking-actions';
import {InputError} from './accounting';
import {whatsappConfig,setting,saveSetting,flushWhatsApp} from './whatsapp';
import {whatsappCall,whatsappEnvelope,whatsappAction,secureEqual,groupMember} from './whatsapp-core';
export async function handleWhatsAppWebhook(request:Request){
 const secret=await setting('whatsapp_webhook_secret');if(!secret||!secureEqual(request.headers.get('Authorization')||'','Bearer '+secret))return Response.json({error:'No autorizado.'},{status:403});
 if(Number(request.headers.get('content-length'))>100000)return new Response(null,{status:413});const raw=await request.text();if(raw.length>100000)return new Response(null,{status:413});let update:any;try{update=JSON.parse(raw)}catch{return new Response(null,{status:400})}
 const config=whatsappConfig(),message=whatsappEnvelope(update,config.instance),ok=()=>Response.json({ok:true});if(!message)return ok();
 const pairRaw=await setting('whatsapp_pair');if(pairRaw){const pair=JSON.parse(pairRaw),stamp=Math.floor(Date.now()/1000);if(pair.expiresAt>=stamp&&message.timestamp>=pair.createdAt-15&&message.timestamp<=stamp+60&&message.text===`VINCULAR ${pair.code}`){await saveSetting('whatsapp_pair_candidate',JSON.stringify({...message,code:pair.code})).run();return ok()}}
 // All non-selected groups and all personal messages are discarded without persistence.
 const testRaw=await setting('whatsapp_test');if(testRaw){const test=JSON.parse(testRaw);if(test.expiresAt>=Math.floor(Date.now()/1000)&&message.chatId===test.chatId&&message.quote===test.messageId&&message.text.toUpperCase()==='VERIFICAR'){
  const group=await whatsappCall(config,'getGroupData',{groupId:message.chatId});if(group.groupId!==message.chatId||!groupMember(group,message.sender))return ok();
  await database().batch([saveSetting('whatsapp_group_id',test.chatId),saveSetting('whatsapp_group_title',test.title),saveSetting('whatsapp_verified','1'),saveSetting('whatsapp_test',''),saveSetting('whatsapp_pair',''),saveSetting('whatsapp_pair_candidate',''),auditStmt('whatsapp-group-member','settings','whatsapp','verified',null,{verified:true})]);return ok();
 }}
 const target=await setting('whatsapp_group_id'),action=whatsappAction(message.text);if(message.chatId!==target||!message.quote||!action||await setting('whatsapp_verified')!=='1')return ok();
 const notice=await one("SELECT booking_id,payload FROM notifications WHERE channel='whatsapp' AND whatsapp_message_id=? AND whatsapp_chat_id=? AND status='sent'",[message.quote,target]);if(!notice)return ok();
 const group=await whatsappCall(config,'getGroupData',{groupId:target});if(group.groupId!==target||!groupMember(group,message.sender))return ok();
 const original=JSON.parse(notice.payload),current=await one('SELECT status,date,time FROM bookings WHERE id=?',[notice.booking_id]);
 if(current?.status!=='pending'||original.date!==current.date||original.time!==current.time||!['request','reschedule'].includes(original.event))return ok();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(message.sender)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);
 try{await changeBooking(notice.booking_id,{action,expectedDate:original.date,expectedTime:original.time,expectedStatus:'pending',reason:'Respuesta de un miembro del grupo de WhatsApp.'},'whatsapp:'+digest,false)}catch(error){if(error instanceof InputError)return ok();throw error}
 // Deliver the saved status promptly; a failed delivery remains queued for cron.
 try{await flushWhatsApp(1)}catch{}
 return ok();
}
