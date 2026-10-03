import {parseScale} from './wage-parser.mjs';
export async function readWagePhoto(file,progress=()=>{}){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>10*1024*1024)throw Error('Usá PNG, JPG o WebP de hasta 10 MB.');
 progress('Preparando la foto…');
 const image=await createImageBitmap(file),canvas=document.createElement('canvas');
 if(image.width<400||image.height<200||image.width*image.height>40000000)throw Error('Imagen demasiado pequeña o grande.');
 canvas.width=3200;canvas.height=Math.round(image.height/image.width*3200);if(canvas.height>7000)throw Error('Imagen demasiado alta.');
 const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);image.close();
 const {default:Tesseract}=await import('https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js');
 const {createWorker}=Tesseract;
 let worker;try{
 worker=await createWorker('eng',1,{logger:msg=>{if(msg.status==='recognizing text')progress('Leyendo tabla… '+Math.round(msg.progress*100)+'%')}});
 const headers=await worker.recognize(canvas,{}, {tsv:true});
 const pixels=context.getImageData(0,0,canvas.width,canvas.height),{width:w,height:h}=canvas,mask=new Uint8Array(w*h);
 for(let i=0;i<mask.length;i++){const p=i*4;mask[i]=(pixels.data[p]+pixels.data[p+1]+pixels.data[p+2])/3<180?0:255}
 const clean=new Uint8Array(mask);
 for(let y=0;y<h;y++){let a=-1;for(let x=0;x<=w;x++){const black=x<w&&mask[y*w+x]===0;if(black&&a<0)a=x;if(!black&&a>=0){if(x-a>100)for(let xx=a;xx<x;xx++)for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)clean[yy*w+xx]=255;a=-1}}}
 for(let x=0;x<w;x++){let a=-1;for(let y=0;y<=h;y++){const black=y<h&&mask[y*w+x]===0;if(black&&a<0)a=y;if(!black&&a>=0){if(y-a>40)for(let yy=a;yy<y;yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++)clean[yy*w+xx]=255;a=-1}}}
 for(let i=0;i<mask.length;i++){const p=i*4;pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=clean[i];pixels.data[p+3]=255}context.putImageData(pixels,0,0);
 await worker.setParameters({tessedit_pageseg_mode:'6'});const values=await worker.recognize(canvas,{}, {tsv:true});
 // Photo values are candidates: cross-check the published basic, then require
 // the user's explicit review in the UI before applying them.
 progress('Verificando categorías e importes…');return parseScale(headers.data.tsv,values.data.tsv,{minimumConfidence:0});
 }finally{if(worker)await worker.terminate()}
}
