import {env} from 'cloudflare:workers';
import {verifyAccessJWT} from './access';
import {InputError} from './accounting';
export function database(){if(!env.DB)throw new InputError('La base D1 no está conectada.',503);return env.DB}
export async function admin(request:Request){const host=new URL(request.url).hostname;if(import.meta.env.DEV&&['127.0.0.1','localhost','[::1]'].includes(host))return 'local-owner';try{const user=await verifyAccessJWT(request.headers.get('Cf-Access-Jwt-Assertion')||'',{teamDomain:env.CF_ACCESS_TEAM_DOMAIN||'',audience:env.CF_ACCESS_AUD||'',adminEmail:env.ADMIN_EMAIL||''});return user.id}catch(e){throw new InputError(e instanceof Error?e.message:'Acceso no autorizado.',403)}}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new InputError('No se permiten solicitudes desde otro sitio.',403);if(request.headers.get('sec-fetch-site')==='cross-site')throw new InputError('No se permiten solicitudes desde otro sitio.',403)}
export const now=()=>new Date().toISOString();
export const id=()=>crypto.randomUUID();
export function stmt(sql:string,args:unknown[]=[]){return database().prepare(sql).bind(...args)}
export async function all(sql:string,args:unknown[]=[]){return (await stmt(sql,args).all()).results as any[]}
export async function one(sql:string,args:unknown[]=[]){return await stmt(sql,args).first() as any}
export function auditStmt(actor:string,type:string,entityId:string,action:string,before:any,after:any){return stmt('INSERT INTO audit_log(id,at,actor,entity_type,entity_id,action,before_json,after_json) VALUES(?,?,?,?,?,?,?,?)',[id(),now(),actor,type,entityId,action,before?JSON.stringify(before):null,after?JSON.stringify(after):null])}
export const camel=(row:any):any=>row?Object.fromEntries(Object.entries(row).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v])):null;

export async function guardedBatch(condition:string,args:unknown[],commands:D1PreparedStatement[]){const guardId=id();try{return await database().batch([stmt(`INSERT INTO transaction_guards(id,valid) VALUES(?, CASE WHEN (${condition}) THEN 1 ELSE 0 END)`,[guardId,...args]),...commands,stmt('DELETE FROM transaction_guards WHERE id=?',[guardId])])}catch(e){if(String(e).includes('guard_valid'))throw new InputError('Los datos han cambiado en otra ventana. Actualiza la página y repite la acción.',409);throw e}}
export async function revisionBatch(table:string,key:string,revision:number,commands:D1PreparedStatement[]){return guardedBatch(`EXISTS(SELECT 1 FROM ${table} WHERE id=? AND revision=?)`,[key,revision],commands)}
export async function calendarVersion(){return (await one("SELECT value FROM settings WHERE key='calendar_version'"))?.value||'0'}
export async function calendarBatch(version:string,commands:D1PreparedStatement[]){return guardedBatch("COALESCE((SELECT value FROM settings WHERE key='calendar_version'),'0')=?",[version],[...commands,stmt("INSERT INTO settings(key,value) VALUES('calendar_version','1') ON CONFLICT(key) DO UPDATE SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT)")])}
