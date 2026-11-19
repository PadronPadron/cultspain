import ICAL from 'ical.js';

export type BusyBlock = {date:string;time:string;duration:number};
const MAX_BYTES=2_000_000;
export function icloudURL(value:unknown){
 if(typeof value!=='string'||value.length>3000)throw Error('Pega el enlace del calendario de iCloud.');
 let u:URL;try{u=new URL(value.trim().replace(/^webcal:/i,'https:'));}catch{throw Error('Enlace de iCloud no válido.');}
 if(u.protocol!=='https:'||!/^p\d+-(?:caldav|calendars)\.icloud\.com$/.test(u.hostname)||!u.pathname.startsWith('/published/2/')||u.username||u.password||u.port||u.search||u.hash)throw Error('Usa el enlace «Calendario público» de iCloud (webcal://…icloud.com/published/2/…).');
 return u.href;
}
export async function fetchCalendar(url:string,fetcher:typeof fetch=fetch){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  let target=icloudURL(url),r:Response|undefined;
  for(let hop=0;hop<4;hop++){
   r=await fetcher(target,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/calendar'}});
   if(![301,302,303,307,308].includes(r.status))break;
   const location=r.headers.get('location');await r.body?.cancel();
   if(!location||hop===3)throw Error('Demasiadas redirecciones de iCloud.');
   target=icloudURL(new URL(location,target).href);
  }
  if(!r)throw Error('iCloud no responde.');
  if(!r.ok||!r.body)throw Error('iCloud no permite leer este calendario. Comprueba que sigue siendo público.');
  const reader=r.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw Error('El calendario supera el límite de 2 MB.');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder().decode(bytes);
 }finally{clearTimeout(timer);}
}
const format=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function wall(ms:number,formatter=format){const p=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);}
function instant(t:any,fallback:string){
 if(t.zone.tzid!=='floating')return t.toUnixTime()*1000;
 const f=new Intl.DateTimeFormat('en-CA',{timeZone:fallback,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const target=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second);let ms=target;
 for(let i=0;i<4;i++)ms+=target-wall(ms,f);
 return ms;
}
// Expand only the booking horizon plus history for the salon's calendar. Never persist titles or UIDs.
export function calendarBusy(source:string,clock=new Date()):BusyBlock[]{
 if(new TextEncoder().encode(source).length>MAX_BYTES||!source.trim().startsWith('BEGIN:VCALENDAR')||!source.trim().endsWith('END:VCALENDAR'))throw Error('El enlace no contiene un calendario válido.');
 const root=new ICAL.Component(ICAL.parse(source));
 if(root.name!=='vcalendar')throw Error('Formato de calendario no válido.');
 const fallback=String(root.getFirstPropertyValue('x-wr-timezone')||'Europe/Madrid');
 const low=clock.getTime()-31*86400000,high=clock.getTime()+93*86400000;
 const components=root.getAllSubcomponents('vevent');if(components.length>10000)throw Error('Demasiados eventos en el calendario.');
 // Cancelled detached instances may contain only UID + RECURRENCE-ID.
 // ICAL.Event still expects a start when resolving the instance; give it that
 // recurrence date, then discard it by STATUS before producing busy ranges.
 for(const c of components)if(c.hasProperty('recurrence-id')&&String(c.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED'&&!c.hasProperty('dtstart'))c.updatePropertyWithValue('dtstart',c.getFirstPropertyValue('recurrence-id'));
 const exceptions=new Map<string,any[]>();
 for(const c of components)if(c.hasProperty('recurrence-id')){const uid=String(c.getFirstPropertyValue('uid'));exceptions.set(uid,[...(exceptions.get(uid)||[]),c]);}
 const blocks:BusyBlock[]=[];let steps=0;
 function add(event:any,start:any,end:any){
  if(String(event.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')return;
  if(!start||!end)throw Error('Hay un evento sin fecha válida.');
  const zone=String(event.component.getFirstProperty('dtstart')?.getParameter('tzid')||fallback);
  let a:number,b:number;
  if(start.isDate){a=Date.parse(start.toString()+'T00:00:00Z');b=Date.parse(end.toString()+'T00:00:00Z');}
  else{a=wall(instant(start,zone));b=wall(instant(end,String(event.component.getFirstProperty('dtend')?.getParameter('tzid')||zone)));}
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)throw Error('Hay un evento con horas no válidas.');
  if(b===a)b=a+60000; // An event without duration still occupies its minute.
  if(b<=low||a>=high)return;
  a=Math.floor(Math.max(a,low)/60000)*60000;b=Math.ceil(Math.min(b,high)/60000)*60000;
  const d=new Date(a).toISOString();blocks.push({date:d.slice(0,10),time:d.slice(11,16),duration:(b-a)/60000});
  if(blocks.length>5000)throw Error('Demasiados eventos dentro del periodo de reservas.');
 }
 for(const component of components){
  const event=new ICAL.Event(component,{exceptions:component.hasProperty('recurrence-id')?[]:exceptions.get(String(component.getFirstPropertyValue('uid')))||[]});if(event.isRecurrenceException())continue;
  if(String(event.uid||'').endsWith('@cultspain.com'))continue; // Do not re-import our own subscription.
  if(String(component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')continue;
  if(!event.startDate)throw Error('Hay un evento sin fecha de inicio.');
  if(event.isRecurring()){
   const iter=event.iterator();let occurrence;
   while((occurrence=iter.next())){
    if(++steps>30000)throw Error('El calendario tiene demasiadas repeticiones para sincronizarlo.');
    if(Date.UTC(occurrence.year,occurrence.month-1,occurrence.day)>high+2*86400000)break;
    const detail=event.getOccurrenceDetails(occurrence);add(detail.item,detail.startDate,detail.endDate);
   }
   // Detached exceptions can be moved into our horizon from outside the expanded range.
   for(const c of exceptions.get(String(event.uid))||[]){const e=new ICAL.Event(c);add(e,e.startDate,e.endDate);}
  }else add(event,event.startDate,event.endDate);
 }
 // Stand-alone detached exceptions are valid in some exported calendars.
 const masters=new Set(components.filter(c=>!c.hasProperty('recurrence-id')).map(c=>c.getFirstPropertyValue('uid')));
 for(const c of components)if(c.hasProperty('recurrence-id')&&!masters.has(c.getFirstPropertyValue('uid'))&&!String(c.getFirstPropertyValue('uid')).endsWith('@cultspain.com')){const e=new ICAL.Event(c);add(e,e.startDate,e.endDate);}
 return [...new Map(blocks.map(b=>[`${b.date}|${b.time}|${b.duration}`,b])).values()].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
