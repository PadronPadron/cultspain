import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import * as accounting from '../lib/accounting.ts';
import * as model from '../public/model.js';
function load(file,deps,names){const source=stripTypeScriptTypes(readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''));return new Function(...Object.keys(deps),source+'\nreturn {'+names.join(',')+'};')(...Object.values(deps));}
function fixture(){
 let busy=[];
 const db=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 const stmt=(sql,args=[])=>({run:()=>db.prepare(sql).run(...args),all:async()=>({results:db.prepare(sql).all(...args)}),first:()=>db.prepare(sql).get(...args)});
 const storeSource=readFileSync(new URL('../lib/store.ts',import.meta.url),'utf8').slice(readFileSync(new URL('../lib/store.ts',import.meta.url),'utf8').indexOf('export async function guardedBatch'));
 const deps={ensureICloud:async()=>{},icloudBusy:async()=>busy,...accounting,...model,stmt,id:()=>crypto.randomUUID(),now:()=>new Date().toISOString(),one:async(sql,args=[])=>db.prepare(sql).get(...args),all:async(sql,args=[])=>db.prepare(sql).all(...args),database:()=>({batch:async commands=>{db.exec('BEGIN');try{const result=commands.map(c=>c.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}})};
 Object.assign(deps,new Function(...Object.keys(deps),stripTypeScriptTypes(storeSource.replaceAll('export ',''))+';return {calendarVersion,calendarBatch}')(...Object.values(deps)));
 deps.auditStmt=(actor,type,key,action,before,after)=>stmt('INSERT INTO audit_log(id,at,actor,entity_type,entity_id,action,before_json,after_json) VALUES(?,?,?,?,?,?,?,?)',[deps.id(),deps.now(),actor,type,key,action,JSON.stringify(before),JSON.stringify(after)]);
 deps.notificationStmt=(key,event,day,time,service,pending,duration)=>stmt("INSERT INTO notifications(id,booking_id,event,payload,status,attempts,updated_at,next_attempt_at,last_error,channel) VALUES(?,?,?,?,'pending',0,?,?,'','telegram')",[deps.id(),key,event,JSON.stringify({day,time,service,pending,duration}),deps.now(),deps.now()]);deps.flushNotifications=async()=>{};deps.pushQueueStmt=()=>stmt('SELECT 1');
 return {setBusy:value=>busy=value,db,...load('lib/create-appointment.ts',deps,['createAppointment']),...load('lib/booking-actions.ts',deps,['changeBooking']),...deps};
}
test('owner agenda creates, reuses client, edits service, rejects overlaps and stale updates, then releases cancelled time',async()=>{
 const f=fixture(),s={...model.initial(),bookings:[]},service=model.bookingServices[0];let date,time;
 for(let n=1;n<15;n++){date=model.addDays(model.today(),n);time=model.slots(s,date,{duration:60},new Date(),0)[0];if(time)break}
 const body={firstName:'Prueba',lastName:'Agenda',phone:'+34000000000',service:service.id,duration:60,date,time,status:'confirmed'};
 const b=await f.createAppointment(body,'owner');let row=await f.one('SELECT * FROM bookings WHERE id=?',[b.id]);assert.equal(row.status,'confirmed');assert.equal(row.price_confirmed,0);
 await assert.rejects(()=>f.createAppointment(body,'owner'),e=>e.status===409);assert.equal((await f.all('SELECT * FROM clients')).length,1);
 await assert.rejects(()=>f.createAppointment({...body,time:'23:59'},'owner'),e=>e.status===409);
 await assert.rejects(()=>f.createAppointment({...body,duration:0},'owner'));await assert.rejects(()=>f.createAppointment({...body,status:'completed'},'owner'));
 const edit={action:'reschedule',date,time,duration:45,service:model.bookingServices[1].id,expectedDate:date,expectedTime:time,expectedDuration:60,expectedService:service.id,expectedStatus:'confirmed'};
 await f.changeBooking(b.id,edit,'owner',false);row=await f.one('SELECT * FROM bookings WHERE id=?',[b.id]);assert.equal(row.service,edit.service);assert.equal(row.duration,45);
 await assert.rejects(()=>f.changeBooking(b.id,edit,'owner',false),e=>e.status===409);
 await f.changeBooking(b.id,{action:'cancel'},'owner',false);
 const b2=await f.createAppointment({...body,status:'pending'},'owner');const r2=await f.one('SELECT * FROM bookings WHERE id=?',[b2.id]);assert.equal(r2.client_id,row.client_id);
 await f.changeBooking(b2.id,{action:'confirm',expectedStatus:'pending'},'owner',false);assert.equal((await f.one('SELECT * FROM bookings WHERE id=?',[b2.id])).status,'confirmed');
 await assert.rejects(()=>f.changeBooking(b2.id,{action:'confirm'},'owner',false),e=>e.status===409);f.db.close();
});
test('simultaneous manual creates allow only one appointment and roll back the other client',async()=>{
 const f=fixture(),service=model.bookingServices[0],s={...model.initial(),bookings:[]};let date,time;for(let n=1;n<15;n++){date=model.addDays(model.today(),n);time=model.slots(s,date,service)[0];if(time)break}
 const body={date,time,service:service.id,duration:service.duration,phone:'+34000000000',status:'pending'};
 const result=await Promise.allSettled([f.createAppointment({...body,firstName:'One'},'owner'),f.createAppointment({...body,firstName:'Two'},'owner')]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.all('SELECT * FROM bookings')).length,1);assert.equal((await f.all('SELECT * FROM clients')).length,1);f.db.close();
});

test('server owner creation, confirmation and rescheduling all reject imported occupied time',async()=>{
 const f=fixture(),service=model.bookingServices[0];let date,time;
 for(let n=1;n<15;n++){date=model.addDays(model.today(),n);time=model.slots(model.initial(),date,service)[0];if(time)break}
 const body={date,time,service:service.id,duration:60,phone:'+34000000000',firstName:'Test',status:'pending'};
 f.setBusy([{date,time,duration:60,external:true}]);await assert.rejects(f.createAppointment(body,'owner'),e=>e.status===409);
 f.setBusy([]);const booking=await f.createAppointment(body,'owner');f.setBusy([{date,time,duration:60,external:true}]);
 await assert.rejects(f.changeBooking(booking.id,{action:'confirm'},'owner',false),e=>e.status===409);
 await assert.rejects(f.changeBooking(booking.id,{action:'reschedule',date,time,expectedDate:date,expectedTime:time},'owner',false),e=>e.status===409);
 await f.changeBooking(booking.id,{action:'cancel'},'owner',false);f.db.close();
});
