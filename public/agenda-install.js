const note=document.querySelector('#connection-note');
function connection(){note.hidden=navigator.onLine;}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)document.querySelector('#install-note').hidden=true;
if('serviceWorker' in navigator)navigator.serviceWorker.register('/agenda-sw.js',{scope:'/admin-agenda.html'}).catch(()=>{});
