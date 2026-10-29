import assert from 'node:assert/strict';
import {dayAt,addDays,availableSlots} from '../public/beauty-lab/calendar.js';
const base='http://127.0.0.1:4173/api/beauty/',tag='QA BEAUTY '+Date.now();
async function req(path,method='GET',body,status=200,headers={}){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={error:raw}}assert.equal(r.status,status,JSON.stringify(data));return data}
const original=await req('admin/state'),cultBefore=await fetch('http://127.0.0.1:4173/api/admin/state').then(r=>r.json());let day=addDays(dayAt(),7);while(!availableSlots(original.schedule,original.bookings,day).length)day=addDays(day,1);const time=availableSlots(original.schedule,original.bookings,day)[0];
const payload={service:'manicura',design:true,priceCents:1,date:day,time,name:tag,phone:'+34000000000',email:'qa@example.invalid',requestKey:crypto.randomUUID()};
await req('bookings','POST',{...payload,service:'unknown'},400);
await req('bookings','POST',payload,403,{Origin:'https://example.invalid'});
const outcomes=await Promise.all([payload,{...payload,requestKey:crypto.randomUUID(),name:tag+' simultaneous'}].map(async body=>{const r=await fetch(base+'bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),body}}));
assert.deepEqual(outcomes.map(r=>r.status).sort(),[201,409]);const winner=outcomes.find(r=>r.status===201);assert.equal((await req('bookings','POST',winner.body)).id,winner.data.id);
let state=await req('admin/state'),booking=state.bookings.find(b=>b.id===winner.data.id);assert.equal(booking.duration,85);assert.equal(booking.status,'pending');assert.equal(booking.price_cents,3100);assert.equal(booking.design,1);assert.equal(state.clients.filter(c=>c.name.startsWith(tag)).length,1);
const publicState=await req('availability');assert.ok(!JSON.stringify(publicState).includes(tag));assert.ok(!('client_id' in publicState.bookings[0]));
const savedSchedule=state.schedule;await req('admin/schedule','PUT',{...savedSchedule,version:state.version,durations:{...savedSchedule.durations,manicura:75,pedicura:85}});await req('admin/schedule','PUT',{...savedSchedule,version:state.version},409);
state=await req('admin/state');assert.equal(state.bookings.find(b=>b.id===booking.id).duration,85);
await req('admin/bookings/'+booking.id,'PUT',{revision:booking.revision,status:'confirmed'});await req('admin/bookings/'+booking.id,'PUT',{revision:booking.revision,status:'cancelled'},409);
state=await req('admin/state');booking=state.bookings.find(b=>b.id===booking.id);const newTime=availableSlots(state.schedule,state.bookings,day,new Date(),85)[0];await req('admin/bookings/'+booking.id,'PUT',{revision:booking.revision,time:newTime});
state=await req('admin/state');await req('admin/schedule','PUT',{...state.schedule,version:state.version,exceptions:{...state.schedule.exceptions,[day]:{open:false}}},409);
const income=await req('admin/entries','POST',{kind:'income',date:dayAt(),description:tag+' cobro',amountCents:3500,method:'cash',clientId:booking.client_id,bookingId:booking.id},201);
await req('admin/entries','POST',{kind:'income',date:dayAt(),description:'duplicate',amountCents:3500,method:'cash',clientId:booking.client_id,bookingId:booking.id},409);
const expense=await req('admin/entries','POST',{kind:'expense',date:dayAt(),description:tag+' gasto',amountCents:1250,method:'card'},201);
state=await req('admin/state');const inc=state.entries.find(e=>e.id===income.id);await req('admin/entries/'+income.id,'PUT',{revision:inc.revision,action:'archive'},400);
for(const k of [income.id,expense.id]){const e=state.entries.find(e=>e.id===k);await req('admin/entries/'+k,'PUT',{revision:e.revision,action:'archive',reason:'Prueba local terminada'})}
booking=state.bookings.find(b=>b.id===booking.id);await req('admin/bookings/'+booking.id,'PUT',{revision:booking.revision,status:'cancelled'});const c=state.clients.find(c=>c.id===booking.client_id);await req('admin/clients/'+c.id,'PUT',{revision:c.revision,action:'archive'});
state=await req('admin/state');await req('admin/schedule','PUT',{...original.schedule,version:state.version});
const cultAfter=await fetch('http://127.0.0.1:4173/api/admin/state').then(r=>r.json());for(const k of ['clients','bookings','incomes','expenses'])assert.deepEqual(cultAfter[k],cultBefore[k],`${k} in CULT must not change`);
assert.ok((await req('availability')).bookings.every(b=>!(b.date===day&&b.time===newTime)));
console.log('Beauty LAB: concurrent booking, idempotency, catalogue duration and server-calculated price, schedule revisions, reschedule, client CRM, income/expense, isolation and cancellation verified. Local QA records archived.');
