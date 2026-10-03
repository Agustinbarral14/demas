import {createWorker} from 'tesseract.js';
import sharp from 'sharp';
import {parseScale} from './fgb-parser.mjs';
const path=process.argv[2];if(!path)throw Error('Falta imagen de escala');
const original=await sharp(path).resize({width:3200}).png().toBuffer();
const {data,info}=await sharp(path).resize({width:3200}).greyscale().threshold(180).raw().toBuffer({resolveWithObject:true});
const {width:w,height:h}=info,clean=Buffer.from(data);
// Remove long straight table rules for OCR; preserve the source for headers.
for(let y=0;y<h;y++){let a=-1;for(let x=0;x<=w;x++){const black=x<w&&data[y*w+x]===0;if(black&&a<0)a=x;if(!black&&a>=0){if(x-a>100)for(let xx=a;xx<x;xx++)for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)clean[yy*w+xx]=255;a=-1}}}
for(let x=0;x<w;x++){let a=-1;for(let y=0;y<=h;y++){const black=y<h&&data[y*w+x]===0;if(black&&a<0)a=y;if(!black&&a>=0){if(y-a>40)for(let yy=a;yy<y;yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++)clean[yy*w+xx]=255;a=-1}}}
const worker=await createWorker('eng');
try{
 const headers=await worker.recognize(original,{}, {tsv:true});
 await worker.setParameters({tessedit_pageseg_mode:'6'});
 const values=await worker.recognize(await sharp(clean,{raw:{width:w,height:h,channels:1}}).png().toBuffer(),{}, {tsv:true});
 process.stdout.write(JSON.stringify(parseScale(headers.data.tsv,values.data.tsv)));
}finally{await worker.terminate()}
