const utf8=new TextEncoder();
const escapeText=(value:unknown)=>String(value??'').replaceAll('\\','\\\\').replace(/\r\n|\r|\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,');
const stamp=(value:Date)=>value.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function madridInstant(day:string,time:string){
 const target=Date.parse(day+'T'+time+':00Z');let instant=target;
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=Object.fromEntries(format.formatToParts(new Date(instant)).map(p=>[p.type,p.value]));const wall=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);instant+=target-wall;}
 return new Date(instant);
}
export function foldLine(line:string){let output='',current='',length=0;for(const char of line){const size=utf8.encode(char).length;if(length+size>75){output+=current+'\r\n';current=' ';length=1;}current+=char;length+=size;}return output+current;}
export function calendarFeed(bookings:any[],version:number,label:(id:string)=>string){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CULT SPAIN//Agenda//ES','CALSCALE:GREGORIAN','X-WR-CALNAME:CULT SPAIN · Citas','X-WR-TIMEZONE:Europe/Madrid','REFRESH-INTERVAL;VALUE=DURATION:PT15M','X-PUBLISHED-TTL:PT15M'];
 for(const b of bookings){const start=madridInstant(b.date,b.time),end=new Date(start.getTime()+b.duration*60000);const modified=new Date(b.modified||b.createdAt||b.created_at||Date.now());const status=b.status==='cancelled'?'CANCELLED':b.status==='pending'?'TENTATIVE':'CONFIRMED';
  lines.push('BEGIN:VEVENT','UID:'+escapeText(b.id)+'@cultspain.com','DTSTAMP:'+stamp(modified),'LAST-MODIFIED:'+stamp(modified),'SEQUENCE:'+Math.min(2147483647,Math.max(0,version)),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),'SUMMARY:'+escapeText((b.status==='pending'?'Pendiente · ':b.status==='cancelled'?'Cancelada · ':'')+b.name+' · '+label(b.service)),'DESCRIPTION:'+escapeText('Gestiona esta cita en CULT Agenda. Hora del salón: Europe/Madrid.'),'URL:https://cultspain.com/admin-agenda.html#bookings','STATUS:'+status,'TRANSP:'+(b.status==='cancelled'?'TRANSPARENT':'OPAQUE'),'END:VEVENT');
 }
 lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
}
export async function secretHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',utf8.encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
