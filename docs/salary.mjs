import {validMonth,normalizeDate,localDate} from './core.mjs';
export const WAGE_SOURCE='https://fgb.org.ar/escala-julio-septiembre-2026/';
export const WAGE_IMAGE='https://fgb.org.ar/wp-content/uploads/2026/07/ESCALA-JULIO-SEPTIEMBRE-26.png';
// Values transcribed from the official sector Obra table, column 184 Hs.
// Index zero is unused; categories run from 1 to 10.
export const SCALES=[
 {month:'2026-07',hourly:[null,6183.12,6344.47,6650.55,7093.88,7518.04,8065.87,8733.04,9403.28,10177.41,11073.94],seniority:14362.58},
 {month:'2026-08',hourly:[null,6300.60,6465.02,6776.91,7228.67,7660.88,8219.12,8898.97,9581.94,10370.78,11284.35],seniority:14635.47},
 {month:'2026-09',hourly:[null,6407.71,6574.93,6892.12,7351.55,7791.12,8358.84,9050.25,9744.83,10547.09,11476.18],seniority:14884.27}
];
export function weekdays(month){
 if(!validMonth(month))throw Error('Mes inválido.');
 const[y,m]=month.split('-').map(Number);let total=0;
 for(let day=1;day<=new Date(Date.UTC(y,m,0)).getUTCDate();day++){const w=new Date(Date.UTC(y,m-1,day)).getUTCDay();if(w>0&&w<6)total++}return total;
}
export function serviceYears(hireDate,reference){
 const start=normalizeDate(hireDate),end=normalizeDate(reference);if(start>end)throw Error('La fecha de ingreso es posterior al período calculado.');
 return Number(end.slice(0,4))-Number(start.slice(0,4))-(end.slice(5)<start.slice(5)?1:0);
}
export function salaryEstimate({month,category,hireDate,netMinutes=0,saturdayMinutes=0,lateCount=0,earlyCount=0,hasAttendance=false,today=localDate(),scales=SCALES}){
 if(!validMonth(month)||!Number.isInteger(category)||category<1||category>10)throw Error('Elegí una categoría del 1 al 10.');
 const scale=scales.filter(s=>s.month<=month).sort((a,b)=>a.month.localeCompare(b.month)).at(-1);
 if(!scale)throw Error('Todavía no hay una escala verificada para este mes.');
 for(const n of [netMinutes,saturdayMinutes,lateCount,earlyCount])if(!Number.isFinite(n))throw Error('Los datos de asistencia no son válidos.');
 if(saturdayMinutes<0||lateCount<0||earlyCount<0||!Number.isInteger(lateCount)||!Number.isInteger(earlyCount))throw Error('Los contadores no son válidos.');
 const[y,m]=month.split('-').map(Number),last=`${month}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`;
 const reference=today<last?today:last,years=serviceYears(hireDate,reference),rate=scale.hourly[category],days=weekdays(month);
 const money=n=>Math.round((n+Number.EPSILON)*100)/100;
 const base=money(rate*9*days),eligible=hasAttendance&&lateCount<=4&&earlyCount<=3,presentism=eligible?money(base*.25):0;
 const extra=hasAttendance?money(netMinutes/60*rate*(netMinutes>0?1.5:1)):0;
 const saturdays=hasAttendance?money(saturdayMinutes/60*rate*2):0,seniority=money(scale.seniority*years);
 return {month,scaleMonth:scale.month,source:scale.source||WAGE_SOURCE,image:scale.image||WAGE_IMAGE,method:scale.method||'verified',carried:scale.month!==month,rate,days,years,reference,base,eligible,presentism,extra,saturdays,seniority,seniorityRate:scale.seniority,total:money(base+presentism+extra+saturdays+seniority),hasAttendance,provisional:month>=today.slice(0,7)};
}
