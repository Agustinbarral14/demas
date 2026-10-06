import {parseMarks,calculate,validMonth,localDate} from './core.mjs';
export function mergeCorrections(records,corrections={},today=localDate()){
 const merged=new Map(records.map(r=>[r.date,{...r}]));
 for(const [date,value] of Object.entries(corrections)){
  if(!value||typeof value.first!=='string'||typeof value.last!=='string')throw Error('Corrección inválida.');
  if(!value.first&&!value.last){merged.delete(date);continue}
  const [record]=parseMarks(`${date};${value.first};${value.last}`,today);
  merged.set(date,{...record,manual:true});
 }
 return [...merged.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function monthCalculation(records,corrections,month,start,end,override=null,now=new Date()){
 if(!validMonth(month))throw Error('Mes inválido.');
 const result=calculate(mergeCorrections(records,corrections,localDate(now)),month,month,start,end,now);
 const calculatedExtra=result.totals.extra;
 if(override!==null&&(!Number.isInteger(override)||override<0||override>60000))throw Error('Las horas extra deben estar entre 0 y 1.000 horas.');
 if(override!==null){result.totals.extra=override;result.totals.net=override-result.totals.late-result.totals.early}
 result.totals.calculatedExtra=calculatedExtra;result.totals.adjustment=result.totals.extra-calculatedExtra;
 result.manualExtra=override!==null;return result;
}
export function paymentBalance(total,paid){
 if(!Number.isFinite(total)||!Number.isFinite(paid)||paid<0||paid>1000000000)throw Error('Ingresá un importe válido.');
 return Math.round((total-paid+Number.EPSILON)*100)/100;
}
