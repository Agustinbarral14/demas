export function registeredMonths(records){return [...new Set(records.map(r=>r.date.slice(0,7)))].sort()}
export function neighboringMonth(month,delta,records){const months=registeredMonths(records);return delta<0?months.filter(m=>m<month).at(-1)||null:months.find(m=>m>month)||null}
export function monthDays(month,records){
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate(),byDate=new Map(records.map(r=>[r.date,r]));
 return Array.from({length:days},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`,record=byDate.get(date);return record?{...record,hasMarks:true}:{date,hasMarks:false,before:0,after:0,late:0,early:0,saturdayMinutes:0}});
}
