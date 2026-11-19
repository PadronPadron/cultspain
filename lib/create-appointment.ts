import {ensureICloud,icloudBusy} from './icloud';
import {pushQueueStmt} from './push';
import {InputError,required,text,date} from './accounting';
import {calendarVersion,calendarBatch,one,all,stmt,id,now,auditStmt} from './store';
import {notificationStmt,flushNotifications} from './notifications';
// @ts-ignore Shared scheduling rules.
import {initial,bookingServices,slots,validBookingDuration} from '../public/model.js';
export async function createAppointment(b:any,actor:string){
 const service=bookingServices.find((s:any)=>s.id===b.service);
 if(!service)throw new InputError('Selecciona un servicio válido.');
 const duration=b.duration,day=date(b.date),time=required(b.time,'Hora',5);
 if(!validBookingDuration(duration))throw new InputError('Introduce una duración válida.');
 if(!['pending','confirmed'].includes(b.status))throw new InputError('Selecciona el estado de la cita.');
 await ensureICloud(true);
 const version=await calendarVersion(),saved=await one("SELECT value FROM settings WHERE key='schedule'");
 const schedule=saved?JSON.parse(saved.value):{week:initial().week,exceptions:{}};
 const bookings=await all('SELECT id,date,time,duration,status FROM bookings');
 if(!slots({...schedule,bookings,busy:await icloudBusy()},day,{duration},new Date(),0).includes(time))throw new InputError('Esta hora no está disponible. Actualiza la agenda y elige otra.',409);
 let client=b.clientId?await one('SELECT * FROM clients WHERE id=? AND archived=0',[required(b.clientId,'Cliente',80)]):null;
 if(b.clientId&&!client)throw new InputError('El cliente no existe o está archivado.');
 const commands:any[]=[],stamp=now();
 if(!client){
  const firstName=required(b.firstName,'Nombre',100),lastName=text(b.lastName,100),phone=required(b.phone,'Teléfono',30);
  if(!/^[+0-9 ()-]{6,30}$/.test(phone))throw new InputError('Revisa el teléfono.');
  const matches=(await all('SELECT * FROM clients WHERE archived=0')).filter(c=>c.phone.replace(/\D/g,'')===phone.replace(/\D/g,'')&&c.first_name.trim().toLowerCase()===firstName.toLowerCase()&&c.last_name.trim().toLowerCase()===lastName.toLowerCase());
  client=matches.length===1?matches[0]:{id:id()};
  if(matches.length!==1)commands.push(stmt('INSERT INTO clients(id,created_at,updated_at,first_name,last_name,phone) VALUES(?,?,?,?,?,?)',[client.id,stamp,stamp,firstName,lastName,phone]));
 }
 const key=id();commands.push(pushQueueStmt(b.status==='confirmed'?'confirm':'request',key,day,time));
 commands.push(stmt('INSERT INTO bookings(id,client_id,date,time,service,duration,price_cents,price_confirmed,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[key,client.id,day,time,service.id,duration,0,0,b.status,stamp]),notificationStmt(key,b.status==='confirmed'?'confirm':'request',day,time,service.id,false,duration),auditStmt(actor,'bookings',key,'create',null,{clientId:client.id,date:day,time,service:service.id,duration,status:b.status}));
 await calendarBatch(version,commands);
 try{await flushNotifications(1)}catch{}
 return {id:key,date:day,time,status:b.status};
}
