import{test}from'node:test';import assert from'node:assert/strict';import{initial,services,bookingServices,slots,adminSlots,bookingEnd,addBooking,validHours,conflicts,today,addDays}from'../public/model.js';
const now=new Date('2026-10-26T07:00:00Z');
test('service and buffer fit work intervals and never overlap breaks',()=>{const s=initial();const a=slots(s,'2026-10-26',services[0],now);assert(a.includes('10:00'));assert(a.includes('12:45'));assert(!a.includes('13:00'));assert(!a.includes('14:00'));assert(a.includes('17:45'));assert(!a.includes('18:00'))});
test('booking blocks overlaps, rejects duplicates and cancellation releases slot',()=>{const s=initial();const b=addBooking(s,{date:'2026-10-26',time:'10:00',service:'menu-women',name:'Test',phone:'000000'},now);assert(!slots(s,b.date,services[0],now).includes('11:00'));assert(slots(s,b.date,services[0],now).includes('11:15'));assert.throws(()=>addBooking(s,{...b},now));b.status='cancelled';assert(slots(s,b.date,services[0],now).includes('10:00'))});
test('date exceptions override closed weekdays and regular schedules',()=>{const s=initial();assert.equal(slots(s,'2026-11-01',services[0],now).length,0);s.exceptions['2026-11-01']={open:true,start:'11:00',end:'13:00'};assert(slots(s,'2026-11-01',services[0],now).includes('11:00'));s.exceptions['2026-10-26']={open:false};assert.equal(slots(s,'2026-10-26',services[0],now).length,0);delete s.exceptions['2026-10-26'];assert(slots(s,'2026-10-26',services[0],now).length>0)});
test('past dates and horizon are enforced',()=>{const s=initial();assert.equal(slots(s,'2026-10-25',services[0],now).length,0);assert.equal(slots(s,'2027-03-01',services[0],now).length,0)});
test('invalid work hours are rejected',()=>{assert(!validHours({open:true,start:'15:00',end:'14:00'}));assert(!validHours({open:true,start:'10:00',end:'19:00',breakStart:'09:00',breakEnd:'11:00'}));assert(validHours({open:false}));assert(validHours({open:true,start:'10:00',end:'19:00',breakStart:'',breakEnd:''}))});
test('schedule conflicts preserve existing appointments including buffer',()=>{const s=initial(),d=addDays(today(),1);s.bookings=[{date:d,time:'10:00',duration:60,status:'confirmed'}];s.exceptions[d]={open:true,start:'10:00',end:'11:00'};assert.equal(conflicts(s).length,1);s.exceptions[d].end='11:15';assert.equal(conflicts(s).length,0)});

test('catalogue has no prices and uses the scheduled service durations',()=>{for(const s of services){assert(!Object.hasOwn(s,'price'));assert(s.duration>0)}assert.equal(services.find(s=>s.id==='cut').duration,60);assert.equal(services.find(s=>s.id==='mens-cut').duration,30);assert.equal(services.find(s=>s.id==='mens-cut-beard').duration,45);assert.equal(services.find(s=>s.id==='beard').duration,30);assert.equal(services.find(s=>s.id==='keratin').consultation,true);assert.equal(services.find(s=>s.id==='straightening').consultation,true)});
test('retired services keep historical labels but cannot be booked',()=>{assert.equal(services.find(s=>s.id==='keratin').name,'Tratamiento de queratina');assert.throws(()=>addBooking(initial(),{date:'2026-10-26',time:'10:00',service:'keratin'},now));assert.equal(bookingServices.length,20);assert.deepEqual([...new Set(bookingServices.map(s=>s.group))],['cuts','styling','color']);for(const service of bookingServices){const b=addBooking(initial(),{date:'2026-10-26',time:'10:00',service:service.id},now);assert.equal(b.price,null);assert.equal(b.duration,service.duration)}});


test('an owner can edit the duration of a started appointment with minute precision',()=>{
 const s=initial(),row={id:'start',date:'2026-10-26',time:'10:00',duration:60,status:'confirmed'};
 s.bookings=[row];
 const afterStart=new Date('2026-10-26T11:00:00Z');
 assert(adminSlots(s,row.date,1,row,afterStart).includes(row.time));
 assert(adminSlots(s,row.date,2000,row,afterStart).includes(row.time));
 assert.equal(bookingEnd(row.date,row.time,2000).toISOString(),'2026-10-27T19:20:00.000Z');
 assert.deepEqual(adminSlots(s,row.date,1.5,row,afterStart),[]);
});

test('an appointment extending into the next day blocks public and admin starts',()=>{
 const s=initial(),row={id:'long',date:'2026-10-26',time:'10:00',duration:2000,status:'confirmed'};
 const next='2026-10-27',service=services.find(x=>x.id==='mens-cut');
 s.bookings=[row];
 assert.deepEqual(slots(s,next,service,now),[]);
 assert(!adminSlots(s,next,1,{id:'other',date:next,time:'10:00'},now).includes('10:00'));
 assert(slots(s,'2026-10-28',service,now).includes('10:00'));
 row.status='cancelled';
 assert(slots(s,next,service,now).includes('10:00'));
});
