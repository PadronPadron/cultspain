import assert from'node:assert/strict';
import{services,slots,today,addDays}from'../public/model.js';
const root='http://127.0.0.1:4173/api/',tag='PRUEBA '+Date.now();
async function req(path,method='GET',body,expected=200){const r=await fetch(root+(path==='availability'||path==='bookings'&&method==='POST'?'':'admin/')+path,{method,headers:body instanceof FormData?{}:{'Content-Type':'application/json'},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data}
let state=await req('state');assert.equal(state.backend,'d1');
const supplier=await req('suppliers','POST',{name:tag+' proveedor',nif:'TEST',email:'test@example.invalid'},201);
const material=await req('materials','POST',{name:tag+' tinte 7/1',brand:'TEST',sku:'TEST-71',unit:'tubo',priceCents:1234,supplierId:supplier.id},201);
const expense=await req('expenses','POST',{date:today(),category:'Materiales',description:tag+' gasto',materialId:material.id,supplierId:supplier.id,quantity:3,unit:'tubo',priceCents:1234,taxCents:777,invoiceNumber:'TEST-001',paymentStatus:'paid',paidDate:today()},201);
state=await req('state');let exp=state.expenses.find(x=>x.id===expense.id);assert.equal(exp.totalCents,4479);
let m=state.materials.find(x=>x.id===material.id);await req('materials/'+m.id,'PUT',{...m,priceCents:2000});
await req('materials/'+m.id,'PUT',{...m,priceCents:3000},409);
state=await req('state');assert.equal(state.expenses.find(x=>x.id===expense.id).priceCents,1234);
await req('expenses/'+exp.id,'PUT',{...exp,priceCents:1300,correctionReason:''},400);
await req('expenses/'+exp.id,'PUT',{...exp,priceCents:1300,correctionReason:'Тест исправления цены'});
state=await req('state');assert.equal(state.expenses.find(x=>x.id===expense.id).totalCents,4677);
const order=await req('orders','POST',{date:today(),supplierId:supplier.id,notes:tag,lines:[{materialId:material.id,quantity:2,priceCents:2000}]},201);
state=await req('state');assert.equal(state.orders.find(x=>x.id===order.id).totalCents,4000);
const pdf=new TextEncoder().encode('%PDF-1.4\n% synthetic QA document\n%%EOF');const form=new FormData();form.set('file',new File([pdf],'test-invoice.pdf',{type:'application/pdf'}));form.set('entityType','expenses');form.set('entityId',expense.id);form.set('kind','invoice_received');form.set('date',today());form.set('number','TEST-001');const document=await req('documents','POST',form,201);const r=await fetch(root+'admin/documents/'+document.id);assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),pdf);
const invalid=new FormData();invalid.set('file',new File(['<script>bad</script>'],'fake.pdf',{type:'application/pdf'}));invalid.set('kind','other');invalid.set('date',today());await req('documents','POST',invalid,400);
const av=await req('availability');assert(!JSON.stringify(av).includes('example.invalid'));assert(!('clients'in av));
let day,time;for(let i=1;i<30;i++){day=addDays(today(),i);time=slots(av,day,services[0])[0];if(time)break}assert(time);
const body={date:day,time,service:services[0].id,firstName:tag,lastName:'Cliente',phone:'000000000',email:'test@example.invalid'};const [a,b]=await Promise.all([fetch(root+'bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),fetch(root+'bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})]);assert.deepEqual([a.status,b.status].sort(),[201,409]);const created=await(a.status===201?a:b).json();await req('bookings/'+created.id,'PUT',{action:'cancel'});
const audit=await req('audit');assert(audit.some(a=>a.entityId===expense.id&&a.action==='update'));
// Archive all test rows, preserving the evidence and original file.
state=await req('state');for(const table of ['expenses','materials','suppliers','clients'])for(const row of state[table].filter(x=>x.id===expense.id||x.id===material.id||x.id===supplier.id||x.firstName===tag))await req(table+'/'+row.id,'PUT',{action:'archive',revision:row.revision,correctionReason:'Автоматическая проверка завершена'});
await req('documents/'+document.id,'PUT',{action:'archive',revision:1,correctionReason:'Prueba terminada'});
const o=state.orders.find(x=>x.id===order.id);await req('orders/'+o.id,'PUT',{action:'archive',revision:o.revision});
console.log('PASS: D1 CRUD, optimistic edits, expense snapshots, explicit tax, correction history, orders, R2 byte fidelity, upload validation, public privacy, concurrent booking exclusion, archive.');
