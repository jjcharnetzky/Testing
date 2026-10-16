import { fromBase64, toBase64 } from './binary';
const signature=[137,80,78,71,13,10,26,10];
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function inspectPng(bytes:Uint8Array) {
  if(bytes.length>10_000_000)throw new Error('PNG może mieć maksymalnie 10 MB.');
  if(bytes.length<33||signature.some((v,i)=>bytes[i]!==v))throw new Error('Plik nie jest poprawnym PNG.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let at=8,width=0,height=0,ended=false,hasData=false;
  while(at+12<=bytes.length){
    const length=view.getUint32(at),end=at+12+length;
    if(end>bytes.length)throw new Error('Niekompletny plik PNG.');
    const type=String.fromCharCode(...bytes.subarray(at+4,at+8));
    if(crc(bytes.subarray(at+4,at+8+length))!==view.getUint32(at+8+length))throw new Error('Uszkodzony PNG: niepoprawna suma kontrolna.');
    if(at===8){if(type!=='IHDR'||length!==13)throw new Error('Niepoprawny nagłówek PNG.');width=view.getUint32(at+8);height=view.getUint32(at+12);}
    if(type==='acTL')throw new Error('Animowane PNG nie są obsługiwane. Wybierz statyczny PNG.');
    if(type==='IDAT')hasData=true;
    if(type==='IEND'){ended=true;if(end!==bytes.length||length!==0)throw new Error('Niepoprawny koniec PNG.');break;}
    at=end;
  }
  if(!ended||!hasData||width<1||height<1||width>30000||height>30000||width*height>40_000_000)throw new Error('PNG jest niekompletny lub przekracza limit 40 megapikseli.');
  return {width,height};
}
const checked=new Map<string,{width:number;height:number}>();
export function pngInfo(data:string) {
  const cached=checked.get(data);if(cached)return cached;
  const info=inspectPng(fromBase64(data));
  if(checked.size>=100)checked.delete(checked.keys().next().value!);checked.set(data,info);return info;
}
export async function readPng(file:File) {
  if(!/\.png$/i.test(file.name))throw new Error('Wybierz plik PNG.');
  if(file.size>10_000_000)throw new Error('PNG może mieć maksymalnie 10 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),info=inspectPng(bytes),data=toBase64(bytes);
  const image=new Image();image.src='data:image/png;base64,'+data;
  try{await image.decode();}catch{throw new Error('Przeglądarka nie może odczytać tego PNG.');}
  if(image.naturalWidth!==info.width||image.naturalHeight!==info.height)throw new Error('Niepoprawne wymiary PNG.');
  return {data,pixelWidth:info.width,pixelHeight:info.height,name:file.name.slice(0,200)};
}
