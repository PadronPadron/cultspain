import {InputError} from './accounting';
import {one,all,stmt,id,now} from './store';
import {newVapidKeys,pushRequest,validPushEndpoint,unb64} from './web-push';
import {secretHash} from './calendar-feed';
async function keys(){let saved=await one("SELECT value FROM settings WHERE key='push_vapid'");if(!saved){const generated=await newVapidKeys();await stmt("INSERT OR IGNORE INTO settings(key,value) VALUES('push_vapid',?)",[JSON.stringify(generated)]).run();saved=await one("SELECT value FROM settings WHERE key='push_vapid'");}return JSON.parse(saved.value);}
export async function pushPublicKey(){return (await keys()).publicKey;}
export async function savePush(b:any){
 if(typeof b.endpoint!=='string'||b.endpoint.length>3000||!validPushEndpoint(b.endpoint))throw new InputError('Este servicio de notificaciones no es compatible.');
 const key='push_subscription_'+await secretHash(b.endpoint);
 if(b.action==='remove'){await stmt('DELETE FROM settings WHERE key=?',[key]).run();return {ok:true};}
 try{const pub=unb64(b.keys.p256dh),auth=unb64(b.keys.auth);if(pub.length!==65||pub[0]!==4||auth.length!==16)throw Error();await crypto.subtle.importKey('raw',pub,{name:'ECDH',namedCurve:'P-256'},false,[]);}catch{throw new InputError('La suscripción no es válida. Activa las notificaciones de nuevo.');}
 if((await all("SELECT key FROM settings WHERE key LIKE 'push_subscription_%'")).length>=30&&!await one('SELECT key FROM settings WHERE key=?',[key]))throw new InputError('Se ha alcanzado el límite de dispositivos.');
 await stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[key,JSON.stringify({endpoint:b.endpoint,keys:{p256dh:b.keys.p256dh,auth:b.keys.auth},createdAt:now()})]).run();return {ok:true};
}
export function pushQueueStmt(event:string,bookingId:string,day:string,time:string){
 const titles:Record<string,string>={request:'Nueva solicitud de cita',confirm:'Cita confirmada',reschedule:'Cita modificada',cancel:'Cita cancelada'};
 return stmt("INSERT INTO settings(key,value) SELECT ? || key,json_object('subscription',key,'title',?,'body',?,'tag',?,'event',?,'day',?,'time',?,'attempt',0,'nextAt',?) FROM settings WHERE key LIKE 'push_subscription_%'",['push_job_'+id()+'_',titles[event]||'Agenda actualizada',`${day} · ${time} · hora de Lugo. Abre la agenda para ver los detalles.`,bookingId,event,day,time,Date.now()]);
}
export async function testPush(endpoint:string){const key='push_subscription_'+await secretHash(endpoint),saved=await one('SELECT value FROM settings WHERE key=?',[key]);if(!saved)throw new InputError('Activa primero las notificaciones en este dispositivo.');const request=await pushRequest(JSON.parse(saved.value),await keys(),{title:'CULT SPAIN',body:'Las notificaciones están conectadas.',tag:'cult-test'});let r:Response;try{r=await fetch(endpoint,{...request,signal:AbortSignal.timeout(10000)})}catch{throw new InputError('No se ha podido enviar la prueba. Reintenta.');}if(!r.ok)throw new InputError('El servicio push rechazó la prueba. Desactiva y vuelve a activar las notificaciones.');return {ok:true};}
export async function flushPush(limit=5){
 const jobs=await all("SELECT key,value FROM settings WHERE key LIKE 'push_job_%' AND CAST(json_extract(value,'$.nextAt') AS INTEGER)<=? ORDER BY json_extract(value,'$.nextAt') LIMIT ?",[Date.now(),limit]);
 for(const row of jobs){const job=JSON.parse(row.value);const claimed=await stmt("UPDATE settings SET value=json_set(value,'$.nextAt',?) WHERE key=? AND value=?",[Date.now()+60000,row.key,row.value]).run();if(!claimed.meta.changes)continue;
  const booking=await one('SELECT status,date,time FROM bookings WHERE id=?',[job.tag]);
  const expected=job.event==='request'?['pending']:job.event==='cancel'?['cancelled']:job.event==='reschedule'?['pending','confirmed']:['confirmed'];
  if(!booking||booking.date!==job.day||booking.time!==job.time||!expected.includes(booking.status)){await stmt('DELETE FROM settings WHERE key=?',[row.key]).run();continue;}
  const subscription=await one('SELECT value FROM settings WHERE key=?',[job.subscription]);if(!subscription){await stmt('DELETE FROM settings WHERE key=?',[row.key]).run();continue;}
  try{const sub=JSON.parse(subscription.value),request=await pushRequest(sub,await keys(),{title:job.title,body:job.body,tag:job.tag});const response=await fetch(sub.endpoint,{...request,signal:AbortSignal.timeout(10000)});
   if(response.ok||response.status===404||response.status===410){await stmt('DELETE FROM settings WHERE key=?',[row.key]).run();if(!response.ok)await stmt('DELETE FROM settings WHERE key=?',[job.subscription]).run();continue;}
  }catch{/* Keep a bounded retry queue; never log endpoint credentials. */}
  job.attempt++;if(job.attempt>=5){await stmt('DELETE FROM settings WHERE key=?',[row.key]).run();continue;}job.nextAt=Date.now()+Math.min(3600000,60000*2**job.attempt);await stmt('UPDATE settings SET value=? WHERE key=?',[JSON.stringify(job),row.key]).run();
 }
 return {processed:jobs.length};
}
