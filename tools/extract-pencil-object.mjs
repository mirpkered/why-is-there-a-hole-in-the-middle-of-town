// Extract one graphite object from a paper scan. Coordinates in the polygon are relative to the cropped source image.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';

const [source,output,polygonText]=process.argv.slice(2);
if(!source||!output||!polygonText)throw new Error('Usage: node tools/extract-pencil-object.mjs <cropped-source> <output.png> "x,y x,y ..."');
const probe=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=s=x:p=0',source],{encoding:'utf8'}).trim();
const [width,height]=probe.split('x').map(Number),polygon=polygonText.trim().split(/\s+/).map(pair=>pair.split(',').map(Number));
if(!width||!height||polygon.length<3||polygon.some(point=>point.length!==2||point.some(value=>!Number.isFinite(value))))throw new Error('Invalid source dimensions or polygon.');
const pixels=execFileSync('ffmpeg',['-v','error','-i',source,'-vf','eq=contrast=1.4:brightness=0.18,format=gray','-f','rawvideo','-pix_fmt','gray','pipe:1'],{maxBuffer:width*height+1024});
if(pixels.length!==width*height)throw new Error('Could not decode source image.');
function inside(x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit}return hit}
let left=width,top=height,right=-1,bottom=-1;
const alpha=new Uint8Array(pixels.length);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!inside(x,y))continue;alpha[i]=Math.round(Math.max(0,Math.min(255,(128-pixels[i])*255/35)));if(alpha[i]>=24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}}
if(right<left||bottom<top)throw new Error('No graphite marks remained inside the selected object.');
const pad=5,x0=Math.max(0,left-pad),y0=Math.max(0,top-pad),x1=Math.min(width-1,right+pad),y1=Math.min(height-1,bottom+pad),outW=x1-x0+1,outH=y1-y0+1;
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(buffer){let c=0xffffffff;for(const byte of buffer)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc])}
const rows=Buffer.alloc((outW*4+1)*outH);
for(let y=0;y<outH;y++){const row=y*(outW*4+1);rows[row]=0;for(let x=0;x<outW;x++){const src=(y+y0)*width+x+x0,dst=row+1+x*4,luma=pixels[src];rows[dst]=rows[dst+1]=rows[dst+2]=Math.min(76,luma);rows[dst+3]=alpha[src]}}
const header=Buffer.alloc(13);header.writeUInt32BE(outW,0);header.writeUInt32BE(outH,4);header[8]=8;header[9]=6;
writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Extracted ${outW}×${outH} pencil object to ${output}.`);
