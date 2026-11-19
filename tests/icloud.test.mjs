import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarBusy,icloudURL,fetchCalendar} from '../lib/icloud-core.ts';
import {initial,slots,adminSlots} from '../public/model.js';
const clock=new Date('2026-11-19T12:00:00Z');
const feed=(...events)=>'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+events.join('\r\n')+'\r\nEND:VCALENDAR';
const event=(body)=>'BEGIN:VEVENT\r\n'+body.split('\n').join('\r\n')+'\r\nEND:VEVENT';
test('iCloud existing timed, all-day and floating events use Lugo time, redact personal information',()=>{
 const blocks=calendarBusy(feed(event('UID:one\nDTSTART:20261120T090000Z\nDTEND:20261120T100000Z\nSUMMARY:Doctor private\nLOCATION:Hospital'),event('UID:two\nDTSTART;VALUE=DATE:20261121\nDTEND;VALUE=DATE:20261123'),event('UID:three\nDTSTART:20261124T110000\nDTEND:20261124T113000\nTRANSP:TRANSPARENT')),clock);
 assert.deepEqual(blocks,[{date:'2026-11-20',time:'10:00',duration:60},{date:'2026-11-21',time:'00:00',duration:2880},{date:'2026-11-24',time:'11:00',duration:30}]);assert(!JSON.stringify(blocks).includes('Doctor'));
});
test('weekly repeat handles EXDATE, moved and cancelled occurrences without blocking old time',()=>{
 const blocks=calendarBusy(feed(event('UID:repeat\nDTSTART:20261120T090000Z\nDTEND:20261120T100000Z\nRRULE:FREQ=WEEKLY;COUNT=4\nEXDATE:20261127T090000Z'),event('UID:repeat\nRECURRENCE-ID:20261204T090000Z\nDTSTART:20261204T140000Z\nDTEND:20261204T150000Z'),event('UID:repeat\nRECURRENCE-ID:20261211T090000Z\nSTATUS:CANCELLED')),clock);
 assert.deepEqual(blocks,[{date:'2026-11-20',time:'10:00',duration:60},{date:'2026-12-04',time:'15:00',duration:60}]);
});
test('timezone DST, exclusive all-day end and overnight ranges',()=>{
 const b=calendarBusy(feed(event('UID:dst\nDTSTART;TZID=America/New_York:20261030T100000\nDTEND;TZID=America/New_York:20261030T110000\nRRULE:FREQ=WEEKLY;COUNT=2'),event('UID:night\nDTSTART:20261120T223000Z\nDTEND:20261121T010000Z')),new Date('2026-10-25T00:00:00Z'));
 assert.deepEqual(b,[{date:'2026-10-30',time:'15:00',duration:60},{date:'2026-11-06',time:'16:00',duration:60},{date:'2026-11-20',time:'23:30',duration:150}]);
});
test('calendar deletion produces no busy blocks; cancelled and own salon UIDs do not loop',()=>{
 assert.deepEqual(calendarBusy(feed(),clock),[]);
 assert.deepEqual(calendarBusy(feed(event('UID:abc@cultspain.com\nDTSTART:20261120T090000Z\nDTEND:20261120T100000Z'),event('UID:cancelled\nSTATUS:CANCELLED\nDTSTART:20261120T090000Z\nDTEND:20261120T100000Z')),clock),[]);
 assert.throws(()=>calendarBusy('<html>Error</html>',clock));
});
test('external ranges block public and owner slots with exact event boundaries including multi-day blocks',()=>{
 const state={...initial(),week:Array.from({length:7},()=>({open:true,start:'09:00',end:'19:00',breakStart:'',breakEnd:''})),busy:[{date:'2026-11-20',time:'10:00',duration:60,external:true}]};
 const publicSlots=slots(state,'2026-11-20',{duration:60},clock,0);
 assert(publicSlots.includes('09:00'));assert(!publicSlots.includes('09:15'));assert(!publicSlots.includes('10:00'));assert(publicSlots.includes('11:00'));
 const owner=adminSlots(state,'2026-11-20',60,{id:'x',date:'2026-11-20',time:'10:00'},clock);assert(!owner.includes('10:00'));assert(owner.includes('11:00'));
 state.busy=[{date:'2026-11-19',time:'00:00',duration:3*1440,external:true}];assert.deepEqual(slots(state,'2026-11-20',{duration:60},clock),[]);
});
test('iCloud URL validation and downloading reject arbitrary hosts, redirects, oversized responses',async()=>{
 assert.equal(icloudURL('webcal://p01-calendars.icloud.com/published/2/secret'),'https://p01-calendars.icloud.com/published/2/secret');
 for(const url of ['https://evil.test/published/2/x','https://p01-calendars.icloud.com.evil.test/published/2/x','https://user:pass@p01-calendars.icloud.com/published/2/x','http://p01-calendars.icloud.com/published/2/x','https://p01-calendars.icloud.com:8080/published/2/x'])assert.throws(()=>icloudURL(url));
 assert.equal(icloudURL('webcal://p107-caldav.icloud.com/published/2/test'),'https://p107-caldav.icloud.com/published/2/test');
 const url='https://p01-calendars.icloud.com/published/2/x';
 assert.equal(await fetchCalendar(url,async(u,options)=>{assert.equal(options.redirect,'manual');return new Response(feed());}),feed());
 await assert.rejects(fetchCalendar(url,async()=>new Response('x'.repeat(2_000_001))));
 await assert.rejects(fetchCalendar(url,async()=>new Response('no',{status:404})));
 await assert.rejects(fetchCalendar(url,async()=>new Response(null,{status:302,headers:{Location:'https://evil.test/calendar'}})));
 let calls=0;assert.equal(await fetchCalendar(url,async()=>++calls===1?new Response(null,{status:302,headers:{Location:'https://p02-caldav.icloud.com/published/2/new'}}):new Response(feed())),feed());
});
