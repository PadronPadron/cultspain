import{services,serviceGroups,serviceLabel,serviceTiming,initial,today,addDays,slots,escapeHTML as esc}from'./model.js';
async function fetchState(){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{const r=await fetch('/api/availability',{signal:controller.signal});if(!r.ok)throw Error('No se pudo cargar el calendario.');const data=await r.json();if(!Array.isArray(data.week)||data.week.length!==7)throw Error('Calendario no disponible.');return data}finally{clearTimeout(timeout)}
}
const $=s=>document.querySelector(s);let selectedService=services[0],selectedDate='',selectedTime='',month=today().slice(0,7),state={...initial(),week:initial().week.map(d=>({...d,open:false}))};
let availabilityReady=false,loading=false,submitting=false;
const stepTargets={service:'#booking-service-step',date:'#booking-date-step',contact:'#booking-form'};
function setStep(step){document.querySelectorAll('[data-booking-step]').forEach(a=>{if(a.dataset.bookingStep===step)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')})}
function goToStep(step){setStep(step);if(matchMedia('(max-width:1000px)').matches)$(stepTargets[step]).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}
function closeMenu(focus=false){$('#mobile-menu').hidden=true;$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').setAttribute('aria-label','Abrir menú');$('#menu-toggle').textContent='Menú';if(focus)$('#menu-toggle').focus()}
$('#menu-toggle').onclick=()=>{const open=$('#mobile-menu').hidden;$('#mobile-menu').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open));$('#menu-toggle').setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');$('#menu-toggle').textContent=open?'Cerrar':'Menú'};
$('#mobile-menu').onclick=e=>{if(e.target.closest('a'))closeMenu()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#mobile-menu').hidden)closeMenu(true)});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu()});
document.querySelectorAll('[data-booking-step]').forEach(a=>a.onclick=()=>setStep(a.dataset.bookingStep));
async function loadAvailability(){
 if(loading)return;loading=true;$('#retry-calendar').disabled=true;if(!availabilityReady)render();
 try{state=await fetchState();availabilityReady=true;$('#availability-alert').hidden=true;if(!selectedDate||!slots(state,selectedDate,selectedService).length){selectedDate='';selectedTime='';firstAvailable()}if(state.mode==='local'){$('.preview-strip span').textContent='PRUEBA LOCAL';$('.fine-print').textContent='Prueba local. La solicitud se guarda en este ordenador; no es una cita real.'}}
 catch{availabilityReady=false;selectedTime='';$('#availability-error').textContent='No se pudo cargar la disponibilidad. Comprueba tu conexión y vuelve a intentarlo.';$('#availability-alert').hidden=false}
 finally{loading=false;$('#retry-calendar').disabled=false;render()}
}
$('#retry-calendar').onclick=loadAvailability;
let catalogueGroup='mujer',bookingGroup='mujer';
const groupButtons=selected=>serviceGroups.map(g=>`<button type="button" data-group="${g.id}" class="${g.id===selected?'selected':''}" aria-pressed="${g.id===selected}">${esc(g.name)}</button>`).join('');
function renderCatalogue(){
 $('#service-groups').innerHTML=groupButtons(catalogueGroup);
 $('#group-description').textContent=serviceGroups.find(g=>g.id===catalogueGroup).description;
 $('#service-list').innerHTML=services.filter(s=>s.group===catalogueGroup).map((s,i)=>`<div class="service-row"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><small class="service-time">${esc(serviceTiming(s))}</small></div><button data-service="${s.id}" aria-label="Elegir ${esc(serviceLabel(s))}">Reservar</button></div>`).join('');
}
function chooseService(id,scroll=false){if(submitting)return;const service=services.find(s=>s.id===id);if(!service)return;selectedService=service;bookingGroup=service.group;selectedTime='';selectedDate='';firstAvailable();render();if(scroll){if(matchMedia('(max-width:1000px)').matches)goToStep('date');else $('#reserva').scrollIntoView({behavior:'smooth'})}}
function firstAvailable(){for(let i=0;i<=90;i++){const d=addDays(today(),i);if(slots(state,d,selectedService).length){selectedDate=d;month=d.slice(0,7);return}}}
function render(){
 $('#booking-groups').innerHTML=groupButtons(bookingGroup);
 $('#booking-services').innerHTML=services.filter(s=>s.group===bookingGroup).map(s=>`<button type="button" class="booking-service ${s.id===selectedService.id?'selected':''}" data-service="${s.id}" aria-pressed="${s.id===selectedService.id}"><span>${esc(s.name)}</span><small>${esc(serviceTiming(s))}</small></button>`).join('');
 $('#service-selection-note').textContent=selectedService.consultation?'Esta cita es una consulta previa. El tratamiento completo se programa después de la valoración.':'Los tiempos son orientativos, salvo los cortes y el servicio Corte + barba, reservados en bloques de 60 minutos.';
 renderCalendar();renderTimes();
}
function renderCalendar(){const d=new Date(month+'-01T12:00:00Z');$('#month-label').textContent=new Intl.DateTimeFormat('es',{month:'long',year:'numeric',timeZone:'UTC'}).format(d);const offset=(d.getUTCDay()+6)%7;const count=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();let html='<span></span>'.repeat(offset);for(let i=1;i<=count;i++){const key=month+'-'+String(i).padStart(2,'0');const enabled=availabilityReady&&slots(state,key,selectedService).length>0;const label=new Intl.DateTimeFormat('es',{dateStyle:'full',timeZone:'UTC'}).format(new Date(key+'T12:00:00Z'));html+=`<button data-date="${key}" class="${key===selectedDate?'selected':''} ${key===today()?'is-today':''}" ${enabled?'':'disabled'} aria-label="${label}${enabled?'':' · sin disponibilidad'}" aria-pressed="${key===selectedDate}">${i}</button>`}$('#calendar').innerHTML=html;$('#prev-month').disabled=!availabilityReady||month<=today().slice(0,7);$('#next-month').disabled=!availabilityReady||month>=addDays(today(),90).slice(0,7);}
function renderTimes(){const times=availabilityReady&&selectedDate?slots(state,selectedDate,selectedService):[];if(!times.includes(selectedTime))selectedTime='';$('#selected-date').textContent=selectedDate?new Intl.DateTimeFormat('es',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(selectedDate+'T12:00:00Z')):'Selecciona un día';$('#slots').innerHTML=times.length?times.map(t=>`<button data-time="${t}" class="${t===selectedTime?'selected':''}" aria-pressed="${t===selectedTime}">${t}</button>`).join(''):`<p class="empty">${loading?'Cargando disponibilidad…':availabilityReady?'No hay horas disponibles para este día. Elige otra fecha.':'El calendario no está disponible. Usa Reintentar calendario.'}</p>`;summary()}
function summary(){$('#booking-summary').innerHTML=`<div><strong>${esc(serviceLabel(selectedService))}</strong></div><small class="muted">${selectedDate?esc(selectedDate.split('-').reverse().join('/')):'Elige un día'}${selectedTime?' · '+selectedTime:' · Elige una hora'}<br>${esc(serviceTiming(selectedService))}</small>`;$('#submit-booking').disabled=!availabilityReady||submitting||!selectedDate||!selectedTime}
function moveMonth(n){if(submitting||!availabilityReady)return;const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);month=d.toISOString().slice(0,7);renderCalendar()}
$('#service-groups').onclick=e=>{const b=e.target.closest('[data-group]');if(b){catalogueGroup=b.dataset.group;renderCatalogue()}};
$('#booking-groups').onclick=e=>{const b=e.target.closest('[data-group]');if(b){const service=services.find(s=>s.group===b.dataset.group);chooseService(service.id)}};
$('#prev-month').onclick=()=>moveMonth(-1);$('#next-month').onclick=()=>moveMonth(1);
$('#service-list').onclick=e=>{const b=e.target.closest('[data-service]');if(b)chooseService(b.dataset.service,true)};$('#booking-services').onclick=e=>{const b=e.target.closest('[data-service]');if(b&&!submitting){chooseService(b.dataset.service);goToStep('date')}};
$('#calendar').onclick=e=>{const b=e.target.closest('[data-date]');if(b&&!b.disabled&&!submitting){selectedDate=b.dataset.date;selectedTime='';renderCalendar();renderTimes()}};
$('#slots').onclick=e=>{const b=e.target.closest('[data-time]');if(b&&!submitting&&availabilityReady){selectedTime=b.dataset.time;renderTimes();goToStep('contact')}};
$('#booking-form').onsubmit=async e=>{
 e.preventDefault();if(submitting||!availabilityReady||!selectedDate||!selectedTime)return;
 const form=e.currentTarget,data=new FormData(form),requestedService=selectedService;
 if(!data.get('name').trim()){form.elements.name.setCustomValidity('Introduce un nombre.');form.elements.name.reportValidity();return}
 const requestData={service:requestedService.id,date:selectedDate,time:selectedTime,firstName:data.get('name').trim(),lastName:data.get('lastName').trim(),email:data.get('email').trim(),phone:data.get('phone').trim()};
 const submit=async()=>{const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requestData)});const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo guardar la solicitud.');return result};
 submitting=true;form.setAttribute('aria-busy','true');form.querySelectorAll('input').forEach(input=>input.disabled=true);$('#submit-booking').disabled=true;$('#submit-booking').textContent='Enviando solicitud…';
 try{const b=navigator.locks?await navigator.locks.request('cult-booking-write',submit):await submit();const day=new Intl.DateTimeFormat('es',{dateStyle:'long',timeZone:'UTC'}).format(new Date(b.date+'T12:00:00Z'));$('#booking-message').innerHTML=`<div class="success-box"><strong>Solicitud recibida.</strong><br>${esc(day)} · ${esc(b.time)}<br>${esc(serviceLabel(requestedService))}<br>Pendiente de confirmación del salón.</div>`;selectedTime='';form.reset()}
 catch(error){$('#booking-message').textContent=error instanceof TypeError?'No se pudo comprobar el envío. Revisa tu conexión antes de volver a solicitar la cita.':error.message}
 finally{submitting=false;form.removeAttribute('aria-busy');form.querySelectorAll('input').forEach(input=>input.disabled=false);$('#submit-booking').textContent='Solicitar cita';summary()}
 await loadAvailability();
};
$('#booking-form').elements.name.oninput=e=>e.target.setCustomValidity('');
window.addEventListener('focus',()=>{if(!submitting)loadAvailability()});renderCatalogue();render();loadAvailability();
