// Remove only edge-connected white paper from a mascot scan; enclosed white drawing areas stay opaque.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';

const args=process.argv.slice(2),pencilPaper=args.includes('--pencil-paper'),[source, output] = args.filter(arg=>arg!=='--pencil-paper');
if (!source || !output) throw new Error('Usage: node tools/process-mascot-cutout.mjs <source-image> <runtime-png> [--pencil-paper]');
const probe=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=s=x:p=0',source],{encoding:'utf8'}).trim();
const [width,height]=probe.split('x').map(Number);
if(!width||!height||width*height>12_000_000)throw new Error('Unsupported image dimensions.');
const rgba=execFileSync('ffmpeg',['-v','error','-i',source,'-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:width*height*4+1024});
if(rgba.length!==width*height*4)throw new Error('Could not decode source image.');

// White-paper mode removes only edge-connected paper, preserving enclosed white drawing areas.
// Optional graphite mode removes the gray page tone by luminance while keeping darker pencil marks.
const count=width*height, paper=new Uint8Array(count), seen=new Uint8Array(count), queue=new Int32Array(count);
for(let p=0;p<count;p++){const i=p*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2],luma=.299*r+.587*g+.114*b;paper[p]=pencilPaper?luma>=138:(Math.min(r,g,b)>=174&&Math.max(r,g,b)-Math.min(r,g,b)<=48)?1:0;}
let head=0,tail=0;
function seed(p){if(paper[p]&&!seen[p]){seen[p]=1;queue[tail++]=p}}
for(let x=0;x<width;x++){seed(x);seed((height-1)*width+x)}
for(let y=1;y<height-1;y++){seed(y*width);seed(y*width+width-1)}
while(head<tail){const p=queue[head++],x=p%width,y=(p/width)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;seed(ny*width+nx)}}
let left=width,top=height,right=-1,bottom=-1;
for(let p=0;p<count;p++){
  const i=p*4;
  const luma=.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2];
  if(pencilPaper)rgba[i+3]=Math.round(Math.max(0,Math.min(255,(128-luma)*255/28)));
  else if(seen[p])rgba[i+3]=Math.round(Math.max(0,Math.min(255,(255-luma)*255/72)));
  if(rgba[i+3]>=32){const x=p%width,y=(p/width)|0;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
}
if(right<left||bottom<top)throw new Error('No drawing pixels remained after background removal.');
const pad=8,x0=Math.max(0,left-pad),y0=Math.max(0,top-pad),x1=Math.min(width-1,right+pad),y1=Math.min(height-1,bottom+pad),outW=x1-x0+1,outH=y1-y0+1;
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc32(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc])}
const rows=Buffer.alloc((outW*4+1)*outH);
for(let y=0;y<outH;y++){const dst=y*(outW*4+1);rows[dst]=0;for(let x=0;x<outW;x++){const src=((y+y0)*width+x+x0)*4;rgba.copy(rows,dst+1+x*4,src,src+4)}}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(outW,0);ihdr.writeUInt32BE(outH,4);ihdr[8]=8;ihdr[9]=6;
writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Wrote ${output} (${outW}×${outH}; cropped from ${width}×${height}).`);
