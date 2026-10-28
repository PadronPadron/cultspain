import {stmt,id,now} from './store';
import {flushTelegram} from './telegram';
import {flushWhatsApp} from './whatsapp';
// @ts-ignore Shared public catalogue.
import {services,serviceLabel} from '../public/model.js';
export function notificationStmt(bookingId:string,event:string,date:string,time:string,service:string,pending=false){const label=services.find((s:any)=>s.id===service);return stmt("INSERT INTO notifications(id,booking_id,event,payload,status,attempts,updated_at,next_attempt_at,last_error,channel) VALUES(?,?,?,?,?,0,?,?,?,COALESCE((SELECT value FROM settings WHERE key='notifications_channel'),'telegram'))",[id(),bookingId,event,JSON.stringify({event,bookingId,date,time,pending,service:label?serviceLabel(label):service}),'pending',now(),now(),''])}
// Bound both channels together so cron remains within the Worker's request budget.
export async function flushNotifications(limit=5){const each=Math.max(1,Math.min(5,Math.floor(limit/2)));return Promise.allSettled([flushTelegram(each),flushWhatsApp(each)])}
