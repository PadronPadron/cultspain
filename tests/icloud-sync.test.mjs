import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {DatabaseSync} from 'node:sqlite';
import {InputError} from '../lib/accounting.ts';import {calendarBusy,icloudURL} from '../lib/icloud-core.ts';
async function setup(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');let downloaded='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';let failing=false,fetches=0;
 const stmt=(sql,args=[])=>({sql,args});
 const deps={InputError,calendarBusy,icloudURL,fetchCalendar:async()=>{fetches++;if(failing)throw Error('secret download error');return downloaded;},one:async(sql,args=[])=>db.prepare(sql).get(...args),stmt,id:()=>crypto.randomUUID(),auditStmt:()=>stmt('SELECT 1'),guardedBatch:async(condition,args,commands)=>{db.exec('BEGIN');try{if(!db.prepare('SELECT '+condition+' AS valid').get(...args).valid)throw new InputError('Conflict',409);for(const c of commands)db.prepare(c.sql).run(...c.args);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
 const code=stripTypeScriptTypes(readFileSync(new URL('../lib/icloud.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''));
 const api=new Function(...Object.keys(deps),code+';return {syncICloud,ensureICloud,icloudAction,icloudStatus,icloudBusy};')(...Object.values(deps));
 return {...api,db,setFeed:v=>downloaded=v,fail:()=>failing=true,fetches:()=>fetches};
}
const add={action:'add',label:'Personal',url:'webcal://p01-caldav.icloud.com/published/2/private-token',consent:true};
const future=new Date(Date.now()+86400000).toISOString().slice(0,10).replaceAll('-','');
const event=(hour)=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:private-uid\r\nDTSTART:${future}T${hour}0000Z\r\nDTEND:${future}T${Number(hour)+1}0000Z\r\nSUMMARY:Doctor\r\nEND:VEVENT\r\nEND:VCALENDAR`;
test('connect, move, remove and disconnect replace busy ranges, preserve privacy and bump booking version',async()=>{
 const f=await setup();f.setFeed(event('10'));const result=await f.icloudAction(add,'owner');assert.equal(result.sources.length,1);assert(!JSON.stringify(result).includes('private-token'));assert(!JSON.stringify(result).includes('Doctor'));assert.equal((await f.icloudBusy())[0].time,'11:00');
 await assert.rejects(f.icloudAction(add,'owner'),/ya está conectado/);
 f.setFeed(event('12'));await f.syncICloud(true);assert.equal((await f.icloudBusy())[0].time,'13:00');
 f.setFeed('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR');await f.syncICloud(true);assert.deepEqual(await f.icloudBusy(),[]);
 assert.equal(f.db.prepare("SELECT value FROM settings WHERE key='calendar_version'").get().value,'3');
 await f.icloudAction({action:'remove',id:result.sources[0].id},'owner');assert.equal((await f.icloudStatus()).sources.length,0);f.db.close();
});
test('failed sync keeps existing blocks, rejects booking checks and status does not expose secrets',async()=>{
 const f=await setup();f.setFeed(event('10'));await f.icloudAction(add,'owner');const before=await f.icloudBusy();f.fail();await f.syncICloud(true);
 assert.deepEqual(await f.icloudBusy(),before);assert((await f.icloudStatus()).sources[0].error);await assert.rejects(f.ensureICloud(true),/disponibilidad/);assert(!JSON.stringify(await f.icloudStatus()).includes('private-token'));f.db.close();
});
test('fresh snapshots do not repeatedly fetch and failed initial import is never stored',async()=>{
 const f=await setup();f.fail();await assert.rejects(f.icloudAction(add,'owner'),/No se ha podido/);assert.equal((await f.icloudStatus()).sources.length,0);f.db.close();
 const g=await setup();await g.icloudAction(add,'owner');await g.ensureICloud(true);await g.ensureICloud(true);assert.equal(g.fetches(),1);g.db.close();
});
