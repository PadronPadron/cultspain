export class WhatsAppError extends Error {}
export type WhatsAppConfig={apiUrl:string;instance:string;token:string};
export function validWhatsAppConfig(c:WhatsAppConfig){try{const u=new URL(c.apiUrl);return u.protocol==='https:'&&/^(?:(?:[0-9]+\.)?api\.green-?api\.com)$/.test(u.hostname)&&!u.port&&!u.username&&!u.password&&['','/'].includes(u.pathname)&&!u.search&&!u.hash&&/^\d{5,20}$/.test(c.instance)&&/^[A-Za-z0-9_-]{20,200}$/.test(c.token)}catch{return false}}
export async function whatsappCall(c:WhatsAppConfig,method:'getStateInstance'|'getSettings'|'setSettings'|'getGroupData'|'sendMessage',body?:unknown,transport:typeof fetch=fetch):Promise<any>{
 if(!validWhatsAppConfig(c))throw new WhatsAppError('Configura las credenciales de WhatsApp en Cloudflare.');
 try{const response=await transport(`${c.apiUrl.replace(/\/$/,'')}/waInstance${c.instance}/${method}/${c.token}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw new WhatsAppError(response.status===401||response.status===403?'WhatsApp rechazó las credenciales o la sesión.':response.status===429?'WhatsApp ha limitado los envíos. Reintenta más tarde.':'El proveedor no aceptó la solicitud de WhatsApp.');return await response.json()}catch(error){if(error instanceof WhatsAppError)throw error;throw new WhatsAppError('No se pudo conectar con WhatsApp. Revisa la sesión e inténtalo de nuevo.')}
}
export const groupId=(s:unknown)=>typeof s==='string'&&/^\d[\d-]{4,60}@g\.us$/.test(s);
export function groupMember(group:any,sender:string){return !!sender&&Array.isArray(group?.participants)&&group.participants.some((p:any)=>[p.id,p.lid,p.phoneNumber].includes(sender))}
export function whatsappEnvelope(update:any,instance:string){
 if(!['incomingMessageReceived','outgoingMessageReceived'].includes(update?.typeWebhook)||String(update.instanceData?.idInstance)!==instance||update.instanceData?.typeInstance!=='whatsapp'||!groupId(update.senderData?.chatId))return null;
 const own=update.typeWebhook==='outgoingMessageReceived',sender=own?(update.senderData?.sender||update.instanceData?.wid):update.senderData?.sender;
 if(typeof sender!=='string'||!/^\d{5,30}@(?:c\.us|lid)$/.test(sender)||typeof update.idMessage!=='string'||update.idMessage.length>150)return null;
 const data=update.messageData||{},text=data.textMessageData?.textMessage??data.extendedTextMessageData?.text,quote=data.extendedTextMessageData?.stanzaId;
 if(typeof text!=='string'||text.length>150)return null;
 return {chatId:update.senderData.chatId,sender,text:text.trim(),quote:typeof quote==='string'&&quote.length<=150?quote:'',timestamp:Number(update.timestamp),messageId:update.idMessage};
}
export function whatsappAction(text:string){const value=text.trim().toLocaleLowerCase('es');return ['confirmar','подтвердить'].includes(value)?'confirm':['rechazar','отклонить'].includes(value)?'cancel':null}
export function whatsappMessage(data:{event:string;bookingId:string;date:string;time:string;service:string;pending?:boolean}){
 const title:Record<string,string>={request:'Nueva solicitud · pendiente de confirmar',confirm:'Cita confirmada',reschedule:'Cita cambiada',cancel:'Cita cancelada'};
 return `CULT SPAIN\n${title[data.event]||'Cambio de cita'}\n${data.date} · ${data.time} · hora de Lugo\n${data.service}\nReferencia: ${data.bookingId.slice(0,8)}\n${data.event==='request'||data.pending?'Responde a ESTE mensaje con Confirmar o Rechazar.\n':''}Administración: https://cultspain.com/admin#bookings`;
}
export function secureEqual(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0}
