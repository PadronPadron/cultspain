// No private records, authenticated responses or mutations are stored offline.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).catch(()=>new Response(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>CULT Agenda</title><body style="background:#101010;color:#eee;font:18px system-ui;padding:40px"><h1>CULT SPAIN</h1><h2>Sin conexión</h2><p>Conéctate a internet para abrir la agenda. Los cambios requieren conexión.</p><a href="/admin-agenda.html" style="color:white">Volver a intentar</a></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
self.addEventListener('push',event=>{
 let message={title:'CULT SPAIN',body:'Hay novedades en la agenda.'};try{if(event.data)message={...message,...event.data.json()};}catch{}
 event.waitUntil(self.registration.showNotification(message.title,{body:message.body,icon:'/agenda-192.png',badge:'/agenda-192.png',tag:message.tag||'cult-agenda',data:{url:'/admin-agenda.html'+(/^[a-f0-9-]{36}$/.test(message.tag||'')?'?booking='+message.tag:'')+'#bookings'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{const target=new URL(event.notification.data?.url||'/admin-agenda.html#bookings',self.location.origin);if(target.origin!==self.location.origin||target.pathname!=='/admin-agenda.html')return;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const app=windows.find(w=>new URL(w.url).pathname==='/admin-agenda.html');if(app){await app.navigate(target.href);return app.focus();}return self.clients.openWindow(target.href);})());
});
