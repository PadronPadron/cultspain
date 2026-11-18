import {agendaRegistration,withDeadline} from './agenda-worker.js';
const $=s=>document.querySelector(s),note=$('#integration-note');
async function api(path,body){const r=await withDeadline(fetch('/api/admin/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}));if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Recarga la aplicación para iniciar sesión.');const data=await r.json();if(!r.ok)throw Error(data.error||'No se ha podido guardar.');return data;}
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
let registration,subscription,publicKey,prepared=false,saved=false;
const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
function buttons(){const active=saved&&!!subscription&&Notification.permission==='granted';$('#push-enable').hidden=active;$('#push-test').hidden=!active;$('#push-disable').hidden=!active;}
async function prepare(){
 if(!supported)return;
 registration=await agendaRegistration();
 subscription=await withDeadline(registration.pushManager.getSubscription());
 publicKey=(await api('push')).publicKey;
 saved=false;if(subscription&&Notification.permission==='granted'){await api('push',subscription.toJSON());saved=true;}
 prepared=true;buttons();
}
async function initialize(){
 if(!supported)return;
 $('#push-enable').disabled=true;note.textContent='Preparando las notificaciones…';
 try{await prepare();note.textContent=saved?'Notificaciones conectadas. Puedes enviar un aviso de prueba.':'Listo. Pulsa «Activar notificaciones» para conectar este dispositivo.';}
 catch(e){note.textContent=e.message;}
 finally{$('#push-enable').disabled=false;}
}
initialize();
$('#push-enable').onclick=async()=>{
 const b=$('#push-enable');b.disabled=true;
 try{
  if(!supported)throw Error('En el iPhone, añade la aplicación a la pantalla de inicio y ábrela desde su icono (iOS 16.4 o posterior).');
  if(!prepared){await prepare();note.textContent='Conexión preparada. Pulsa «Activar notificaciones» otra vez.';return;}
  // Request permission directly from this user gesture, before any network await.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Permite las notificaciones de CULT Agenda en los ajustes del dispositivo.');
  subscription=await withDeadline(registration.pushManager.getSubscription())||await withDeadline(registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(publicKey)}));
  await api('push',subscription.toJSON());saved=true;buttons();note.textContent='Notificaciones activadas. Pulsa «Probar aviso» para comprobar la recepción.';
 }catch(e){note.textContent=e.message;}finally{b.disabled=false;}
};
$('#push-test').onclick=async()=>{const b=$('#push-test');b.disabled=true;try{await api('push/test',{endpoint:subscription.endpoint});note.textContent='Aviso enviado al servicio push. Comprueba las notificaciones de tu dispositivo.';}catch(e){note.textContent=e.message;}finally{b.disabled=false;}};
$('#push-disable').onclick=async()=>{try{await api('push',{endpoint:subscription.endpoint,action:'remove'});await subscription.unsubscribe();subscription=null;saved=false;buttons();note.textContent='Avisos desactivados en este dispositivo.';}catch(e){note.textContent=e.message;}};
$('#calendar-connect').onclick=async()=>{
 try{
  const status=await api('calendar-link'),dialog=$('#client-dialog');if(dialog.open)dialog.close();
  $('#client-detail').innerHTML=`<p class="eyebrow">CULT SPAIN</p><h2>Calendario del iPhone</h2><p>Las citas se muestran en Calendario mediante una suscripción de solo lectura. Crea, modifica y cancela las citas en CULT Agenda.</p><p>El iPhone decide cuándo actualizar la suscripción; los cambios no siempre aparecen al instante.</p><p>El enlace es privado y permite ver los nombres y servicios de las citas. Compártelo solo con quien deba consultar la agenda.</p><div class="booking-manage-actions"><button class="compact-button" id="calendar-create">${status.active?'Reemplazar enlace privado':'Crear enlace privado'}</button>${status.active?'<button class="compact-button" id="calendar-disable">Desactivar enlace</button>':''}</div>${status.active?'<p>Reemplazar el enlace desconecta las suscripciones anteriores. Desactivarlo detiene las actualizaciones; elimina también el calendario del iPhone si ya no lo necesitas.</p>':''}<div id="calendar-result" role="status"></div>`;
  dialog.showModal();
  $('#calendar-create').onclick=async()=>{const b=$('#calendar-create');b.disabled=true;try{const result=await api('calendar-link',{action:'create'}),url=result.url;const box=$('#calendar-result');box.replaceChildren();const link=document.createElement('a');link.className='button light';link.textContent='Añadir al Calendario';link.href=url.replace(/^https?:/,'webcal:');box.append(link);const label=document.createElement('label');label.textContent='Enlace de suscripción';const input=document.createElement('input');input.value=url;input.readOnly=true;input.onclick=()=>input.select();label.append(input);box.append(label);const copy=document.createElement('button');copy.className='compact-button';copy.textContent='Copiar enlace';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);copy.textContent='Copiado';}catch{input.select();copy.textContent='Selecciona y copia el enlace';}};box.append(copy);const help=document.createElement('p');help.textContent='Si no se abre automáticamente: Calendario → Calendarios → Añadir calendario → Añadir calendario de suscripción. Pega este enlace. Guarda el enlace ahora; por seguridad no se vuelve a mostrar.';box.append(help);}catch(e){$('#calendar-result').textContent=e.message;b.disabled=false;}};
  if($('#calendar-disable'))$('#calendar-disable').onclick=async()=>{try{await api('calendar-link',{action:'disable'});$('#calendar-result').textContent='Enlace desactivado.';$('#calendar-disable').disabled=true;}catch(e){$('#calendar-result').textContent=e.message;}};
 }catch(e){note.textContent=e.message;}
};
