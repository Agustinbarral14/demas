(()=>{
 if(globalThis.__demasReader)return{ready:true};globalThis.__demasReader=true;
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const months={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12};
 const visible=el=>!!el&&!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);
 async function waitFor(fn,ms=22000){const deadline=Date.now()+ms;while(Date.now()<deadline){const found=fn();if(found)return found;await pause(150)}throw Error('Lenox no terminó de cargar. Revisá la pestaña y volvé a sincronizar.');}
 function input(prefix){return [...document.querySelectorAll(`input[id^="${prefix}"]`)].find(visible)}
 function portalReady(){return input('fecha-desde')||document.getElementById('btnSideBarOptionmarcaciones')}
 function dmy(iso){return iso.split('-').reverse().join('-')}
 async function settle(){await waitFor(()=>!document.body.innerText.includes('Cargando marcaciones'),30000);await pause(500)}
 async function setDate(prefix,value){
  const el=input(prefix);if(!el)throw Error('No se encontró el filtro de fechas de Lenox.');if(el.value===value)return;
  // Confirm the editable date as typing + Enter. Calendar popovers depend on
  // animation frames, which Chrome pauses when Lenox is a background tab.
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  setter.call(el,value);
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
  el.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',code:'Enter',bubbles:true}));
  el.blur();
  await pause(1000);await settle();
  await waitFor(()=>input(prefix)?.value===value);
 }
 async function read(from,to){
  if(!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(from)||!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(to)||from>to)throw Error('Período inválido.');
  await waitFor(()=>{if([...document.querySelectorAll('input[type="password"]')].some(visible))throw Error('Iniciá sesión directamente en la pestaña de Lenox y volvé a sincronizar.');return portalReady()});if(!input('fecha-desde')){const button=document.getElementById('btnSideBarOptionmarcaciones');if(!button)throw Error('Iniciá sesión con tu cuenta de Lenox.');button.click();await waitFor(()=>input('fecha-desde'));await settle();}
  await settle();
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const [year,month]=to.split('-').map(Number);const date=new Date(0);date.setFullYear(year,month,0);const until=`${to}-${String(date.getDate()).padStart(2,'0')}`;const since=from+'-01',end=until>today?today:until;if(since>end)return{records:[],markCount:0,from,to,readAt:new Date().toISOString()};
  const oldFrom=input('fecha-desde').value.split('-').reverse().join('-');
  if(end<oldFrom){await setDate('fecha-desde',dmy(since));await setDate('fecha-hasta',dmy(end))}else{await setDate('fecha-hasta',dmy(end));await setDate('fecha-desde',dmy(since))}await settle();
  if(input('fecha-desde').value!==dmy(since)||input('fecha-hasta').value!==dmy(end))throw Error('El período visible de Lenox no coincide con el solicitado.');
  const body=document.body.innerText;const expected=body.match(/\b(\d+)\s+registros?\b/i);const re=/(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\s+(\d{2}:\d{2})\s*·\s*(?:entrada|salida)/gi;
  const marks=[...body.matchAll(re)].map(m=>({date:`${m[3]}-${String(months[m[2].toLowerCase()]).padStart(2,'0')}-${m[1].padStart(2,'0')}`,time:m[4]}));
  if(!expected){if(!marks.length&&/no (?:hay|se encontraron).*marcaciones|sin marcaciones/i.test(body))return{records:[],markCount:0,from,to,readAt:new Date().toISOString()};throw Error('No se pudo verificar la cantidad de registros visibles.');}
  if(marks.length!==Number(expected[1]))throw Error(`Lenox indica ${expected[1]} registros pero solo se pudieron leer ${marks.length}. No se importaron datos incompletos.`);
  if(marks.some(m=>m.date<since||m.date>end))throw Error('El historial todavía muestra datos de otro período. Volvé a sincronizar.');
  const grouped=new Map();for(const mark of marks){if(!grouped.has(mark.date))grouped.set(mark.date,[]);grouped.get(mark.date).push(mark.time)}const records=[...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([date,times])=>{times.sort();return{date,first:times[0],last:times.length>1?times.at(-1):''}});
  return{records,markCount:marks.length,from,to,readAt:new Date().toISOString()};
 }
 chrome.runtime.onMessage.addListener((m,sender,reply)=>{if(sender.id!==chrome.runtime.id||m.source!=='demas-background'||m.action!=='READ')return false;read(m.from,m.to).then(result=>reply({result})).catch(e=>reply({error:e.message}));return true});return{ready:true};
})();

