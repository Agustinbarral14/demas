export const APP_VERSION='0.5.2';
export const MIN_CONNECTOR='0.3.2';
export function compareVersions(a,b){
 const parse=v=>typeof v==='string'&&/^\d+(\.\d+){0,3}$/.test(v)?v.split('.').map(Number):null;
 const x=parse(a),y=parse(b);if(!x||!y)return -1;
 for(let i=0;i<Math.max(x.length,y.length);i++){const diff=(x[i]||0)-(y[i]||0);if(diff)return Math.sign(diff)}return 0;
}
export function reviewReason(row){
 if(row.ongoing)return '';
 if(row.incomplete)return 'Falta el último fichaje. Revisá la jornada en Lenox.';
 if(row.late>=120||row.early>=120)return 'Hay un descuento de al menos 2 horas. Puede ser correcto o faltar un registro; revisalo en Lenox.';
 return '';
}

