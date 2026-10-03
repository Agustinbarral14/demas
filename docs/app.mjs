import {salaryEstimate,WAGE_SOURCE,WAGE_IMAGE} from './salary.mjs?v=0.4.3';
import {registeredMonths,neighboringMonth,monthDays} from './calendar.mjs?v=0.4.3';
import {makeXlsx} from './export.mjs?v=0.4.3';
import {APP_VERSION,MIN_CONNECTOR,compareVersions,reviewReason} from './release.mjs?v=0.4.3';
const RESUME_KEY='demas-update-resume';let connectorVersion=null,releaseInfo=null;
import {monthNames,validMonth,minutes,localDate,parseMarks,calculate,automaticSyncDue} from './core.mjs?v=0.4.3';
const $=id=>document.getElementById(id);let data=[],active='all',start=540,end=1080,rows=[],totals={},saturday={},source='empty',loadedAt=null,bridge=false,busy=false,connected=false,requestNumber=0;const requests=new Map();
const monthLabel=v=>{const[y,m]=v.split('-');return `${monthNames[+m]} ${+y}`};const dateLabel=d=>d.split('-').reverse().join('/');
const duration=(n,sign='')=>`${n>0?sign:''}${Math.floor(Math.abs(n)/60)}<span class="unit"> h </span>${String(Math.abs(n)%60).padStart(2,'0')}<span class="unit"> min</span>`;const plain=n=>`${Math.floor(Math.abs(n)/60)} h ${String(Math.abs(n)%60).padStart(2,'0')} min`;const count=n=>`${n} ${n===1?'vez':'veces'}`;
function status(text){$('data-status').textContent=text}
function setMonth(value){$('from').value=value;$('to').value=value;const select=$('month-select');if(![...select.options].some(o=>o.value===value)){const option=new Option(monthLabel(value),value);select.add(option,0)}select.value=value;}
function renderMonths(){
 const selected=$('from').value,current=localDate().slice(0,7),months=registeredMonths(data).reverse();
 $('month-select').replaceChildren(...months.map(m=>new Option(monthLabel(m),m)));$('month-select').value=months.includes(selected)?selected:'';
 $('month-button').textContent=monthLabel(selected);$('month-menu').replaceChildren();$('month-button').disabled=!months.length;
 $('previous-month').disabled=!neighboringMonth(selected,-1,data);$('next-month').disabled=!neighboringMonth(selected,1,data);
 $('current-month').setAttribute('aria-pressed',String(selected===current));
 let year='';for(const m of months){if(year!==m.slice(0,4)){year=m.slice(0,4);const label=document.createElement('div');label.className='month-year';label.textContent=year;$('month-menu').append(label)}const button=document.createElement('button');button.type='button';button.textContent=monthNames[+m.slice(5)]+(m===current?' · Actual':'');button.setAttribute('aria-pressed',String(m===$('month-select').value));button.addEventListener('click',()=>{setMonth(m);setFilter('all');compute();renderMonths();closeMonths()});$('month-menu').append(button)}
}
function closeMonths(){$('month-menu').hidden=true;$('month-button').setAttribute('aria-expanded','false')}
$('month-button').addEventListener('click',()=>{const open=$('month-menu').hidden;$('month-menu').hidden=!open;$('month-button').setAttribute('aria-expanded',String(open))});
document.addEventListener('click',e=>{if(!e.target.closest('.month-picker'))closeMonths()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMonths()});
$('month-select').addEventListener('change',()=>{setMonth($('month-select').value);setFilter('all');compute();renderMonths()});
function currentMonth(){const value=localDate().slice(0,7);setMonth(value);active='all';renderMonths();compute();setFilter('all')}
function setFilter(value,scroll=false){active=value;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===active)));renderTable();if(scroll)$('details').open=true;if(scroll)$('details').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'})}
function compute(){if(!validMonth($('from').value)||!validMonth($('to').value))return;({rows,totals,saturday}=calculate(data,$('from').value,$('to').value,start,end));render()}
function render(){const from=$('from').value,to=$('to').value,has=rows.length>0,lateN=rows.filter(r=>r.late>0).length,earlyN=rows.filter(r=>r.early>0).length;
 $('saturday-value').innerHTML=has?duration(saturday.minutes):'—';$('saturday-count').textContent=(saturday.days||0)+' '+(saturday.days===1?'sábado':'sábados')+(saturday.pending?' · '+saturday.pending+' pendiente(s)':'');
 $('saturday-rows').innerHTML=rows.filter(r=>r.saturday).map(r=>'<tr><td>'+dateLabel(r.date)+'</td><td>'+r.first+'</td><td>'+(r.last||'Pendiente')+'</td><td>'+plain(r.saturdayMinutes)+(r.pending?' · Provisional':'')+'</td></tr>').join('');
 $('period-title').textContent=from===to?monthLabel(from):`${monthLabel(from)} a ${monthLabel(to)}`;
 $('coverage').textContent=has?`${rows.length} ${rows.length===1?'día registrado':'días registrados'}${rows.some(r=>r.ongoing)?' · Hoy, en curso':''}`:source==='lenox'?'Lenox no muestra marcaciones en el período consultado.':'No hay marcaciones cargadas para este período.';
 for(const[id,n,sign]of[['extra-value',totals.extra,'+'],['late-value',totals.late,'−'],['early-value',totals.early,'−']])$(id).innerHTML=has?duration(n,sign):'—';
 $('net-value').innerHTML=has?`${totals.net>0?'+':totals.net<0?'−':''}${duration(Math.abs(totals.net))}`:'—';$('net-value').style.color=totals.net<0?'#ffadb6':'#94f1bd';
 $('before-label').innerHTML=`Antes de las ${$('start').value}<b>${has?plain(totals.before):'—'}</b>`;$('after-label').innerHTML=`Después de las ${$('end').value}<b>${has?plain(totals.after):'—'}</b>`;
 $('late-caption').textContent=`Después de las ${$('start').value}`;$('early-caption').textContent=`Antes de las ${$('end').value}`;$('schedule-label').textContent=`${$('start').value} a ${$('end').value}`;
 $('late-count').textContent=has?count(lateN):'—';$('early-count').textContent=has?count(earlyN):'—';$('all-count').textContent=rows.length;$('tab-late-count').textContent=lateN;$('tab-early-count').textContent=earlyN;
 const chartRows=monthDays(from,rows),scale=Math.max(70,...chartRows.map(r=>Math.max(r.saturday?r.saturdayMinutes:r.before+r.after,r.early+r.late)));
 $('chart').style.gridTemplateColumns=`repeat(${chartRows.length},minmax(24px,1fr))`;
 $('chart').innerHTML=chartRows.map(r=>{const extra=r.saturday?r.saturdayMinutes:r.before+r.after;
 const text=!r.hasMarks?`${dateLabel(r.date)} · Sin fichajes. No se calcularon minutos extras.`:`${dateLabel(r.date)} · ${extra} minutos extras${r.saturday?' de sábado, por separado':''} · ${r.late} minutos tarde · ${r.early} minutos de salida anticipada${r.pending?' · Provisional':''}`;
 return `<div class="day${r.hasMarks?'':' no-marks'}" tabindex="0" title="${text}" aria-label="${text}" data-tooltip="${text}"><div class="positive"><div class="bar" style="height:${extra/scale*84}px;${r.saturday?'background:#8971ca':''}"></div></div><div class="negative"><div class="bar" style="height:${(r.late+r.early)/scale*84}px;background:${r.late?'#c83d54':'#db7b31'}"></div></div><div class="day-label">${Number(r.date.slice(8))}</div></div>`}).join('');
 document.querySelectorAll('.negative').forEach(el=>el.style.height=`${Math.max(20,...chartRows.map(r=>(r.late+r.early)/scale*84))}px`);
 $('chart-foot').classList.toggle('hidden',!has);$('clear-data').classList.toggle('hidden',!data.length);renderTable();renderEnhancements();renderSalary();
}
function renderTable(){const visible=rows.filter(r=>active==='all'||r[active]>0);const columns=active==='all'?['Fecha','Primer fichaje','Último fichaje','Extras','Tarde','Salida anticipada']:active==='late'?['Fecha','Hora de llegada','Horario esperado','Tiempo tarde']:['Fecha','Último fichaje','Horario esperado','Tiempo anticipado'];$('thead').innerHTML=`<tr>${columns.map(c=>`<th scope="col">${c}</th>`).join('')}</tr>`;
 $('tbody').innerHTML=visible.map(r=>{const date=dateLabel(r.date)+reviewMarkup(r);const cells=active==='all'?[date,r.first,r.last||'Pendiente',r.saturday?'<span class="caption">Sábado · por separado</span>':`<span class="green">+${plain(r.before+r.after)}</span>`,r.late?`<span class="event late">−${plain(r.late)}</span>`:'—',r.pending?'<span class="caption">En revisión</span>':r.early?`<span class="event">−${plain(r.early)}</span>`:'—']:active==='late'?[date,r.first,$('start').value,`<span class="event late">−${plain(r.late)}</span>`]:[date,r.last,$('end').value,`<span class="event">−${plain(r.early)}</span>`];return `<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`}).join('');$('table').classList.toggle('hidden',!visible.length);$('empty').classList.toggle('hidden',!!visible.length);$('empty').innerHTML=!rows.length?'<strong>Sin marcaciones disponibles</strong><p>Conectá Lenox para consultar este mes.</p>':active==='late'?'<strong>No hubo llegadas tarde</strong><p>Los primeros fichajes están dentro del horario de referencia.</p>':'<strong>No hay salidas anticipadas confirmadas</strong><p>Hoy y los días sin último fichaje siguen pendientes.</p>';
}
for(const id of['from','to'])$(id).addEventListener('change',()=>{if(!validMonth($(id).value)){ $(id).reportValidity();return }if(!validMonth($('from').value)||!validMonth($('to').value))return;if($('from').value>$('to').value)$(id==='from'?'to':'from').value=$(id).value;compute();if(connected)sync()});
for(const id of['start','end'])$(id).addEventListener('change',()=>{try{const a=minutes($('start').value),b=minutes($('end').value);if(b<=a)throw Error();start=a;end=b;$('schedule-error').classList.add('hidden');compute()}catch{$('schedule-error').classList.remove('hidden')}});
$('current-month').addEventListener('click',()=>{currentMonth();if(connected)sync()});document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));$('late-link').addEventListener('click',()=>setFilter('late',true));$('early-link').addEventListener('click',()=>setFilter('early',true));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));$('connect').addEventListener('click',()=>{$('connection-dialog').showModal();callBridge('HELLO',{},2500).then(()=>{bridge=true;$('extension-state').textContent='Conector detectado en Chrome.'}).catch(()=>{$('extension-state').textContent='Instalá el conector en Chrome para conectar tu sesión.'})});
$('clear-data').addEventListener('click',()=>{data=[];source='empty';connected=false;loadedAt=null;try{sessionStorage.removeItem(RESUME_KEY)}catch{}$('source-title').textContent='Tus marcaciones, tu cuenta.';status('Lectura vaciada. No se modificaron fichajes en Lenox.');currentMonth()});
function callBridge(action,payload={},timeout=180000){const requestId=`${Date.now()}-${++requestNumber}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{requests.delete(requestId);reject(Error('No respondió el conector. Verificá que esté instalado en Chrome y que Lenox esté abierto.'))},timeout);requests.set(requestId,{resolve,reject,timer});window.postMessage({source:'demas-page',version:1,requestId,action,...payload},location.origin)})}
window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin||event.data?.source!=='demas-extension')return;const message=event.data,request=requests.get(message.requestId);if(!request)return;clearTimeout(request.timer);requests.delete(message.requestId);if(message.error)request.reject(Error(message.error));else request.resolve(message.result)});
$('open-lenox').addEventListener('click',async()=>{try{await callBridge('OPEN',{},5000);bridge=true;$('extension-state').textContent='Lenox está abierto. Iniciá sesión allí y después pulsá Sincronizar.'}catch(e){$('extension-state').textContent=e.message}});
$('sync-lenox').addEventListener('click',()=>sync(true,true));$('refresh').addEventListener('click',()=>sync(false,true));
async function sync(fromDialog=false,full=false){
 if(busy)return;busy=true;$('refresh').disabled=true;status('Leyendo tu historial de Lenox…');if(fromDialog)$('extension-state').textContent='Leyendo tu historial…';
 try{const hello=await callBridge('HELLO',{},2500);connectorVersion=hello.version;updateConnectorNotice();if(compareVersions(connectorVersion,releaseInfo?.minimumConnectorVersion||MIN_CONNECTOR)<0)throw Error('Actualizá el conector desde Mi conexión para leer el historial completo.');
 const firstConnection=!connected&&source==='empty',history=full||!connected,current=localDate().slice(0,7);const result=await callBridge(history?'HISTORY':'SYNC',history?{}:{from:current,to:current});if(!Array.isArray(result.records))throw Error('El conector devolvió una respuesta inesperada.');
 const incoming=result.records.length?parseMarks(result.records.map(r=>r.date+';'+r.first+';'+(r.last||'')).join('\n')):[];data=history?incoming:[...data.filter(r=>r.date.slice(0,7)!==current),...incoming];
 source='lenox';connected=true;bridge=true;loadedAt=new Date();$('source-title').textContent='Tu sesión de Lenox';status('Actualizado '+loadedAt.toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+' · '+result.markCount+' fichajes');if(firstConnection&&data.length&&!data.some(r=>r.date.slice(0,7)===$('from').value))setMonth(registeredMonths(data).at(-1));renderMonths();compute();if(fromDialog)$('connection-dialog').close();
 }catch(e){status('No se pudo actualizar: '+e.message+(loadedAt?' Se conserva la última lectura.':''));if(fromDialog)$('extension-state').textContent=e.message}
 finally{busy=false;$('refresh').disabled=false}
}
let lastAutomaticAttempt=0;
function automaticSync(){const now=new Date();if(document.hidden||!connected||busy||!automaticSyncDue(now,Math.max(lastAutomaticAttempt,loadedAt?.getTime()||0)))return;lastAutomaticAttempt=now.getTime();sync()}
setInterval(automaticSync,60000);
document.addEventListener('visibilitychange',automaticSync);
$('timezone-note').textContent=`Fechas y horarios según tu navegador: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. No se interpretan como horas extras aprobadas por tu empleador.`;
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'set_month',title:'Seleccionar mes',description:'Selecciona un mes y año. No sincroniza Lenox ni transmite datos.',inputSchema:{type:'object',properties:{month:{type:'string'}},required:['month'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||!validMonth(input.month))throw Error('Mes inválido');setMonth(input.month);compute();return{days:rows.length,...totals}}})).catch(()=>{})}catch{}}
setupSalary();restoreSession();
function renderTheme(){const dark=document.documentElement.dataset.theme==='dark',button=$('theme-toggle'),label=dark?'Cambiar a modo claro':'Cambiar a modo oscuro';button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',label);button.title=label;button.innerHTML=dark?'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.4 14.3A8.5 8.5 0 0 1 9.7 3.6 8.5 8.5 0 1 0 20.4 14.3Z"/></svg>'}
$('theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('demas-theme',theme)}catch{}renderTheme()});renderTheme();
$('details').querySelector('summary').addEventListener('click',()=>{if(!$('details').open)setFilter('all')});
callBridge('HELLO',{},2500).then(hello=>{bridge=true;connectorVersion=hello.version;updateConnectorNotice();sync()}).catch(()=>{if(data.length)status('Lectura conservada. El conector no respondió; abrí Mi conexión para volver a sincronizar.')});

function reviewMarkup(row){const reason=reviewReason(row);return reason?`<details class="review-detail"><summary>Revisá este día</summary><p>${reason}</p><p>Primer fichaje: ${row.first}<br>Último fichaje: ${row.last||'No disponible'}</p><p>El conector entrega el primer y último fichaje, no los registros intermedios. Este aviso no cambia el cálculo.</p></details>`:''}
function setupSalary(){
 $('salary-category').replaceChildren(new Option('Elegí tu categoría',''),...Array.from({length:10},(_,i)=>new Option('Categoría '+(i+1),String(i+1))));
 $('salary-hire').max=localDate();
 try{const saved=JSON.parse(localStorage.getItem('demas-salary-settings')||'null');if(saved){$('salary-category').value=String(saved.category||'');$('salary-hire').value=saved.hireDate||''}}catch{}
 for(const id of ['salary-category','salary-hire'])$(id).addEventListener('change',()=>{try{localStorage.setItem('demas-salary-settings',JSON.stringify({category:$('salary-category').value,hireDate:$('salary-hire').value}))}catch{}renderSalary()});
 $('salary-open').addEventListener('click',()=>{$('salary-panel').showModal()});
 $('salary-source').href=WAGE_SOURCE;$('salary-table').href=WAGE_IMAGE;
 fetch(new URL('./fgb-status.json?t='+Date.now(),location.href),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(info=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(info.checkedAt))return;
 $('salary-source-check').textContent=info.needsVerification?'FGB publicó cambios: la escala cargada necesita revisión. Última comprobación: '+dateLabel(info.checkedAt)+'.':'Fuente FGB comprobada el '+dateLabel(info.checkedAt)+'. Se revisan nuevas publicaciones una vez al día.';
 if(info.needsVerification)$('salary-source-check').classList.add('red');
 }).catch(()=>{$('salary-source-check').textContent='No se pudo comprobar si FGB publicó una escala nueva. Revisá Nuevas paritarias.'});
}
function renderSalary(){
 const category=Number($('salary-category').value),hireDate=$('salary-hire').value;
 $('salary-result').hidden=true;
 if(!category||!hireDate){$('salary-status').textContent='Elegí tu categoría y fecha de ingreso para calcular.';return}
 try{
 const lateCount=rows.filter(r=>!r.saturday&&r.late>0).length,earlyCount=rows.filter(r=>!r.saturday&&r.early>0).length;
 const r=salaryEstimate({month:$('from').value,category,hireDate,netMinutes:totals.net||0,saturdayMinutes:saturday.minutes||0,lateCount,earlyCount,hasAttendance:source==='lenox'&&rows.length>0});
 const money=n=>n.toLocaleString('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2});
 $('salary-result').hidden=false;$('salary-total').textContent=money(r.total);$('salary-total-label').textContent=r.hasAttendance?'Sueldo bruto estimado':'Subtotal sin asistencia';
 $('salary-month').textContent=monthLabel(r.month);$('salary-scale').textContent=(r.carried?'Última escala verificada: ':'Escala: ')+monthLabel(r.scaleMonth)+' · 184 hs';
 $('salary-rate').textContent=money(r.rate)+' / h';
 const entries=[['Sueldo base',`9 h × ${r.days} días de lunes a viernes`,r.base],['Presentismo · 25%',!r.hasAttendance?'Falta leer las marcaciones':`${lateCount} llegadas tarde · ${earlyCount} salidas anticipadas${!r.eligible?' · No corresponde':r.provisional?' · Provisional':' · Corresponde'}`,r.presentism],[r.extra<0?'Descuento de saldo':'Saldo de horas extra',r.hasAttendance?`${totals.net<0?'−':''}${plain(totals.net||0)} × hora${totals.net>0?' × 1,5':''}`:'Falta leer las marcaciones',r.extra],['Horas extra de sábados',r.hasAttendance?`${plain(saturday.minutes||0)} × hora × 2`:'Falta leer las marcaciones',r.saturdays],['Antigüedad',`${r.years} años completos × ${money(r.seniorityRate)}`,r.seniority]];
 $('salary-breakdown').replaceChildren(...entries.map(([label,note,value])=>{const div=document.createElement('div');div.className='salary-line';const description=document.createElement('span'),b=document.createElement('b'),small=document.createElement('small'),amount=document.createElement('strong');b.textContent=label;small.textContent=note;amount.textContent=money(value);if(value<0)amount.className='red';description.append(b,small);div.append(description,amount);return div}));
 const notes=[];if(!r.hasAttendance)notes.push('Sin marcaciones: presentismo y extras no están incluidos.');else if(r.provisional)notes.push('Mes en curso: base del mes completo y fichajes leídos hasta ahora; presentismo provisional.');
 if(rows.some(x=>x.pending||reviewReason(x)))notes.push('Hay fichajes en curso o para revisar; pueden cambiar el importe.');
 if(r.carried)notes.push('Se mantiene la última escala cargada. Una nueva publicación de FGB debe verificarse antes de usar sus importes.');
 notes.push('Antigüedad al '+dateLabel(r.reference)+'. Estimación según tus reglas, sin aportes, retenciones ni otros conceptos.');
 $('salary-status').textContent=notes.join(' ');
 }catch(e){$('salary-status').textContent=e.message}
}
function renderEnhancements(){
 const has=rows.length>0;
 $('net-formula').textContent=has?`${plain(totals.extra)} extra − ${plain(totals.late)} tarde − ${plain(totals.early)} salida anticipada = ${totals.net<0?'−':totals.net>0?'+':''}${plain(totals.net)}`:'';
 $('saturday-card').hidden=!saturday.days;$('saturday-empty').hidden=!!saturday.days;
 const reviewCount=rows.filter(r=>reviewReason(r)).length;
 $('review-note').textContent=reviewCount?`${reviewCount} ${reviewCount===1?'día para revisar':'días para revisar'}. Se señalan fichajes sin salida y descuentos de 2 horas o más; pueden ser correctos. El saldo conserva las reglas habituales.`:'El detalle usa el primer y último fichaje de cada día.';
 $('export-excel').disabled=!has;
 $('clear-data').title='Vacía la lectura de esta pestaña y pausa la sincronización. No borra ni modifica fichajes en Lenox.';
}
function shiftMonth(delta){const value=neighboringMonth($('from').value,delta,data);if(!value)return;setMonth(value);setFilter('all');compute();renderMonths()}
$('previous-month').addEventListener('click',()=>shiftMonth(-1));$('next-month').addEventListener('click',()=>shiftMonth(1));
function downloadExport(content,type,extension){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=`demas-${$('from').value}.${extension}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('export-excel').addEventListener('click',()=>downloadExport(makeXlsx(rows),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx'));
function showChartTooltip(event){const day=event.target.closest('.day');if(!day)return;const tooltip=$('chart-tooltip');tooltip.textContent=day.dataset.tooltip;tooltip.hidden=false;const box=day.getBoundingClientRect();tooltip.style.left=Math.max(12,Math.min(box.left+box.width/2-150,innerWidth-312))+'px';tooltip.style.top=Math.max(12,box.top-64)+'px'}
$('chart').addEventListener('pointerover',showChartTooltip);$('chart').addEventListener('focusin',showChartTooltip);
$('chart').addEventListener('pointerleave',()=>{$('chart-tooltip').hidden=true});$('chart').addEventListener('focusout',()=>{$('chart-tooltip').hidden=true});
window.addEventListener('scroll',()=>{$('chart-tooltip').hidden=true},{passive:true});
function restoreSession(){
 currentMonth();
 try{const raw=sessionStorage.getItem(RESUME_KEY);if(!raw)return;sessionStorage.removeItem(RESUME_KEY);const saved=JSON.parse(raw);if(!saved||Date.now()-saved.savedAt>30*60*1000||!Array.isArray(saved.data))return;
 data=saved.data.length?parseMarks(saved.data.map(r=>r.date+';'+r.first+';'+(r.last||'')).join('\n')):[];
 if(saved.start&&saved.end&&minutes(saved.end)>minutes(saved.start)){start=minutes(saved.start);end=minutes(saved.end);$('start').value=saved.start;$('end').value=saved.end}
 source=data.length?'lenox':'empty';loadedAt=saved.loadedAt?new Date(saved.loadedAt):null;
 if(validMonth(saved.month))setMonth(saved.month);renderMonths();compute();setFilter(['all','late','early'].includes(saved.active)?saved.active:'all');$('details').open=!!saved.detailsOpen;
 if(data.length){$('source-title').textContent='Última lectura de Lenox';status('Lectura conservada al actualizar. '+(loadedAt?'Actualizado '+loadedAt.toLocaleString('es-AR')+'. ':'')+'Verificando conexión…')}
 }catch{status('No se pudo recuperar la lectura. Volvé a sincronizar con Lenox.')}
}
function updateConnectorNotice(){
 const required=releaseInfo?.minimumConnectorVersion||MIN_CONNECTOR;
 const old=connectorVersion!==null&&compareVersions(connectorVersion,required)<0;
 $('connector-update').hidden=!old;
 $('connector-update-description').textContent=old?`Tenés la versión ${connectorVersion||'desconocida'}. Necesitás la ${required}. Descargá el ZIP nuevo, reemplazá los archivos de la carpeta y recargá la extensión en Chrome.`:'';
}
$('connector-help').addEventListener('click',()=>$('connect').click());
let lastReleaseCheck=0,checkingRelease=false,dismissedVersion='';
async function checkRelease(){
 if(document.hidden||checkingRelease||Date.now()-lastReleaseCheck<60000)return;
 checkingRelease=true;lastReleaseCheck=Date.now();
 try{const response=await fetch(new URL(`./version.json?t=${Date.now()}`,location.href),{cache:'no-store'});if(!response.ok)return;const info=await response.json();if(typeof info.version!=='string'||!/^\d+(\.\d+){0,3}$/.test(info.version))return;
 if(info.minimumConnectorVersion&&!/^\d+(\.\d+){0,3}$/.test(info.minimumConnectorVersion))return;releaseInfo=info;
 $('update-description').textContent=typeof info.message==='string'?info.message.slice(0,400):'Hay una nueva versión disponible.';
 $('web-update').hidden=compareVersions(info.version,APP_VERSION)<=0||dismissedVersion===info.version;updateConnectorNotice();
 }catch{/* Una falla de red no interrumpe los fichajes. */}finally{checkingRelease=false}
}
$('update-later').addEventListener('click',()=>{dismissedVersion=releaseInfo?.version||'';$('web-update').hidden=true});
$('update-now').addEventListener('click',()=>{
 $('update-error').hidden=true;if(busy){$('update-error').textContent='Esperá a que termine la lectura de Lenox y volvé a pulsar Actualizar ahora.';$('update-error').hidden=false;return}
 try{sessionStorage.setItem(RESUME_KEY,JSON.stringify({savedAt:Date.now(),data,month:$('from').value,start:$('start').value,end:$('end').value,active,detailsOpen:$('details').open,loadedAt:loadedAt?.toISOString()}))}
 catch{$('update-error').textContent='No se pudo conservar la lectura. La página no se recargó. Exportá el Excel antes de volver a abrir DeMás.';$('update-error').hidden=false;return}
 location.reload();
});
setInterval(checkRelease,5*60*1000);document.addEventListener('visibilitychange',checkRelease);checkRelease();

