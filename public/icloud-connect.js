import {escapeHTML as esc} from './model.js';
const $=s=>document.querySelector(s);
async function api(body){
 const r=await fetch('/api/admin/icloud',{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(65000)});
 if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Recarga la aplicación para iniciar sesión.');
 const data=await r.json();if(!r.ok)throw Error(data.error||'No se ha podido conectar.');return data;
}
function render(data){
 const dialog=$('#client-dialog');if(dialog.open)dialog.close();
 $('#client-detail').innerHTML=`<p class="eyebrow">DISPONIBILIDAD</p><h2>Bloquear tiempo desde iCloud</h2>
 <p>Todos los eventos de los calendarios conectados ocupan tiempo, incluso los marcados como «Libre». También se incluyen los que ya tenías, las repeticiones y los días completos. En CULT Agenda se muestran como «Ocupado · iCloud», sin detalles personales.</p>
 <p>Se revisan cada 5 minutos; iCloud puede tardar en publicar cambios. Se importa el último mes y los próximos 90 días. Las citas del salón no se cancelan automáticamente si hay un solapamiento.</p>
 <div class="icloud-sources">${data.sources.map(s=>`<section class="icloud-source"><strong>${esc(s.label)}</strong><p>${s.error?'No se pudo actualizar. Conservamos los últimos bloqueos; las nuevas reservas están pausadas hasta recuperar la conexión.':`${s.count} ${s.count===1?'bloque':'bloques'} de tiempo · Actualizado: ${esc(new Date(s.lastSuccess).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}))} (hora de Lugo)`}</p><button class="compact-button" data-remove-icloud="${esc(s.id)}">Desconectar</button></section>`).join('')||'<p>No hay calendarios conectados.</p>'}</div>
 ${data.sources.length?'<button class="compact-button" id="icloud-sync">Actualizar ahora</button>':''}
 <details class="icloud-help"><summary>Cómo obtener el enlace en el iPhone</summary><p>Calendario → Calendarios → ⓘ junto al calendario donde guardas tus eventos → Calendario público → Compartir enlace → Copiar.</p><p>Conecta cada calendario que deba bloquear tiempo. No añadas la suscripción «CULT SPAIN · Citas»: esas citas ya están en la agenda.</p></details>
 <form id="icloud-add"><label>Nombre del calendario<input name="label" required maxlength="80" placeholder="Personal"></label><label>Enlace público de iCloud<input name="url" type="text" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="webcal://…icloud.com/published/2/…"></label><label class="icloud-consent"><input type="checkbox" name="consent" required> Entiendo que cualquier persona con este enlace puede leer el calendario. Autorizo su lectura para bloquear tiempo.</label><button class="button light" type="submit">Conectar calendario</button></form><p id="icloud-result" role="status"></p>`;
 dialog.showModal();dialog.querySelector('.dialog-close').focus({preventScroll:true});dialog.scrollTop=0;
 const run=async(body)=>{const buttons=[...$('#client-detail').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);$('#icloud-result').textContent='Actualizando calendario…';try{const next=await api(body);render(next);$('#icloud-result').textContent=next.sources.some(s=>s.error)?'Revisa el calendario que no se ha podido actualizar.':'Calendarios actualizados.';document.dispatchEvent(new Event('icloud-updated'));}catch(e){$('#icloud-result').textContent=e.message;buttons.forEach(b=>b.disabled=false);}};
 $('#icloud-add').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);run({action:'add',label:f.get('label'),url:f.get('url'),consent:f.get('consent')==='on'});};
 $('#icloud-sync')?.addEventListener('click',()=>run({action:'sync'}));
 document.querySelectorAll('[data-remove-icloud]').forEach(b=>b.onclick=()=>{if(confirm('¿Desconectar este calendario? Sus eventos dejarán de bloquear las reservas. No se borrará nada en iCloud.'))run({action:'remove',id:b.dataset.removeIcloud});});
}
$('#icloud-connect').onclick=async()=>{const button=$('#icloud-connect');button.disabled=true;try{render(await api());}catch(e){$('#integration-note').textContent=e.message;}finally{button.disabled=false;}};
