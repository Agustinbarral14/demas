const APP='https://agustinbarral14.github.io/demas/';
const $=id=>document.getElementById(id),extension=!!globalThis.chrome?.runtime?.id;
let theme='light';
function showTheme(value){theme=value==='dark'?'dark':'light';document.documentElement.dataset.theme=theme;const dark=theme==='dark',label=dark?'Cambiar a modo claro':'Cambiar a modo oscuro';$('theme').title=label;$('theme').setAttribute('aria-label',label);$('theme').innerHTML=dark?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 14.3A8.5 8.5 0 0 1 9.7 3.6 8.5 8.5 0 1 0 20.4 14.3Z"/></svg>'}
async function appTab(){const tabs=await chrome.tabs.query({url:APP+'*'});return tabs.find(t=>t.active)||tabs[0]}
async function showTab(tab){if(tab){await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true})}else await chrome.tabs.create({url:APP})}
$('theme').addEventListener('click',async()=>{showTheme(theme==='dark'?'light':'dark');if(!extension){try{localStorage.setItem('demas-popup-preview-theme',theme)}catch{}return}await chrome.storage.local.set({demasTheme:theme});try{const tab=await appTab();if(tab)await chrome.tabs.sendMessage(tab.id,{source:'demas-popup',action:'THEME',theme})}catch{}});
$('open').addEventListener('click',async event=>{if(!extension)return;event.preventDefault();try{await showTab(await appTab());window.close()}catch{$('status').textContent='No se pudo abrir DeMás. Probá nuevamente.'}});
$('sync').addEventListener('click',async()=>{if(!extension)return;$('sync').disabled=true;$('status').textContent='Abriendo la sincronización en DeMás…';try{const tab=await appTab();if(!tab){await showTab();window.close();return}await showTab(tab);const result=await chrome.tabs.sendMessage(tab.id,{source:'demas-popup',action:'SYNC'});if(!result?.started)throw Error();window.close()}catch{$('status').textContent='Recargá DeMás y volvé a pulsar Sincronizar.';$('sync').disabled=false}});
async function init(){
 if(!extension){showTheme(localStorage.getItem('demas-popup-preview-theme')||'light');$('connection').textContent='Vista previa del conector';$('lenox-state').textContent='Lenox · Estado disponible en Chrome';$('status').textContent='Abrí este panel desde la extensión para sincronizar.';return}
 try{const saved=await chrome.storage.local.get(['demasTheme','demasLastSync']);showTheme(saved.demasTheme||'light');const last=saved.demasLastSync;if(last?.at&&Number.isFinite(last.at)){$('last-sync').textContent=new Date(last.at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});$('sync-detail').textContent=Number.isFinite(last.markCount)?`${last.markCount} fichajes leídos`:'Lectura completada'}
 const tabs=await chrome.tabs.query({url:'https://cloud.lenoxhr.com/*'});$('lenox-state').textContent=tabs.length?'Lenox abierta · Usá tu sesión habitual':'Lenox se abrirá al sincronizar';
 const tab=await appTab();if(tab){try{const state=await chrome.tabs.sendMessage(tab.id,{source:'demas-popup',action:'STATUS'});if(state?.theme)showTheme(state.theme)}catch{}}
 $('sync').disabled=false;
 }catch{$('status').textContent='No se pudo comprobar la conexión. Abrí DeMás para continuar.'}
}
init();
