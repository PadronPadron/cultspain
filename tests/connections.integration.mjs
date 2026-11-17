import assert from 'node:assert/strict';
const root='http://127.0.0.1:4173';
async function call(path,body){const r=await fetch(root+'/api/admin/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,200,data.error);return data;}
const keys=await call('push');assert.deepEqual(Object.keys(keys),['publicKey']);assert.equal(Buffer.from(keys.publicKey,'base64url').length,65);
const link=await call('calendar-link',{action:'create'});try{
 const response=await fetch(link.url);assert.equal(response.status,200);assert(response.headers.get('content-type').startsWith('text/calendar'));assert(response.headers.get('cache-control').includes('no-store'));const feed=await response.text();assert(feed.startsWith('BEGIN:VCALENDAR\r\n'));assert(feed.includes('UID:'));
 const replacement=await call('calendar-link',{action:'create'});assert.notEqual(replacement.url,link.url);assert.equal((await fetch(link.url)).status,404);assert.equal((await fetch(replacement.url)).status,200);await call('calendar-link',{action:'disable'});assert.equal((await fetch(replacement.url)).status,404);
 const denied=await fetch(root+'/api/admin/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:'https://127.0.0.1/internal',keys:{}})});assert.equal(denied.status,400);
 console.log('PASS local Workers: public VAPID key only; private calendar feed, rotation, revocation, no-cache; unsafe push endpoint rejected.');
}finally{await call('calendar-link',{action:'disable'});}
