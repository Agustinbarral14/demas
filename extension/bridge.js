const DEMAS_ORIGIN=location.origin;
const ALLOWED_ORIGINS=new Set(['http://127.0.0.1:43128',"https://agustinbarral14.github.io"]);
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||message?.source!=='demas-popup'||!ALLOWED_ORIGINS.has(DEMAS_ORIGIN)||(DEMAS_ORIGIN!=='http://127.0.0.1:43128'&&!location.pathname.startsWith('/demas/')))return false;
 if(message.action==='STATUS'){reply({theme:document.documentElement.dataset.theme||'light'});return false}
 if(message.action==='THEME'&&['light','dark'].includes(message.theme)){const current=document.documentElement.dataset.theme||'light';if(current!==message.theme)document.getElementById('theme-toggle')?.click();reply({ok:true});return false}
 if(message.action==='SYNC'){const button=document.getElementById('refresh');if(!button||button.disabled){reply({started:false});return false}button.click();reply({started:true});return false}
 return false;
});
window.addEventListener('message',async event=>{
 if((DEMAS_ORIGIN!=='http://127.0.0.1:43128'&&!location.pathname.startsWith('/demas/'))||!ALLOWED_ORIGINS.has(DEMAS_ORIGIN)||event.source!==window||event.origin!==DEMAS_ORIGIN)return;
 const m=event.data;if(!m||m.source!=='demas-page'||m.version!==1||typeof m.requestId!=='string'||m.requestId.length>100||!['HELLO','OPEN','SYNC','HISTORY'].includes(m.action))return;
 try{const reply=await chrome.runtime.sendMessage({action:m.action,from:m.from,to:m.to});window.postMessage({source:'demas-extension',requestId:m.requestId,...reply},DEMAS_ORIGIN)}catch{window.postMessage({source:'demas-extension',requestId:m.requestId,error:'El conector se desconectó. Recargá DeMás después de habilitar la extensión.'},DEMAS_ORIGIN)}
});
