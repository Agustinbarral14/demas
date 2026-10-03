const DEMAS_ORIGIN=location.origin;
const ALLOWED_ORIGINS=new Set(['http://127.0.0.1:43128',"https://agustinbarral14.github.io"]);
window.addEventListener('message',async event=>{
 if((DEMAS_ORIGIN!=='http://127.0.0.1:43128'&&!location.pathname.startsWith('/demas/'))||!ALLOWED_ORIGINS.has(DEMAS_ORIGIN)||event.source!==window||event.origin!==DEMAS_ORIGIN)return;
 const m=event.data;if(!m||m.source!=='demas-page'||m.version!==1||typeof m.requestId!=='string'||m.requestId.length>100||!['HELLO','OPEN','SYNC','HISTORY'].includes(m.action))return;
 try{const reply=await chrome.runtime.sendMessage({action:m.action,from:m.from,to:m.to});window.postMessage({source:'demas-extension',requestId:m.requestId,...reply},DEMAS_ORIGIN)}catch{window.postMessage({source:'demas-extension',requestId:m.requestId,error:'El conector se desconectó. Recargá DeMás después de habilitar la extensión.'},DEMAS_ORIGIN)}
});
