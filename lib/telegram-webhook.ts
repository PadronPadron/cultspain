import {env} from 'cloudflare:workers';
import {one,stmt} from './store';
import {changeBooking} from './booking-actions';
import {InputError} from './accounting';
import {telegramCall,pairFromUpdates,callbackAuthorized,activeGroupMember} from './telegram-core';
function equal(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
export async function handleTelegramWebhook(request:Request){
 const stored=(await one("SELECT value FROM settings WHERE key='telegram_webhook_secret'"))?.value||'';
 if(!stored||!equal(request.headers.get('X-Telegram-Bot-Api-Secret-Token')||'',stored))return Response.json({error:'No autorizado.'},{status:403});
 if(Number(request.headers.get('content-length'))>100000)return new Response(null,{status:413});
 const raw=await request.text();if(raw.length>100000)return new Response(null,{status:413});let update:any;try{update=JSON.parse(raw)}catch{return new Response(null,{status:400})}
 if(update.message){const row=await one("SELECT value FROM settings WHERE key='telegram_pair'");if(row){const pair=JSON.parse(row.value);if(pair.expiresAt>=Math.floor(Date.now()/1000)){const match=pairFromUpdates([update],pair.code,pair.username,pair.createdAt);if(match?.approverId)await stmt("INSERT INTO settings(key,value) VALUES('telegram_pair_candidate',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[JSON.stringify({...match,code:pair.code})]).run()}}return Response.json({ok:true})}
 const q=update.callback_query;if(!q?.id)return Response.json({ok:true});
 const reply=async(text:string)=>{try{if(env.TELEGRAM_BOT_TOKEN)await telegramCall(env.TELEGRAM_BOT_TOKEN,'answerCallbackQuery',{callback_query_id:q.id,text,show_alert:true})}catch{}return Response.json({ok:true})};
 const match=/^([cr]):([0-9a-f-]{36})$/.exec(q.data||'');if(!match)return reply('Acción no válida.');
 const chat=(await one("SELECT value FROM settings WHERE key='telegram_chat_id'"))?.value||env.TELEGRAM_CHAT_ID||'';
 const notice=await one("SELECT telegram_message_id,payload FROM notifications WHERE booking_id=? AND telegram_message_id=? AND status='sent'",[match[2],q.message?.message_id||0]);
 if(!notice||!callbackAuthorized(q,chat,notice.telegram_message_id))return reply('Esta acción solo funciona dentro del grupo vinculado del salón.');
 if(!env.TELEGRAM_BOT_TOKEN)return reply('El bot no está configurado.');
 try{const member=await telegramCall(env.TELEGRAM_BOT_TOKEN,'getChatMember',{chat_id:chat,user_id:q.from.id});if(!activeGroupMember(member))return reply('Solo los miembros actuales del grupo pueden gestionar solicitudes.')}catch{return reply('No se pudo comprobar la pertenencia al grupo. Reintenta o gestiona la cita en la administración.')}
 const current=await one('SELECT status,date,time FROM bookings WHERE id=?',[match[2]]);if(current?.status!=='pending')return reply('Esta solicitud ya se ha gestionado. Revisa su estado en la administración.');
 const original=JSON.parse(notice.payload);if(original.date!==current.date||original.time!==current.time)return reply('La fecha u hora cambió. Utiliza el aviso más reciente.');
 try{await changeBooking(match[2],{action:match[1]==='c'?'confirm':'cancel',expectedDate:original.date,expectedTime:original.time,expectedStatus:'pending',reason:'Acción de un miembro del grupo desde Telegram.'},'telegram:'+q.from.id,false)}catch(error){return reply(error instanceof InputError?error.message:'No se pudo guardar el cambio. Revisa la administración.');}
 const response=await reply(match[1]==='c'?'Cita confirmada y guardada en CRM.':'Solicitud rechazada. Horario liberado.');
 try{if(env.TELEGRAM_BOT_TOKEN)await telegramCall(env.TELEGRAM_BOT_TOKEN,'editMessageReplyMarkup',{chat_id:chat,message_id:q.message.message_id,reply_markup:{inline_keyboard:[[{text:'Abrir administración',url:'https://cultspain.com/admin#bookings'}]]}})}catch{}
 return response;
}
