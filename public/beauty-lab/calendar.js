export const zone = 'Europe/Madrid';
export const dayAt = (clock = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit'}).format(clock);
export const minute = value => Number(value.slice(0,2)) * 60 + Number(value.slice(3));
export const timeAt = value => `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`;
export const addDays = (value, days) => { const d = new Date(value+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); };
export const services = [
 {id:'extension',name:'Extensión de uñas',duration:120,priceCents:4000},
 {id:'manicura',name:'Manicura rusa · uñas cortas',duration:70,priceCents:2700},
 {id:'manicura-media',name:'Manicura rusa · uñas medianas',duration:90,priceCents:2700},
 {id:'manicura-larga',name:'Manicura rusa · uñas naturales largas',duration:90,priceCents:3000},
 {id:'pedicura',name:'Pedicura',duration:70,priceCents:3500},
 {id:'higienica',name:'Manicura higiénica sin esmaltado',duration:40,priceCents:1800,design:false},
 {id:'retirada',name:'Retirada de esmaltado',duration:15,priceCents:800,design:false}
];
export const defaultSchedule = () => ({enabled:true, durations:Object.fromEntries(services.map(s=>[s.id,s.duration])), prices:Object.fromEntries(services.map(s=>[s.id,s.priceCents])), designMinutes:15, designPriceCents:400, week:Array.from({length:7},(_,i)=>({open:i!==0,start:'10:00',end:'19:00',breakStart:'14:00',breakEnd:'15:00'})), exceptions:{}});
export function appointment(schedule,serviceId,design=false) {
 const service=services.find(s=>s.id===serviceId);if(!service)throw Error('Selecciona un servicio.');
 const extra=design&&service.design!==false;
 const price=schedule.prices[serviceId];
 return {duration:schedule.durations[serviceId]+(extra?schedule.designMinutes:0),priceCents:price===null?null:price+(extra?schedule.designPriceCents:0),label:service.name+(extra?' + diseño':''),design:extra};
}
export const priceLabel = cents => cents===null?'Precio por confirmar':new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(cents/100);
export function validHours(hours) {
  if (!hours || typeof hours.open !== 'boolean') return false;
  if (!hours.open) return true;
  const valid = v => typeof v==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if (!valid(hours.start) || !valid(hours.end) || minute(hours.start)>=minute(hours.end)) return false;
  if (hours.breakStart || hours.breakEnd) return valid(hours.breakStart)&&valid(hours.breakEnd)&&minute(hours.breakStart)>=minute(hours.start)&&minute(hours.breakEnd)<=minute(hours.end)&&minute(hours.breakStart)<minute(hours.breakEnd);
  return true;
}
export function intervals(schedule, date) {
  const h=schedule.exceptions[date] ?? schedule.week[new Date(date+'T12:00:00Z').getUTCDay()];
  if (!h?.open) return [];
  return h.breakStart ? [[minute(h.start),minute(h.breakStart)],[minute(h.breakEnd),minute(h.end)]] : [[minute(h.start),minute(h.end)]];
}
export function availableSlots(schedule, bookings, date, clock=new Date(), duration=schedule.durations.manicura) {
  const today=dayAt(clock);
  if (!schedule.enabled || date<today || date>addDays(today,90)) return [];
  const current=minute(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(clock));
  const busy=bookings.filter(b=>b.date===date&&b.status!=='cancelled');
  const result=[];
  for (const [start,end] of intervals(schedule,date)) for(let m=start;m+duration<=end;m+=15) {
    if (date===today&&m<current+60) continue;
    if (!busy.some(b=>m<minute(b.time)+b.duration&&minute(b.time)<m+duration)) result.push(timeAt(m));
  }
  return result;
}
