export const KEY='cult-spain-demo-v1';
export const serviceGroups=[
 {id:'cuts',name:'Cortes',description:'Cortes de mujer, hombre e infantiles. Flequillo y acabado con peinado.'},
 {id:'styling',name:'Peinados',description:'Lavado y peinado según la longitud. Ondas o rizos.'},
 {id:'color',name:'Coloración',description:'La técnica y el consumo de producto dependen de la longitud, densidad, tipo y estado del cabello.'}
];
// Working booking durations. Consultations reserve the assessment, not the full treatment.
const historicalServices=[
 {id:'cut',group:'mujer',name:'Corte de mujer',duration:60,description:'Corte, forma y acabado adaptados a tu estilo.'},
 {id:'style',group:'mujer',name:'Peinado y brushing',duration:60,estimated:true,description:'Secado, movimiento y acabado para tu día a día.'},
 {id:'updo',group:'mujer',name:'Recogidos y peinados especiales',duration:90,estimated:true,description:'Un peinado pensado para tu ocasión.'},
 {id:'mens-cut',group:'hombre',name:'Corte de hombre',duration:30,description:'Corte y acabado con atención a cada detalle.'},
 {id:'beard',group:'hombre',name:'Diseño y arreglo de barba',duration:30,estimated:true,description:'Forma, perfilado y cuidado de la barba.'},
 {id:'mens-cut-beard',group:'hombre',name:'Corte + barba',duration:45,description:'Corte de pelo y arreglo de barba en una sola cita.'},
 {id:'color',group:'color',name:'Coloración y retoque de raíz',duration:120,estimated:true,description:'Color global o mantenimiento de tu raíz.'},
 {id:'highlights',group:'color',name:'Mechas',duration:180,estimated:true,description:'Luz y dimensión con una técnica elegida para tu cabello.'},
 {id:'balayage',group:'color',name:'Balayage',duration:180,estimated:true,description:'Un trabajo de color con transiciones y profundidad.'},
 {id:'toner',group:'color',name:'Matiz y gloss',duration:60,estimated:true,description:'Ajuste del tono y acabado del color.'},
 {id:'color-correction',group:'color',name:'Corrección de color',duration:30,consultation:true,description:'Valoración previa para planificar el cambio y la duración del trabajo.'},
 {id:'hydration',group:'care',name:'Hidratación y nutrición',duration:60,estimated:true,description:'Un cuidado adaptado al estado y las necesidades de tu cabello.'},
 {id:'reconstruction',group:'care',name:'Reconstrucción capilar',duration:90,estimated:true,description:'Valoramos tu cabello y elegimos un protocolo de cuidado.'},
 {id:'keratin',group:'care',name:'Tratamiento de queratina',duration:30,consultation:true,description:'Consulta previa para elegir el tratamiento y reservar el tiempo adecuado.'},
 {id:'straightening',group:'care',name:'Alisado químico',duration:30,consultation:true,description:'Valoración previa del cabello antes de planificar el servicio.'},
 {id:'scalp-massage',group:'care',name:'Masaje del cuero cabelludo',duration:30,estimated:true,description:'Un momento de pausa y cuidado en el salón.'},
 {id:'aroma-ritual',group:'care',name:'Aromaterapia y masaje capilar',duration:60,estimated:true,description:'Un ritual de cuidado con aromas y masaje del cuero cabelludo.'}
];
export const bookingServices=[
 {
  "id": "menu-mens",
  "group": "cuts",
  "name": "Corte de hombre",
  "duration": 60,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-child",
  "group": "cuts",
  "name": "Corte infantil",
  "duration": 60,
  "estimated": true,
  "description": "Hasta 12 años."
 },
 {
  "id": "menu-women",
  "group": "cuts",
  "name": "Lavado + corte de mujer",
  "duration": 60,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-fringe",
  "group": "cuts",
  "name": "Flequillo",
  "duration": 30,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-women-style-short",
  "group": "cuts",
  "name": "Lavado + corte de mujer + peinado · Corto",
  "duration": 60,
  "estimated": true,
  "description": "Hasta el mentón."
 },
 {
  "id": "menu-women-style-medium",
  "group": "cuts",
  "name": "Lavado + corte de mujer + peinado · Medio",
  "duration": 60,
  "estimated": true,
  "description": "Hasta los hombros."
 },
 {
  "id": "menu-women-style-long",
  "group": "cuts",
  "name": "Lavado + corte de mujer + peinado · Largo",
  "duration": 60,
  "estimated": true,
  "description": "Por debajo de los hombros."
 },
 {
  "id": "menu-style-short",
  "group": "styling",
  "name": "Lavado + peinado · Corto",
  "duration": 60,
  "estimated": true,
  "description": "Hasta el mentón."
 },
 {
  "id": "menu-style-medium",
  "group": "styling",
  "name": "Lavado + peinado · Medio",
  "duration": 60,
  "estimated": true,
  "description": "Hasta los hombros."
 },
 {
  "id": "menu-style-long",
  "group": "styling",
  "name": "Lavado + peinado · Largo",
  "duration": 60,
  "estimated": true,
  "description": "Por debajo de los hombros."
 },
 {
  "id": "menu-waves",
  "group": "styling",
  "name": "Lavado + ondas o rizos",
  "duration": 60,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-roots-40",
  "group": "color",
  "name": "Color de raíz · Hasta 40 g",
  "duration": 120,
  "estimated": true,
  "description": "Hasta 40 g de color."
 },
 {
  "id": "menu-roots-plus",
  "group": "color",
  "name": "Color de raíz · Más de 40 g",
  "duration": 120,
  "estimated": true,
  "description": "Más de 40 g de color."
 },
 {
  "id": "menu-full-color",
  "group": "color",
  "name": "Color de raíz y largos",
  "duration": 120,
  "estimated": true,
  "description": "Un solo tono."
 },
 {
  "id": "menu-toner",
  "group": "color",
  "name": "Matiz / tonalización",
  "duration": 60,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-partial-highlights",
  "group": "color",
  "name": "Mechas localizadas",
  "duration": 180,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-highlights",
  "group": "color",
  "name": "Mechas",
  "duration": 180,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-complex-color",
  "group": "color",
  "name": "Coloración compleja",
  "duration": 180,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-airtouch",
  "group": "color",
  "name": "AirTouch",
  "duration": 180,
  "estimated": true,
  "description": ""
 },
 {
  "id": "menu-contouring",
  "group": "color",
  "name": "Contouring · Técnica AirTouch",
  "duration": 180,
  "estimated": true,
  "description": ""
 }
];
export const services=[...bookingServices,...historicalServices];
export const serviceLabel=s=>s.name+(s.consultation?' · consulta previa':'');
export const serviceTiming=s=>s.consultation?`Consulta previa · ${s.duration} min`:`${s.duration} min${s.estimated?' aprox.':''}`;
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
export const calendarMinute=(date,at='00:00')=>Date.parse(`${date}T${at}:00Z`)/60000;
export const bookingEnd=(date,at,duration)=>new Date((calendarMinute(date,at)+duration)*60000);
export const validBookingDuration=duration=>Number.isSafeInteger(duration)&&duration>=1;
const bookingBuffer=15;
const busyRanges=bookings=>bookings.filter(b=>b.status!=='cancelled').map(b=>{
 const start=calendarMinute(b.date,b.time);
 return [start,start+b.duration+bookingBuffer];
});
const isFree=(busy,start,duration)=>!busy.some(([a,b])=>overlaps(start,start+duration+bookingBuffer,a,b));
function calendarClock(clock){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(clock);
 const at=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(clock);
 return {date,minute:min(at)};
}
export function slots(s,date,service,clock=new Date(),leadMinutes=60){
 const current=calendarClock(clock);
 if(date<current.date||date>addDays(current.date,90))return [];
 const busy=busyRanges(s.bookings),midnight=calendarMinute(date),out=[];
 for(const [start,end] of intervals(s,date))for(let t=start;t+service.duration+bookingBuffer<=end;t+=15){
  if(date===current.date&&t<current.minute+leadMinutes)continue;
  if(isFree(busy,midnight+t,service.duration))out.push(time(t));
 }
 return out;
}
export function adminSlots(s,date,duration,original,clock=new Date()){
 if(!validBookingDuration(duration)||!date)return [];
 const current=calendarClock(clock),starts=new Set();
 if(date>=current.date&&date<=addDays(current.date,90)){
  for(const [start,end] of intervals(s,date))for(let t=start;t<end;t+=15){
   if(date!==current.date||t>=current.minute)starts.add(time(t));
  }
 }
 // The owner can edit a booking's duration after it has started.
 if(date===original.date)starts.add(original.time);
 const busy=busyRanges(s.bookings.filter(b=>b.id!==original.id));
 return [...starts].sort().filter(at=>Number.isFinite(bookingEnd(date,at,duration).getTime())&&isFree(busy,calendarMinute(date,at),duration));
}
export function conflicts(s){return s.bookings.filter(b=>b.status!=='cancelled'&&b.date>=today()&&!intervals(s,b.date).some(([a,z])=>min(b.time)>=a&&min(b.time)+b.duration+15<=z))}
export function validHours(c){if(!c.open)return true;if(!c.start||!c.end||min(c.start)>=min(c.end))return false;if(c.breakStart||c.breakEnd)return !!c.breakStart&&!!c.breakEnd&&min(c.breakStart)>=min(c.start)&&min(c.breakEnd)<=min(c.end)&&min(c.breakStart)<min(c.breakEnd);return true}
export function addBooking(s,b,clock=new Date()){const service=bookingServices.find(x=>x.id===b.service);if(!service||!slots(s,b.date,service,clock).includes(b.time))throw Error('Este horario ya no está disponible. Elige otro.');const record={...b,id:crypto.randomUUID(),duration:service.duration,price:null,status:'pending',paid:0,createdAt:new Date().toISOString()};s.bookings.push(record);return record}
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
