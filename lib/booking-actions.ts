import {InputError,text,required,cents,date} from './accounting';
import {calendarVersion,one,stmt,calendarBatch,auditStmt,all,id,now} from './store';
import {notificationStmt,flushNotifications} from './notifications';
// @ts-ignore Shared scheduling rules.
import {slots,min,today,initial} from '../public/model.js';
async function schedulingState(){const saved=await one("SELECT value FROM settings WHERE key='schedule'");const schedule=saved?JSON.parse(saved.value):{week:initial().week,exceptions:{}};return {...schedule,bookings:await all('SELECT id,date,time,duration,status FROM bookings')}}
export async function changeBooking(key:string,b:any,actor:string,notifyNow=true){
  const version=await calendarVersion(),old=await one('SELECT * FROM bookings WHERE id=?',[key]);
  if(!old)throw new InputError('No se ha encontrado el registro.',404);
  if(b.expectedDate!==undefined&&(b.expectedDate!==old.date||b.expectedTime!==old.time)||b.expectedStatus!==undefined&&b.expectedStatus!==old.status)throw new InputError('La cita ha cambiado. Actualiza su estado antes de continuar.',409);
  const commands:any[]=[];b.reason=text(b.reason,1000);
  if(b.action==='reschedule'&&['pending','confirmed'].includes(old.status)){
   if(b.expectedDate!==old.date||b.expectedTime!==old.time)throw new InputError('La cita ha cambiado. Actualiza la página antes de moverla.',409);
   const day=date(b.date),time=required(b.time,'Hora',5),s=await schedulingState();
   s.bookings=s.bookings.filter((x:any)=>x.id!==key);
   if(!slots(s,day,{duration:old.duration}).includes(time))throw new InputError('Este horario no está disponible. Elige otra fecha u hora.',409);
   commands.push(stmt('DELETE FROM booking_minutes WHERE booking_id=?',[key]),stmt('UPDATE bookings SET date=?,time=? WHERE id=?',[day,time,key]));
   for(let n=min(time);n<min(time)+old.duration+15;n++)commands.push(stmt('INSERT INTO booking_minutes(key,booking_id) VALUES(?,?)',[day+'|'+n,key]));
  }else if(b.action==='confirm'&&old.status==='pending'){if(old.date<today())throw new InputError('La fecha ya ha pasado. Cambia primero la cita.',409);commands.push(stmt("UPDATE bookings SET status='confirmed' WHERE id=?",[key]));}
  else if(b.action==='complete'&&old.status==='confirmed')commands.push(stmt("UPDATE bookings SET status='completed' WHERE id=?",[key]));
  else if(b.action==='cancel'&&['pending','confirmed'].includes(old.status))commands.push(stmt("UPDATE bookings SET status='cancelled' WHERE id=?",[key]),stmt('DELETE FROM booking_minutes WHERE booking_id=?',[key]));
  else if(b.action==='pay'&&old.status==='completed'&&old.paid_cents===0){if(await one('SELECT id FROM incomes WHERE booking_id=?',[key]))throw new InputError('La cita ya tiene un cobro registrado. Edita o restaura ese ingreso en Finanzas.',409);const amount=cents(b.paidCents);if(amount===0)throw new InputError('Introduce el importe realmente recibido.');commands.push(stmt('UPDATE bookings SET price_cents=?,price_confirmed=1,paid_cents=?,paid_date=? WHERE id=?',[amount,amount,date(b.date),key]),stmt("INSERT INTO incomes(id,created_at,updated_at,date,category,description,client_id,booking_id,amount_cents,payment_method) VALUES(?,?,?,?,?,?,?,?,?,?)",[id(),now(),now(),date(b.date),'Servicios','Cobro de cita',old.client_id,key,amount,'other']));}
  else throw new InputError('Esta acción ya se ha realizado o no está disponible.',409);
  if(['confirm','reschedule','cancel'].includes(b.action))commands.push(notificationStmt(key,b.action,b.action==='reschedule'?b.date:old.date,b.action==='reschedule'?b.time:old.time,old.service,old.status==='pending'&&b.action==='reschedule'));
  commands.push(auditStmt(actor,'bookings',key,b.action,old,b));
  try{await calendarBatch(version,commands)}catch(e){if(String(e).includes('UNIQUE'))throw new InputError('Este horario ya está ocupado. Elige otro.',409);throw e}
  if(notifyNow)try{await flushNotifications(1)}catch{}
  return {id:key}
}
