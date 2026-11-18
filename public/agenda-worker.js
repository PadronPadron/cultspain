// Cloudflare serves /admin-agenda.html at /admin-agenda. Cover both URLs.
export const agendaScope='/admin-agenda';
let pending;
export function withDeadline(promise,ms=20000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('La conexión ha tardado demasiado. Recarga la aplicación y vuelve a intentarlo.')),ms);})]).finally(()=>clearTimeout(timer));}
export async function waitForActive(registration,ms=15000){
 if(registration.active?.state==='activated')return registration;
 return new Promise((resolve,reject)=>{
  const watched=new Set();
  const cleanup=()=>{clearTimeout(timer);registration.removeEventListener('updatefound',check);for(const worker of watched)worker.removeEventListener('statechange',check);};
  const check=()=>{if(registration.active?.state==='activated'){cleanup();resolve(registration);return;}for(const worker of [registration.installing,registration.waiting,registration.active])if(worker&&!watched.has(worker)){watched.add(worker);worker.addEventListener('statechange',check);}};
  const timer=setTimeout(()=>{cleanup();reject(Error('No se ha activado el servicio de notificaciones. Cierra y vuelve a abrir la aplicación.'));},ms);
  registration.addEventListener('updatefound',check);check();
 });
}
export function agendaRegistration(){
 if(!pending)pending=withDeadline(navigator.serviceWorker.register('/agenda-sw.js',{scope:agendaScope,updateViaCache:'none'})).then(waitForActive).catch(error=>{pending=undefined;throw error;});
 return pending;
}
