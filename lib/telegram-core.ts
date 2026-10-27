export class TelegramError extends Error {}
export async function telegramCall(token:string,method:'sendMessage'|'getMe'|'getUpdates'|'getWebhookInfo',body:unknown={},transport:typeof fetch=fetch):Promise<any>{
 if(!token)throw new TelegramError('Falta el token del bot en Cloudflare.');
 try{const response=await transport(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});const result:any=await response.json();if(!response.ok||!result.ok){const code=result.error_code||response.status;throw new TelegramError(code===401?'El token del bot no es válido.':code===403?'El bot no puede enviar mensajes a este grupo.':code===409?'El bot ya utiliza un webhook u otra conexión. Usa un bot exclusivo para el salón.':code===429?'Telegram ha limitado los envíos. Reintenta más tarde.':'Telegram no aceptó la solicitud.')}return result.result}catch(error){if(error instanceof TelegramError)throw error;throw new TelegramError('No se pudo conectar con Telegram. Reintenta más tarde.')}
}
export function groupFromUpdates(updates:any[],code:string,username:string,createdAt:number){
 for(const update of [...updates].reverse()){const m=update.message;if(!m||!['group','supergroup'].includes(m.chat?.type)||m.date<createdAt-15)continue;if([`/vincular ${code}`,`/vincular@${username} ${code}`].includes(m.text?.trim()))return String(m.chat.id)}return null;
}
export function notificationMessage(data:{event:string;bookingId:string;date:string;time:string;service:string}){
 const title:Record<string,string>={request:'Nueva solicitud · pendiente de confirmar',confirm:'Cita confirmada',reschedule:'Cita cambiada',cancel:'Cita cancelada'};
 return {text:`CULT SPAIN\n${title[data.event]||'Cambio de cita'}\n${data.date} · ${data.time} · hora de Lugo\n${data.service}\nReferencia: ${data.bookingId.slice(0,8)}\nRevisa los datos y gestiona la cita en la administración.`,reply_markup:{inline_keyboard:[[{text:'Abrir administración',url:'https://cultspain.com/admin#bookings'}]]},link_preview_options:{is_disabled:true}};
}
