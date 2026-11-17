import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {validHours,intervals,initial} from '../public/model.js';
test('schedule form disables breaks, copies drafts and submits a continuous Saturday',async()=>{
 const elements={};for(let i=0;i<7;i++)for(const key of ['open','pause','start','end','breakStart','breakEnd'])elements[key+'-'+i]={type:['open','pause'].includes(key)?'checkbox':'time',checked:true,value:({start:'10:00',end:'19:00',breakStart:'14:00',breakEnd:'15:00'})[key]||'',name:key+'-'+i,dataset:{}};
 const form={elements},exception={};let sent;const context={state:{week:initial().week,exceptions:{}},days:['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],content:{},$:s=>s==='#week-form'?form:exception,toolbar:()=>'',today:()=> '2026-11-17',table:()=>'',btn:()=>'',esc:s=>s,perform:async fn=>fn(),api:async(path,method,body)=>{sent=body},FormData:class{constructor(){this.entries=Object.fromEntries(Object.entries(elements).filter(([,v])=>!v.disabled&&(v.type!=='checkbox'||v.checked)).map(([k,v])=>[k,v.type==='checkbox'?'on':v.value]))}has(k){return k in this.entries}get(k){return this.entries[k]??null}}};
 const source=fs.readFileSync(new URL('../public/admin.js',import.meta.url),'utf8');vm.runInNewContext(source.slice(source.indexOf('function schedule(){'),source.indexOf('function field('))+'\nschedule();',context);
 elements['end-6'].value='14:00';elements['pause-6'].checked=false;form.onchange({target:elements['pause-6']});assert(elements['breakStart-6'].disabled);assert(!elements['breakStart-6'].required);
 await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(sent.week[6].breakStart,'');assert.equal(sent.week[6].breakEnd,'');assert(validHours(sent.week[6]));
 const copy={dataset:{copyDay:'5'},value:'6'};form.onchange({target:copy});assert.equal(elements['end-5'].value,'14:00');assert.equal(elements['pause-5'].checked,false);assert(elements['breakEnd-5'].disabled);
 elements['pause-6'].checked=true;form.onchange({target:elements['pause-6']});assert(!elements['breakStart-6'].disabled);assert(elements['breakStart-6'].required);
 elements['open-6'].checked=false;form.onchange({target:elements['open-6']});assert(elements['start-6'].disabled);assert(!elements['start-6'].required);
});
test('continuous Saturday accepts 10-14 while invalid enabled breaks remain invalid',()=>{
 const day={open:true,start:'10:00',end:'14:00',breakStart:'',breakEnd:''};assert(validHours(day));assert.deepEqual(intervals({exceptions:{'2026-11-21':day}},'2026-11-21'),[[600,840]]);assert(!validHours({...day,breakStart:'14:00',breakEnd:'15:00'}));assert(!validHours({...day,breakStart:'12:00'}));
});
