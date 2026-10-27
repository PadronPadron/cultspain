import assert from 'node:assert/strict';
import {services,slots,today,addDays} from '../public/model.js';
const base='http://127.0.0.1:4173/api/',tag='PRUEBA-AGENDA-'+Date.now(),created=[];
async function request(path,method='GET',body,status=200){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data}
async function state(){return request('admin/state')}
const service=services.find(x=>x.id==='mens-cut-beard');
async function available(exclude=[]){const s=await state();s.bookings=s.bookings.filter(x=>!exclude.includes(x.id));for(let n=2;n<25;n++){const date=addDays(today(),n),times=slots(s,date,service);if(times.length>5)return {date,times}}throw Error('No free slots for test')}
async function book(date,time,firstName=tag){const b=await request('bookings','POST',{date,time,service:service.id,firstName,lastName:'CRM',phone:'000000000',email:'prueba@example.invalid'},201);created.push(b.id);return (await state()).bookings.find(x=>x.id===b.id)}
const move=(b,date,time,status=200)=>request('admin/bookings/'+b.id,'PUT',{action:'reschedule',date,time,expectedDate:b.date,expectedTime:b.time},status);
try{
 const a=await available(),one=await book(a.date,a.times[0]);
 const client=(await state()).clients.find(x=>x.id===one.clientId);assert(client);assert.equal(client.email,'prueba@example.invalid');assert.equal(client.firstName,tag);
 const s=await state(),secondTime=slots(s,a.date,service).at(-1),two=await book(a.date,secondTime);
 assert.equal(two.clientId,one.clientId,'Repeat booking belongs to the same CRM client');
 await move(one,two.date,two.time,409);
 assert.equal((await state()).bookings.find(x=>x.id===one.id).time,one.time,'Failed move preserves original');
 const newTime=slots({...await state(),bookings:(await state()).bookings.filter(x=>x.id!==one.id)},one.date,service).find(t=>t!==one.time&&t<two.time);
 assert(newTime);await move(one,one.date,newTime);
 let moved=(await state()).bookings.find(x=>x.id===one.id);assert.equal(moved.time,newTime);assert.equal(moved.clientId,one.clientId);assert.equal(moved.duration,60);assert.equal(moved.price,null);
 await move(one,one.date,one.time,409);
 const target=addDays(one.date,1),calendar=await state(),time=slots({...calendar,bookings:calendar.bookings.filter(x=>x.id!==one.id)},target,service)[0];
 if(time){await move(moved,target,time);moved=(await state()).bookings.find(x=>x.id===one.id);assert.equal(moved.date,target);assert(slots(await request('availability'),one.date,service).includes(one.time),'Old slot released');}
 const closed=addDays(today(),(7-new Date(today()+'T12:00:00Z').getUTCDay())%7||7);await move(moved,closed,'10:00',409);
 await request('admin/bookings/'+one.id,'PUT',{action:'cancel'});
 assert.equal((await state()).bookings.find(x=>x.id===one.id).status,'cancelled');
 assert(slots(await request('availability'),moved.date,service).includes(moved.time),'Cancel frees new slot');await move(moved,moved.date,moved.time,409);
 const audit=await request('admin/audit');assert(audit.some(x=>x.entityId===one.id&&x.action==='reschedule'));assert(audit.some(x=>x.entityId===one.id&&x.action==='cancel'));
 const history=(await state()).bookings.filter(x=>x.clientId===one.clientId);assert.equal(history.length,2);assert(history.some(x=>x.status==='cancelled'));
 console.log('PASS: automatic CRM creation/reuse/history, same-day and date moves, conflict rollback, stale change rejected, closed day rejected, cancellation releases time and audit retained.');
}finally{
 const s=await state();for(const id of created){const b=s.bookings.find(x=>x.id===id);if(['pending','confirmed'].includes(b?.status))await request('admin/bookings/'+id,'PUT',{action:'cancel'})}
 const after=await state();for(const c of after.clients.filter(x=>x.firstName===tag&&!x.archived))await request('admin/clients/'+c.id,'PUT',{action:'archive',revision:c.revision});
}
