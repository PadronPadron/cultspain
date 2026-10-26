export const KEY='cult-spain-demo-v1';
export const services=[{id:'cut',name:'Corte & estilo',duration:60,price:45},{id:'color',name:'Color & matices',duration:120,price:85},{id:'style',name:'Peinado',duration:45,price:30}];
export const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function addDays(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export const min=t=>Number(t.split(':')[0])*60+Number(t.split(':')[1]);
export const time=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export function initial(){return {version:1,week:Array.from({length:7},(_,i)=>({open:i!==0,start:'10:00',end:'19:00',breakStart:'14:00',breakEnd:'15:00'})),exceptions:{},bookings:[],expenses:[]}}
export function load(){try{const x=JSON.parse(localStorage.getItem(KEY));return x?.version===1?x:initial()}catch{return initial()}}
export const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
export function intervals(s,date){const c=s.exceptions[date]??s.week[new Date(date+'T12:00:00Z').getUTCDay()];if(!c.open)return [];const start=min(c.start),end=min(c.end);if(c.breakStart&&c.breakEnd)return [[start,min(c.breakStart)],[min(c.breakEnd),end]].filter(([a,b])=>b>a);return [[start,end]]}
export const overlaps=(a,b,c,d)=>a<d&&c<b;
export function slots(s,date,service,clock=new Date()){
 const nowDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(clock);
 if(date<nowDate||date>addDays(nowDate,90))return [];
 const nowTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(clock);
 const busy=s.bookings.filter(b=>b.date===date&&b.status!=='cancelled');const out=[];
 for(const [start,end] of intervals(s,date))for(let t=start;t+service.duration+15<=end;t+=15){
 if(date===nowDate&&t<min(nowTime)+60)continue;
 if(!busy.some(b=>overlaps(t,t+service.duration+15,min(b.time),min(b.time)+b.duration+15)))out.push(time(t));}
 return out;
}
export function conflicts(s){return s.bookings.filter(b=>b.status!=='cancelled'&&b.date>=today()&&!intervals(s,b.date).some(([a,z])=>min(b.time)>=a&&min(b.time)+b.duration+15<=z))}
export function validHours(c){if(!c.open)return true;if(!c.start||!c.end||min(c.start)>=min(c.end))return false;if(c.breakStart||c.breakEnd)return !!c.breakStart&&!!c.breakEnd&&min(c.breakStart)>=min(c.start)&&min(c.breakEnd)<=min(c.end)&&min(c.breakStart)<min(c.breakEnd);return true}
export function addBooking(s,b,clock=new Date()){const service=services.find(x=>x.id===b.service);if(!service||!slots(s,b.date,service,clock).includes(b.time))throw Error('Este horario ya no está disponible. Elige otro.');const record={...b,id:crypto.randomUUID(),duration:service.duration,price:service.price,status:'confirmed',paid:0,createdAt:new Date().toISOString()};s.bookings.push(record);return record}
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
