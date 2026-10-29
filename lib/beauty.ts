import {env} from 'cloudflare:workers';
import {verifyAccessJWT} from './access';
import {InputError, required, text, date, email, cents} from './accounting';
import {sameOrigin} from './store';
// @ts-ignore Pure browser/server calendar shared by Beauty LAB only.
import {services, appointment, defaultSchedule, availableSlots, validHours, intervals, minute, dayAt} from '../public/beauty-lab/calendar.js';
const now=()=>new Date().toISOString(), id=()=>crypto.randomUUID();
function db(){if(!env.BEAUTY_DB)throw new InputError('La agenda estará disponible próximamente.',503);return env.BEAUTY_DB}
const stmt=(sql:string,args:unknown[]=[])=>db().prepare(sql).bind(...args);
const one=(sql:string,args:unknown[]=[])=>stmt(sql,args).first<any>();
const all=async(sql:string,args:unknown[]=[])=> (await stmt(sql,args).all<any>()).results;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'}});
const audit=(actor:string,entity:string,key:string,action:string,before:unknown,after:unknown)=>stmt('INSERT INTO audit_log VALUES(?,?,?,?,?,?,?,?)',[id(),now(),actor,entity,key,action,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);
async function guarded(condition:string,args:unknown[],commands:D1PreparedStatement[]){const key=id();try{await db().batch([stmt(`INSERT INTO guards VALUES(?,CASE WHEN (${condition}) THEN 1 ELSE 0 END)`,[key,...args]),...commands,stmt('DELETE FROM guards WHERE id=?',[key])])}catch(e){if(/beauty_guard|UNIQUE constraint/.test(String(e)))throw new InputError('El horario o los datos han cambiado. Actualiza y vuelve a intentarlo.',409);throw e}}
async function revision(table:'clients'|'entries'|'bookings',old:any,b:any,commands:D1PreparedStatement[]){if(b.revision!==old.revision)throw new InputError('Los datos han cambiado. Actualiza la página.',409);await guarded(`EXISTS(SELECT 1 FROM ${table} WHERE id=? AND revision=?)`,[old.id,old.revision],commands)}
async function schedule(){const row=await one("SELECT value FROM settings WHERE key='schedule'");const defaults=defaultSchedule(),saved=row?JSON.parse(row.value):{};return {...defaults,...saved,durations:{...defaults.durations,...saved.durations},prices:{...defaults.prices,...saved.prices}}}
const calendarVersion=async()=>(await one("SELECT value FROM settings WHERE key='version'"))?.value||'0';
const bump=()=>stmt("INSERT INTO settings VALUES('version','1') ON CONFLICT(key) DO UPDATE SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT)");
const calendarGuard="COALESCE((SELECT value FROM settings WHERE key='version'),'0')=?";
async function access(request:Request){
 if(import.meta.env.DEV&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname))return 'local-beauty-owner';
 try{return (await verifyAccessJWT(request.headers.get('Cf-Access-Jwt-Assertion')||'',{teamDomain:env.CF_ACCESS_TEAM_DOMAIN||'',audience:env.BEAUTY_ACCESS_AUD||'',adminEmail:env.BEAUTY_ADMIN_EMAIL||''})).id}catch{throw new InputError('Inicia sesión con la cuenta autorizada de Beauty LAB. Si aún no tienes acceso, solicita la activación.',403)}
}
async function body(request:Request){if(Number(request.headers.get('content-length'))>16384)throw new InputError('Solicitud demasiado grande.',413);const raw=await request.text();if(raw.length>16384)throw new InputError('Solicitud demasiado grande.',413);try{const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b}catch{throw new InputError('Revisa los datos enviados.')}}
function phone(v:unknown){const p=required(v,'Teléfono',30);if(!/^[+0-9 ()-]{6,30}$/.test(p))throw new InputError('Revisa el teléfono.');return p}
async function record(table:'clients'|'entries'|'bookings',key:string){const row=await one(`SELECT * FROM ${table} WHERE id=?`,[key]);if(!row)throw new InputError('No se ha encontrado el registro.',404);return row}
const occupied=(key:string,day:string,time:string,duration:number)=>Array.from({length:duration},(_,i)=>stmt('INSERT INTO booking_minutes VALUES(?,?)',[day+'|'+(minute(time)+i),key]));
async function reserve(request:Request,b:any){
 const token=required(b.requestKey,'Referencia',36);if(!/^[0-9a-f-]{36}$/.test(token))throw new InputError('Actualiza la página antes de reservar.');
 const previous=await one('SELECT id FROM bookings WHERE request_key=?',[token]);if(previous)return json({id:previous.id,received:true},200);
 if(text(b.website,250))throw new InputError('No se ha podido enviar la solicitud.');
 const name=required(b.name,'Nombre',120),tel=phone(b.phone),mail=email(b.email),day=date(b.date),time=required(b.time,'Hora',5),notes=text(b.notes,1000);
 if(!services.some((v:any)=>v.id===b.service))throw new InputError('Selecciona un servicio.');
 const version=await calendarVersion(),s=await schedule(),bookings=await all("SELECT date,time,duration,status FROM bookings WHERE date=? AND status!='cancelled'",[day]);
 if(b.design!==undefined&&typeof b.design!=='boolean')throw new InputError('Diseño no válido.');
 const chosen=appointment(s,b.service,b.design===true),duration=chosen.duration;
 if(duration>480)throw new InputError('La duración total supera el máximo de ocho horas.');
 if(!availableSlots(s,bookings,day,new Date(),duration).includes(time))throw new InputError(s.enabled?'Este horario no está disponible. Elige otro.':'La agenda estará disponible próximamente.',409);
 const rawIP=request.headers.get('cf-connecting-ip')||'local',hour=Math.floor(Date.now()/3600000);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rawIP+'|beauty|'+hour)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const limit=await one('SELECT count FROM request_limits WHERE key=?',[hash]);if(limit?.count>=5)throw new InputError('Has enviado varias solicitudes. Inténtalo más tarde.',429);
 const matches=await all('SELECT id FROM clients WHERE archived=0 AND name=? AND phone=?',[name,tel]),clientId=matches.length===1?matches[0].id:id(),key=id(),stamp=now();
 const commands=[stmt('DELETE FROM request_limits WHERE expires_at<?',[hour]),stmt('INSERT INTO request_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',[hash,hour+1]),...(!matches.some(x=>x.id===clientId)?[stmt('INSERT INTO clients(id,name,phone,email,created_at,updated_at) VALUES(?,?,?,?,?,?)',[clientId,name,tel,mail,stamp,stamp])]:[]),stmt('INSERT INTO bookings(id,request_key,client_id,date,time,service,service_key,design,price_cents,duration,status,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[key,token,clientId,day,time,b.service==='pedicura'?'pedicura':'manicura',b.service,chosen.design?1:0,chosen.priceCents,duration,'pending',notes,stamp]),...occupied(key,day,time,duration),bump(),audit('booking-form','bookings',key,'create',null,{date:day,time})];
 await guarded(calendarGuard+' AND COALESCE((SELECT count FROM request_limits WHERE key=?),0)<5',[version,hash],commands);
 return json({id:key,received:true},201);
}
async function changeBooking(key:string,b:any,actor:string){
 const version=await calendarVersion(),old=await record('bookings',key);if(old.revision!==b.revision)throw new InputError('La cita ha cambiado. Actualiza la página.',409);
 const status=b.status??old.status;if(!['pending','confirmed','completed','cancelled'].includes(status))throw new InputError('Estado no válido.');
 if(old.status==='cancelled'&&status!=='cancelled')throw new InputError('Solicita una nueva cita para recuperar un horario cancelado.');
 const day=date(b.date??old.date),time=required(b.time??old.time,'Hora',5),duration=b.duration??old.duration;
 if(!Number.isInteger(duration)||duration<15||duration>480||duration%5)throw new InputError('Duración entre 15 y 480 minutos, en pasos de 5.');
 const changed=day!==old.date||time!==old.time||duration!==old.duration;
 if(changed&&status==='cancelled')throw new InputError('Una cita cancelada no se puede trasladar.');
 if(changed){const s=await schedule(),others=await all('SELECT * FROM bookings WHERE date=? AND id!=?',[day,key]);if(!availableSlots({...s,enabled:true},others,day,new Date(),duration).includes(time))throw new InputError('El nuevo horario no está disponible.',409)}
 if(status==='completed'&&day>dayAt())throw new InputError('La fecha de la cita todavía no ha llegado.');
 const commands=[stmt('UPDATE bookings SET date=?,time=?,duration=?,status=?,notes=?,revision=revision+1 WHERE id=?',[day,time,duration,status,text(b.notes??old.notes,1000),key])];
 if(changed||status==='cancelled'){commands.push(stmt('DELETE FROM booking_minutes WHERE booking_id=?',[key]));if(status!=='cancelled')commands.push(...occupied(key,day,time,duration))}
 commands.push(bump(),audit(actor,'bookings',key,'update',old,{date:day,time,duration,status}));await guarded(calendarGuard+' AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND revision=?)',[version,key,old.revision],commands);return {id:key};
}
async function saveClient(key:string|undefined,b:any,actor:string){const old=key?await record('clients',key):null,k=key||id(),stamp=now();
 if(old&&['archive','restore'].includes(b.action)){const archived=b.action==='archive'?1:0;await revision('clients',old,b,[stmt('UPDATE clients SET archived=?,revision=revision+1,updated_at=? WHERE id=?',[archived,stamp,k]),audit(actor,'clients',k,b.action,old,{archived})]);return {id:k}}
 const values=[required(b.name,'Nombre',120),text(b.phone,30),email(b.email),text(b.notes,3000),stamp];
 const q=old?stmt('UPDATE clients SET name=?,phone=?,email=?,notes=?,updated_at=?,revision=revision+1 WHERE id=?',[...values,k]):stmt('INSERT INTO clients(name,phone,email,notes,updated_at,id,created_at) VALUES(?,?,?,?,?,?,?)',[...values,k,stamp]);
 const commands=[q,audit(actor,'clients',k,old?'update':'create',old,b)];if(old)await revision('clients',old,b,commands);else await db().batch(commands);return {id:k};
}
async function saveEntry(key:string|undefined,b:any,actor:string){const old=key?await record('entries',key):null,k=key||id(),stamp=now();
 if(old){required(b.reason,'Motivo del cambio',1000);if(['archive','restore'].includes(b.action)){const archived=b.action==='archive'?1:0;await revision('entries',old,b,[stmt('UPDATE entries SET archived=?,revision=revision+1,updated_at=? WHERE id=?',[archived,stamp,k]),audit(actor,'entries',k,b.action,old,b)]);return {id:k}}}
 const kind=old?.kind??b.kind;if(!['income','expense'].includes(kind))throw new InputError('Movimiento no válido.');const amount=cents(b.amountCents);if(!amount)throw new InputError('El importe debe ser mayor que cero.');
 if(!['cash','card','transfer','other'].includes(b.method))throw new InputError('Selecciona el método de pago.');
 const client=b.clientId?await record('clients',required(b.clientId,'Cliente',80)):null;
 const booking=b.bookingId?await record('bookings',required(b.bookingId,'Cita',80)):null;
 if(booking&&(kind!=='income'||client?.id!==booking.client_id))throw new InputError('El cobro debe corresponder al cliente de la cita.');
 const values=[date(b.date),required(b.description,'Concepto',300),amount,b.method,client?.id||null,booking?.id||null,text(b.notes,2000),stamp];
 const q=old?stmt('UPDATE entries SET date=?,description=?,amount_cents=?,method=?,client_id=?,booking_id=?,notes=?,updated_at=?,revision=revision+1 WHERE id=?',[...values,k]):stmt('INSERT INTO entries(date,description,amount_cents,method,client_id,booking_id,notes,updated_at,id,kind,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[...values,k,kind,stamp]);
 const commands=[q,audit(actor,'entries',k,old?'update':'create',old,b)];try{if(old)await revision('entries',old,b,commands);else await db().batch(commands)}catch(e){if(String(e).includes('UNIQUE'))throw new InputError('Esta cita ya tiene un cobro registrado.',409);throw e}return {id:k};
}
async function saveSchedule(b:any,actor:string){
 const version=await calendarVersion();if(b.version!==version)throw new InputError('El horario ha cambiado. Actualiza la página.',409);
 if(typeof b.enabled!=='boolean'||!b.durations||services.some((v:any)=>!Number.isInteger(b.durations[v.id])||b.durations[v.id]<15||b.durations[v.id]>480||b.durations[v.id]%5)||!Array.isArray(b.week)||b.week.length!==7||b.week.some((h:any)=>!validHours(h)))throw new InputError('Revisa la duración y el horario semanal.');
 if(!b.exceptions||typeof b.exceptions!=='object'||Array.isArray(b.exceptions)||Object.keys(b.exceptions).length>366)throw new InputError('Revisa las excepciones.');for(const [d,h] of Object.entries(b.exceptions)){date(d);if(!validHours(h))throw new InputError('Revisa las excepciones.')}
 if(b.enabled&&!b.week.some((h:any)=>h.open)&&!Object.values(b.exceptions).some((h:any)=>h.open))throw new InputError('Abre al menos un día para activar las reservas.');
 if(!b.prices||services.some((v:any)=>b.prices[v.id]!==null&&(!Number.isSafeInteger(b.prices[v.id])||b.prices[v.id]<0||b.prices[v.id]>100000000))||!Number.isInteger(b.designMinutes)||b.designMinutes<5||b.designMinutes>60||b.designMinutes%5||!Number.isSafeInteger(b.designPriceCents)||b.designPriceCents<0||b.designPriceCents>100000000)throw new InputError('Revisa los precios y el tiempo de diseño.');
 const data={enabled:b.enabled,durations:b.durations,prices:b.prices,designMinutes:b.designMinutes,designPriceCents:b.designPriceCents,week:b.week,exceptions:b.exceptions},active=await all("SELECT * FROM bookings WHERE date>=? AND status IN ('pending','confirmed')",[dayAt()]);
 if(active.some(c=>!intervals(data,c.date).some(([a,z]:number[])=>minute(c.time)>=a&&minute(c.time)+c.duration<=z)))throw new InputError('El horario dejaría citas fuera de jornada. Trasládalas o cancélalas primero.',409);
 await guarded(calendarGuard,[version],[stmt("INSERT INTO settings VALUES('schedule',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[JSON.stringify(data)]),bump(),audit(actor,'settings','schedule','update',await schedule(),data)]);return {ok:true};
}
async function handler(request:Request){
 const path=new URL(request.url).pathname.replace(/^\/api\/beauty\/?/,'').split('/').filter(Boolean),method=request.method;
 if(method!=='GET')sameOrigin(request);
 if(path.length===1&&path[0]==='availability'&&method==='GET'){const s=await schedule();return json({schedule:s,bookings:await all("SELECT date,time,duration,status FROM bookings WHERE date>=? AND status!='cancelled'",[dayAt()])})}
 if(path.length===1&&path[0]==='bookings'&&method==='POST')return reserve(request,await body(request));
 if(path[0]!=='admin')throw new InputError('Página no encontrada.',404);
 const actor=await access(request),[type,key]=path.slice(1);if(path.length>3)throw new InputError('Página no encontrada.',404);
 if(method==='GET'&&type==='state'&&!key)return json({schedule:await schedule(),version:await calendarVersion(),clients:await all('SELECT * FROM clients ORDER BY name'),bookings:(await all('SELECT * FROM bookings ORDER BY date,time')).map(b=>({...b,service:b.service_key||b.service})),entries:await all('SELECT * FROM entries ORDER BY date DESC,created_at DESC'),local:import.meta.env.DEV});
 if(method==='PUT'&&type==='schedule'&&!key)return json(await saveSchedule(await body(request),actor));
 if(method==='PUT'&&type==='bookings'&&key)return json(await changeBooking(key,await body(request),actor));
 if(['POST','PUT'].includes(method)&&['clients','entries'].includes(type)){if((method==='POST'&&key)||(method==='PUT'&&!key))throw new InputError('Ruta no válida.',404);return json(await (type==='clients'?saveClient:saveEntry)(key,await body(request),actor),method==='POST'?201:200)}
 throw new InputError('Página no encontrada.',404);
}
export async function beautyAPI(request:Request){try{return await handler(request)}catch(e){return json({error:e instanceof InputError?e.message:'No se ha podido guardar. Inténtalo de nuevo.'},e instanceof InputError?e.status:500)}}
