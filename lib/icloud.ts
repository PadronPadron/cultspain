import {InputError} from './accounting';
import {one,stmt,guardedBatch,id,auditStmt} from './store';
import {calendarBusy,fetchCalendar,icloudURL,type BusyBlock} from './icloud-core';
const KEY='icloud_calendars_v1',INTERVAL=5*60_000;
type Source={id:string;label:string;url:string;blocks:BusyBlock[];lastSuccess:number;lastAttempt:number;error:boolean};
async function read(){const row=await one('SELECT value FROM settings WHERE key=?',[KEY]);return {raw:row?.value||'',sources:row?JSON.parse(row.value) as Source[]:[]};}
async function commit(raw:string,sources:Source[],audit?:any){
 await guardedBatch("COALESCE((SELECT value FROM settings WHERE key=?),'')=?",[KEY,raw],[
  stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',[KEY,JSON.stringify(sources)]),
  stmt("INSERT INTO settings(key,value) VALUES('calendar_version','1') ON CONFLICT(key) DO UPDATE SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT)"),...(audit?[audit]:[])
 ]);
}
export async function syncICloud(force=false){
 const {raw,sources}=await read();let changed=false;
 await Promise.all(sources.map(async source=>{
  if(!force&&Date.now()-source.lastAttempt<INTERVAL)return;
  source.lastAttempt=Date.now();changed=true;
  try{source.blocks=calendarBusy(await fetchCalendar(source.url));source.lastSuccess=Date.now();source.error=false;}
  catch{source.error=true;} // Preserve last good blocks; never log the secret URL or event data.
 }));
 if(changed)try{await commit(raw,sources);}catch(e){if(!(e instanceof InputError&&e.status===409))throw e;}
}
export async function ensureICloud(strict=false){
 await syncICloud();
 const {sources}=await read();
 if(strict&&sources.some(s=>s.error||Date.now()-s.lastSuccess>3*INTERVAL))throw new InputError('No se puede comprobar la disponibilidad en este momento. Inténtalo de nuevo en unos minutos.',503);
}
export async function icloudBusy(){return (await read()).sources.flatMap(s=>s.blocks.map((b,index)=>({...b,id:`icloud-${s.id}-${index}`,external:true,status:'blocked',name:'Ocupado · iCloud',service:'iCloud'})));}
export async function icloudStatus(){return {sources:(await read()).sources.map(s=>({id:s.id,label:s.label,lastSuccess:s.lastSuccess,error:s.error||Date.now()-s.lastSuccess>3*INTERVAL,count:s.blocks.length}))};}
export async function icloudAction(b:any,actor:string){
 if(b.action==='sync'){await syncICloud(true);return icloudStatus();}
 const {raw,sources}=await read();
 if(b.action==='remove'){
  if(!sources.some(s=>s.id===b.id))throw new InputError('Calendario no encontrado.',404);
  await commit(raw,sources.filter(s=>s.id!==b.id),auditStmt(actor,'settings','icloud','disconnect',null,{id:b.id}));return icloudStatus();
 }
 if(b.action!=='add')throw new InputError('Acción no válida.');
 if(sources.length>=5)throw new InputError('Puedes conectar hasta 5 calendarios.');
 let url:string;try{url=icloudURL(b.url);}catch(e){throw new InputError((e as Error).message);}
 if(sources.some(s=>s.url===url))throw new InputError('Este calendario ya está conectado.');
 if(b.consent!==true)throw new InputError('Confirma el acceso al calendario público.');
 const label=typeof b.label==='string'?b.label.trim().slice(0,80):'';
 if(!label)throw new InputError('Pon un nombre al calendario.');
 let blocks:BusyBlock[];try{blocks=calendarBusy(await fetchCalendar(url));}catch{throw new InputError('No se ha podido leer el calendario. Comprueba el enlace público de iCloud y vuelve a intentarlo. No se ha conectado.',502);}
 const source:Source={id:id(),label,url,blocks,lastSuccess:Date.now(),lastAttempt:Date.now(),error:false};
 await commit(raw,[...sources,source],auditStmt(actor,'settings','icloud','connect',null,{id:source.id,label}));return icloudStatus();
}
