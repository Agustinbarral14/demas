const SITES=new Set(['http://127.0.0.1:43128',"https://agustinbarral14.github.io"]),LENOX='https://cloud.lenoxhr.com';const locks=new Set();
function allowedPage(url){try{const u=new URL(url);return SITES.has(u.origin)&&(u.origin==='http://127.0.0.1:43128'||u.pathname.startsWith('/demas/'))}catch{return false}}
const validMonth=s=>typeof s==='string'&&/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(s);
async function linkedTab(sourceId,activate=false){const key=`lenox-${sourceId}`;const entry=(await chrome.storage.session.get(key))[key];let tab;if(entry){try{tab=await chrome.tabs.get(entry);if(new URL(tab.url).origin!==LENOX)tab=null}catch{}}
 if(!tab){tab=await chrome.tabs.create({url:LENOX+'/mobile/marcaciones',active:true});await chrome.storage.session.set({[key]:tab.id})}else if(activate)await chrome.tabs.update(tab.id,{active:true});return tab;
}
async function loaded(tabId){const deadline=Date.now()+25000;while(Date.now()<deadline){const tab=await chrome.tabs.get(tabId);if(tab.status==='complete')return tab;await new Promise(r=>setTimeout(r,250))}throw Error('Lenox tardó en abrir. Esperá a que cargue y volvé a sincronizar.')}
async function reloadComplete(tabId){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{chrome.tabs.onUpdated.removeListener(listener);reject(Error('Lenox tardó en recargar. Volvé a sincronizar.'))},25000);const listener=(id,info)=>{if(id===tabId&&info.status==='complete'){clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);resolve()}};chrome.tabs.onUpdated.addListener(listener);chrome.tabs.reload(tabId).catch(e=>{clearTimeout(timer);chrome.tabs.onUpdated.removeListener(listener);reject(e)})})}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{if(!sender.tab||sender.frameId!==0||!sender.url||!allowedPage(sender.url)){reply({error:'Origen no autorizado.'});return false}
 (async()=>{const id=sender.tab.id;if(m.action==='HELLO')return{version:'0.2.0'};if(m.action==='OPEN'){await linkedTab(id,true);return{opened:true}}if(m.action!=='SYNC')throw Error('Acción no permitida.');if(!validMonth(m.from)||!validMonth(m.to)||m.from>m.to)throw Error('El rango de meses es inválido.');if(locks.has(id))throw Error('Ya hay una lectura en curso.');locks.add(id);try{
 const tab=await linkedTab(id);await loaded(tab.id);await reloadComplete(tab.id);const fresh=await chrome.tabs.get(tab.id);if(new URL(fresh.url).origin!==LENOX){await chrome.tabs.update(tab.id,{active:true});throw Error('Iniciá sesión directamente en Lenox y volvé a DeMás.');}
 const injected=await chrome.scripting.executeScript({target:{tabId:tab.id},files:['lenox-reader.js']});
 const result=injected?.[0]?.result;if(!result?.ready)throw Error('No se pudo preparar la lectura en Lenox.');
 const output=await chrome.tabs.sendMessage(tab.id,{source:'demas-background',action:'READ',from:m.from,to:m.to});if(output.error)throw Error(output.error);return output.result;
 }finally{locks.delete(id)}})().then(result=>reply({result})).catch(error=>reply({error:error.message||'No se pudo leer Lenox.'}));return true;
});

