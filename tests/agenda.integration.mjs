import assert from 'node:assert/strict';
import {bookingServices,slots,today,addDays} from '../public/model.js';
const root='http://127.0.0.1:4173/api/',created=[];
async function call(path,method='GET',body,status=200){const r=await fetch(root+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
let original;
try{
 original=await call('admin/agenda');assert(Array.isArray(original.clients));assert(!('expenses' in original));
 const service=bookingServices[0];let day,time;
 for(let n=2;n<30;n++){day=addDays(today(),n);time=slots(original,day,{duration:45})[0];if(time)break}
 const body={firstName:'PRUEBA PWA '+Date.now(),phone:'+34000000000',service:service.id,duration:45,date:day,time,status:'pending'};
 const b=await call('admin/bookings','POST',body,201);created.push(b.id);await call('admin/bookings','POST',body,409);
 await call('admin/bookings/'+b.id,'PUT',{action:'confirm',expectedStatus:'pending',expectedDate:day,expectedTime:time,expectedDuration:45});
 await call('admin/bookings/'+b.id,'PUT',{action:'reschedule',date:day,time,duration:30,service:bookingServices[1].id,expectedService:service.id,expectedDuration:45,expectedDate:day,expectedTime:time,expectedStatus:'confirmed'});
 await call('admin/bookings/'+b.id,'PUT',{action:'reschedule',date:day,time,duration:30,service:service.id,expectedService:service.id,expectedDate:day,expectedTime:time},409);
 let s=await call('admin/agenda'),row=s.bookings.find(x=>x.id===b.id);assert.equal(row.service,bookingServices[1].id);assert.equal(row.duration,30);
 await call('admin/bookings/'+b.id,'PUT',{action:'cancel'});assert(slots(await call('availability'),day,{duration:45}).includes(time));
 const week=structuredClone(original.week);week[6]={open:true,start:'10:00',end:'14:00',breakStart:'',breakEnd:''};await call('admin/schedule','PUT',{week,exceptions:original.exceptions});assert.equal((await call('availability')).week[6].breakStart,'');
 const rejected=await fetch(root+'admin/bookings',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://other.invalid'},body:JSON.stringify(body)});assert.equal(rejected.status,403);
 console.log('PASS local D1 API: create, conflict, confirm, service/duration edit, stale rejection, cancellation, continuous hours and cross-origin rejection.');
}finally{
 const s=await call('admin/agenda');for(const id of created){const row=s.bookings.find(b=>b.id===id);if(row&&['pending','confirmed'].includes(row.status))await call('admin/bookings/'+id,'PUT',{action:'cancel'});const client=s.clients.find(c=>c.id===row?.clientId);if(client&&!client.archived)await call('admin/clients/'+client.id,'PUT',{action:'archive',revision:client.revision});}
 if(original)await call('admin/schedule','PUT',{week:original.week,exceptions:original.exceptions});
}
