import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {services,slots,today,addDays} from '../public/model.js';
const base='http://127.0.0.1:4173/api/',tag='PRUEBA-INGRESOS-'+Date.now(),created={incomes:[],clients:[],expenses:[],bookings:[],documents:[]};
async function request(path,method='GET',body,status=200){const form=body instanceof FormData,r=await fetch(base+path,{method,headers:form?{}:{'Content-Type':'application/json'},body:body?form?body:JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data}
const state=()=>request('admin/state');
const getIncome=async key=>(await state()).incomes.find(x=>x.id===key);
const receipt=(extra={})=>({date:today(),category:'Servicios',description:tag,amountCents:1234,paymentMethod:'cash',documentNumber:'QA-ING-001',notes:'Solo prueba local',...extra});
try{
 const client=await request('admin/clients','POST',{firstName:tag,lastName:'Local'},201);created.clients.push(client.id);
 const manual=await request('admin/incomes','POST',receipt({clientId:client.id}),201);created.incomes.push(manual.id);
 let row=await getIncome(manual.id);assert.equal(row.amountCents,1234);assert.equal(row.clientId,client.id);assert.equal(row.bookingId,null);
 await request('admin/incomes','POST',receipt({amountCents:0}),400);await request('admin/incomes','POST',receipt({amountCents:1.5}),400);await request('admin/incomes','POST',receipt({paymentMethod:'invalid'}),400);await request('admin/incomes','POST',receipt({date:'2026-02-31'}),400);await request('admin/incomes','POST',receipt({clientId:'nonexistent'}),400);
 await request('admin/incomes/'+manual.id,'PUT',receipt({...row,amountCents:2345,correctionReason:'Corregir importe'}));
 await request('admin/incomes/'+manual.id,'PUT',receipt({...row,amountCents:9999,correctionReason:'Versión obsoleta'}),409);
 row=await getIncome(manual.id);assert.equal(row.amountCents,2345);
 await request('admin/incomes/'+manual.id,'PUT',{action:'archive',revision:row.revision,correctionReason:''},400);
 await request('admin/incomes/'+manual.id,'PUT',{action:'archive',revision:row.revision,correctionReason:'Prueba de archivo'});
 row=await getIncome(manual.id);assert.equal(row.archived,1);
 await request('admin/incomes/'+manual.id,'PUT',{action:'restore',revision:row.revision,correctionReason:'Prueba de restauración'});
 row=await getIncome(manual.id);assert.equal(row.archived,0);
 const upload=new FormData();upload.set('file',new File(['%PDF-1.7\nQA ingreso\n%%EOF'],'qa-ingreso.pdf',{type:'application/pdf'}));upload.set('entityType','incomes');upload.set('entityId',manual.id);upload.set('kind','receipt');upload.set('date',today());
 const doc=await request('admin/documents','POST',upload,201);created.documents.push(doc.id);assert((await state()).documents.some(d=>d.id===doc.id&&d.entityType==='incomes'&&d.entityId===manual.id));
 const download=await fetch(base+'admin/documents/'+doc.id);assert.equal(await download.text(),'%PDF-1.7\nQA ingreso\n%%EOF');
 const service=services.find(s=>s.id==='mens-cut-beard');let spot;
 for(let n=2;n<25&&!spot;n++){const d=addDays(today(),n),free=slots(await request('availability'),d,service);if(free.length)spot={date:d,time:free[0]}}
 assert(spot);const booking=await request('bookings','POST',{...spot,service:service.id,firstName:tag,lastName:'Cita',phone:'000000000'},201);created.bookings.push(booking.id);
 let b=(await state()).bookings.find(x=>x.id===booking.id);created.clients.push(b.clientId);
 await request('admin/bookings/'+b.id,'PUT',{action:'confirm'});await request('admin/bookings/'+b.id,'PUT',{action:'complete'});await request('admin/bookings/'+b.id,'PUT',{action:'pay',paidCents:4500,date:today()});
 let receipts=(await state()).incomes.filter(x=>x.bookingId===b.id);assert.equal(receipts.length,1);row=receipts[0];created.incomes.push(row.id);assert.equal(row.amountCents,4500);
 await request('admin/incomes','POST',receipt({bookingId:b.id}),409);await request('admin/bookings/'+b.id,'PUT',{action:'pay',paidCents:4500,date:today()},409);
 await request('admin/incomes/'+row.id,'PUT',{...row,amountCents:5000,correctionReason:'Importe real corregido'});
 row=await getIncome(row.id);b=(await state()).bookings.find(x=>x.id===b.id);assert.equal(b.paid,50);assert.equal(row.amountCents,5000);
 await request('admin/incomes/'+row.id,'PUT',{...row,bookingId:manual.id,correctionReason:'Cambiar vínculo'},400);
 await request('admin/incomes/'+row.id,'PUT',{action:'archive',revision:row.revision,correctionReason:'Archivo local'});
 b=(await state()).bookings.find(x=>x.id===b.id);assert.equal(b.paid,0);
 await request('admin/bookings/'+b.id,'PUT',{action:'pay',paidCents:4500,date:today()},409);
 row=await getIncome(row.id);await request('admin/incomes/'+row.id,'PUT',{action:'restore',revision:row.revision,correctionReason:'Restaurar local'});
 b=(await state()).bookings.find(x=>x.id===b.id);assert.equal(b.paid,50);assert.equal((await state()).incomes.filter(x=>x.bookingId===b.id).length,1);
 // Adding from Finance also synchronizes an unpaid completed appointment.
 const s=await state();let spot2;for(let n=3;n<25&&!spot2;n++){const d=addDays(today(),n),free=slots(s,d,service);if(free.length)spot2={date:d,time:free[0]}}
 const second=await request('bookings','POST',{...spot2,service:service.id,firstName:tag,lastName:'Cita 2',phone:'000000000'},201);created.bookings.push(second.id);
 const secondRow=(await state()).bookings.find(x=>x.id===second.id);created.clients.push(secondRow.clientId);
 await request('admin/bookings/'+second.id,'PUT',{action:'confirm'});await request('admin/bookings/'+second.id,'PUT',{action:'complete'});
 const linked=await request('admin/incomes','POST',receipt({bookingId:second.id,amountCents:6600}),201);created.incomes.push(linked.id);
 assert.equal((await state()).bookings.find(x=>x.id===second.id).paid,66);assert.equal((await getIncome(linked.id)).clientId,secondRow.clientId);
 const audit=await request('admin/audit');assert(audit.some(x=>x.entityType==='incomes'&&x.entityId===manual.id&&x.action==='update'));assert(audit.some(x=>x.entityId===manual.id&&x.action==='restore'));
 console.log('PASS: manual income create/edit, amount/date/method/client validation, stale write rejection, archive/restore audit, original receipt upload/download, single appointment receipt, synchronized corrections, archive and restore, both entry points.');
}finally{
 const s=await state();for(const row of s.incomes.filter(x=>created.incomes.includes(x.id)&&!x.archived))await request('admin/incomes/'+row.id,'PUT',{action:'archive',revision:row.revision,correctionReason:'Fin de prueba local'});
 for(const row of s.documents.filter(x=>created.documents.includes(x.id)&&!x.archived))await request('admin/documents/'+row.id,'PUT',{action:'archive',revision:row.revision,correctionReason:'Fin de prueba local'});
 // Completed synthetic appointments must not keep blocking future local slots.
 for(const key of created.bookings){assert.match(key,/^[a-f0-9-]{36}$/);const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','.sites-runtime/wrangler-local.json','--persist-to','.wrangler/state','--command',`UPDATE bookings SET status='cancelled' WHERE id='${key}' AND paid_cents=0; DELETE FROM booking_minutes WHERE booking_id='${key}' AND EXISTS(SELECT 1 FROM bookings WHERE id='${key}' AND status='cancelled');`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 for(const row of s.clients.filter(x=>created.clients.includes(x.id)&&!x.archived))await request('admin/clients/'+row.id,'PUT',{action:'archive',revision:row.revision});
}
