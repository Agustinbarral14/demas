// Exportación local: no usa servicios externos ni transmite los fichajes.
export const exportHeaders=['Fecha','Primer fichaje','Último fichaje','Extras (min)','Tardanza (min)','Salida anticipada (min)','Saldo (min)','Sábado (min)','Estado'];
export function exportRows(rows){return rows.map(r=>[r.date,r.first||'',r.last||'',r.before+r.after,r.late,r.early,r.before+r.after-r.late-r.early,r.saturday?r.saturdayMinutes:0,r.hasMarks===false?'Sin fichajes':r.manual?'Corregido manualmente':r.incomplete?'Sin salida':r.pending?'Provisional':'Registrado'])}
const displayDate=s=>s.split('-').reverse().join('/');
export function makeCsv(rows){
 const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
 const values=exportRows(rows).map(row=>[displayDate(row[0]),...row.slice(1)]);
 // Excel reconoce el separador sin depender de la configuración regional.
 return '\uFEFFsep=;\r\n'+[exportHeaders,...values].map(row=>row.map(quote).join(';')).join('\r\n');
}
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const encoder=new TextEncoder();
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function zip(files){
 const parts=[],central=[];let offset=0,size=0;
 const header=n=>{const bytes=new Uint8Array(n);return [bytes,new DataView(bytes.buffer)]};
 for(const [name,content]of Object.entries(files)){
  const filename=encoder.encode(name),data=encoder.encode(content),crc=crc32(data);const [local,v]=header(30);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,filename.length,true);
  parts.push(local,filename,data);const [directory,d]=header(46);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,offset,true);central.push(directory,filename);size+=46+filename.length;offset+=30+filename.length+data.length;
 }
 const [end,v]=header(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length/2,true);v.setUint16(10,central.length/2,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
 const all=[...parts,...central,end],result=new Uint8Array(offset+size+22);let position=0;for(const part of all){result.set(part,position);position+=part.length}return result;
}
export function makeXlsx(rows,summary=null,accountName=''){
 const headers=['Nombre',...exportHeaders],name=typeof accountName==='string'?accountName.trim():'';
 const records=exportRows(rows).map(row=>[name,...row]),last=records.length+1,ref=`A1:J${last}`;
 const stringCell=(col,row,value,style)=>`<c r="${col}${row}" s="${style}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
 const body=records.map((record,index)=>{const row=index+2;return `<row r="${row}" ht="24" customHeight="1">`+record.map((value,col)=>{
  const letter=String.fromCharCode(65+col);
  if(col===1){const serial=(Date.parse(value+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;return `<c r="B${row}" s="2"><v>${serial}</v></c>`}
  return typeof value==='number'?`<c r="${letter}${row}" s="3"><v>${value}</v></c>`:stringCell(letter,row,value,4);
 }).join('')+'</row>'}).join('');
 const types=`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`;
 const relation=(target,type,id='rId1')=>`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
 const relationships=entries=>`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries}</Relationships>`;
 const styles=`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><color rgb="FF202D2B"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF163C32"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD4DED8"/></left><right style="thin"><color rgb="FFD4DED8"/></right><top style="thin"><color rgb="FFD4DED8"/></top><bottom style="thin"><color rgb="FFD4DED8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 const files={
  '[Content_Types].xml':types,
  '_rels/.rels':relationships(relation('xl/workbook.xml','officeDocument')),
  'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Fichajes" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':relationships(relation('worksheets/sheet1.xml','worksheet')+relation('styles.xml','styles','rId2')),
  'xl/styles.xml':styles,
  'xl/worksheets/sheet1.xml':`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${ref}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="15" customWidth="1"/><col min="3" max="6" width="19" customWidth="1"/><col min="7" max="7" width="27" customWidth="1"/><col min="8" max="10" width="19" customWidth="1"/></cols><sheetData><row r="1" ht="36" customHeight="1">${headers.map((h,i)=>stringCell(String.fromCharCode(65+i),1,h,1)).join('')}</row>${body}</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`,
  'xl/worksheets/_rels/sheet1.xml.rels':relationships(relation('../tables/table1.xml','table')),
  'xl/tables/table1.xml':`<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Fichajes" displayName="Fichajes" ref="${ref}" totalsRowShown="0"><autoFilter ref="${ref}"/><tableColumns count="10">${headers.map((h,i)=>`<tableColumn id="${i+1}" name="${xml(h)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleMedium4" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`
 };
 if(summary){
  const entries=[['Extras según fichajes (min)',summary.calculatedExtra],['Ajuste manual del mes (min)',summary.adjustment],['Horas extras sin descuentos (min)',summary.extra],['Tardanzas (min)',summary.late],['Salidas anticipadas (min)',summary.early],['Saldo de horas (min)',summary.net],['Horas de sábados por separado (min)',summary.saturday]];
  files['[Content_Types].xml']=files['[Content_Types].xml'].replace('</Types>','<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  files['xl/workbook.xml']=files['xl/workbook.xml'].replace('</sheets>','<sheet name="Resumen" sheetId="2" r:id="rId3"/></sheets>');
  files['xl/_rels/workbook.xml.rels']=relationships(relation('worksheets/sheet1.xml','worksheet')+relation('styles.xml','styles','rId2')+relation('worksheets/sheet2.xml','worksheet','rId3'));
  files['xl/worksheets/sheet2.xml']=`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="42" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/></cols><sheetData><row r="1">${stringCell('A',1,'Concepto',1)}${stringCell('B',1,'Minutos',1)}</row>${entries.map(([label,value],i)=>`<row r="${i+2}">${stringCell('A',i+2,label,4)}<c r="B${i+2}" s="3"><v>${Number(value)||0}</v></c></row>`).join('')}</sheetData></worksheet>`;
 }
 return zip(files);
}
