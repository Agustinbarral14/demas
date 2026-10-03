const months=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
export function words(tsv){return tsv.trim().split(/\r?\n/).slice(1).map(line=>{const a=line.split('\t');return {text:a[11]||'',x:+a[6],y:+a[7],w:+a[8],h:+a[9],confidence:+a[10]}}).filter(a=>a.text)}
const cx=a=>a.x+a.w/2,cy=a=>a.y+a.h/2;
export function amount(text,{loose=false}={}){
 let s=text.replace(/^\$/,'');if(!/^[\d.,]+$/.test(s))throw Error('Importe ilegible');
 if(!/[,\.]\d{2}$/.test(s)){if(!loose)throw Error('Faltan centavos');const digits=s.replace(/[.,]/g,'');if(digits.length<5)throw Error('Importe incompleto');s=digits.slice(0,-2)+','+digits.slice(-2)}
 const n=Number(s.slice(0,-3).replace(/[.,]/g,'')+'.'+s.slice(-2));if(!Number.isFinite(n)||n<=0)throw Error('Importe inválido');return n;
}
export function parseScale(headersTsv,valuesTsv,{minimumConfidence=70}={}){
 const headers=words(headersTsv),values=words(valuesTsv),anchors=headers.filter(a=>/^184\s*Hs?\.?$/i.test(a.text));
 if(!anchors.length)throw Error('No se encontró la columna solicitada');
 const scales=[];
 for(const hourlyHeader of anchors){
 const sameRow=a=>Math.abs(cy(a)-cy(hourlyHeader))<25;
 const cat=headers.filter(a=>sameRow(a)&&/^Cat\.?$/i.test(a.text)&&cx(a)<cx(hourlyHeader)).sort((a,b)=>b.x-a.x)[0];
 const monthly=headers.filter(a=>sameRow(a)&&/^Mensual$/i.test(a.text)&&cx(a)>cx(cat||{x:0,w:0})&&cx(a)<cx(hourlyHeader)).at(-1);
 const next=headers.find(a=>sameRow(a)&&/^175Hs?\.?$/i.test(a.text)&&cx(a)>cx(hourlyHeader));
 const last=headers.find(a=>sameRow(a)&&/^150Hs?\.?$/i.test(a.text)&&cx(a)>cx(hourlyHeader));
 if(!cat||!monthly||!next||!last)throw Error('Encabezados de tabla incompletos');
 const left=cat.x-30,right=last.x+last.w+30;
 const titles=headers.filter(a=>months.includes(a.text.toUpperCase())&&cx(a)>left&&cx(a)<right&&a.y<hourlyHeader.y).sort((a,b)=>b.y-a.y);
 const title=titles[0],year=title&&headers.find(a=>/^20\d{2}$/.test(a.text)&&Math.abs(cy(a)-cy(title))<20&&a.x>title.x&&a.x<right);
 if(!title||!year||title.confidence<80||year.confidence<80)throw Error('Mes o año no legible');
 const month=`${year.text}-${String(months.indexOf(title.text.toUpperCase())+1).padStart(2,'0')}`;
 const categories=values.filter(a=>/^(10|[1-9])$/.test(a.text)&&Math.abs(cx(a)-cx(cat))<45&&a.y>hourlyHeader.y).sort((a,b)=>a.y-b.y).slice(0,10);
 if(categories.length!==10||categories.some((a,i)=>Number(a.text)!==10-i))throw Error('Faltan categorías o hay filas fuera de orden');
 const rates=Array(11).fill(null);
 for(const category of categories){
 const row=values.filter(a=>Math.abs(cy(a)-cy(category))<18&&cx(a)>left&&cx(a)<right);
 const rate=row.filter(a=>cx(a)>(cx(monthly)+cx(hourlyHeader))/2&&cx(a)<(cx(hourlyHeader)+cx(next))/2);
 const basic=row.filter(a=>cx(a)>(cx(cat)+cx(monthly))/2&&cx(a)<(cx(monthly)+cx(hourlyHeader))/2);
 if(rate.length!==1||basic.length!==1||rate[0].confidence<minimumConfidence||basic[0].confidence<minimumConfidence)throw Error('Valor de categoría ambiguo o de baja confianza: '+month+' categoría '+category.text);
 const value=amount(rate[0].text,{loose:minimumConfidence===0}),base=amount(basic[0].text,{loose:minimumConfidence===0});
 if(Math.abs(value-base/184)>.02)throw Error('El valor hora no coincide con el básico publicado');
 rates[Number(category.text)]=value;
 }
 for(let i=2;i<=10;i++)if(rates[i]<=rates[i-1])throw Error('Valores de categoría fuera de orden');
 const seniorityLabel=values.filter(a=>/^Antig/i.test(a.text)&&a.x>left&&a.x<right&&a.y>categories.at(-1).y).sort((a,b)=>a.y-b.y)[0];
 if(!seniorityLabel||seniorityLabel.y-categories.at(-1).y>120)throw Error('Antigüedad no encontrada');
 const amounts=values.filter(a=>Math.abs(cy(a)-cy(seniorityLabel))<18&&a.x>seniorityLabel.x&&cx(a)<right&&/^\$?[\d.,]+$/.test(a.text));
 if(amounts.length!==1||amounts[0].confidence<minimumConfidence)throw Error('Antigüedad ambigua');
 scales.push({month,hourly:rates,seniority:amount(amounts[0].text,{loose:minimumConfidence===0})});
 }
 if(new Set(scales.map(s=>s.month)).size!==scales.length)throw Error('Meses duplicados');
 return scales.sort((a,b)=>a.month.localeCompare(b.month));
}
