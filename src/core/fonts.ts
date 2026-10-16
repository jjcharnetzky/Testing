import fontkit, { type Font } from '@pdf-lib/fontkit';
import { type Project, uid } from './model';
import { embeddedFonts } from './runtime';
export interface FontInfo { id:string;name:string;family:string;bold:boolean;italic:boolean;url?:string;data?:string }
const families=[['sans','LiberationSans','Liberation Sans'],['serif','LiberationSerif','Liberation Serif'],['mono','LiberationMono','Liberation Mono']];
export const BUILTIN_FONTS:FontInfo[]=families.flatMap(([id,file,name])=>[
  {id:`${id}-regular`,name,family:name,bold:false,italic:false,url:`/fonts/${file}-Regular.ttf`},
  {id:`${id}-bold`,name:`${name} Bold`,family:name,bold:true,italic:false,url:`/fonts/${file}-Bold.ttf`},
  {id:`${id}-italic`,name:`${name} Italic`,family:name,bold:false,italic:true,url:`/fonts/${file}-Italic.ttf`},
  {id:`${id}-bolditalic`,name:`${name} Bold Italic`,family:name,bold:true,italic:true,url:`/fonts/${file}-BoldItalic.ttf`},
]);
export const toBase64=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
export const fromBase64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export class FontRegistry {
  private loaded=new Map<string,{font:Font;bytes:Uint8Array;data?:string}>();
  inventory(p:Project):FontInfo[] { return [...BUILTIN_FONTS.filter(b=>!p.fonts.some(f=>f.id===b.id)).map(f=>embeddedFonts()[f.id]?{...f,data:embeddedFonts()[f.id]}:f),...p.fonts]; }
  async ensure(p:Project,all=false) {
    const used=all?this.inventory(p).map(f=>f.id):[...new Set(p.templates.flatMap(t=>t.objects.filter(o=>o.kind==='text').map(o=>o.fontId)))];
    await Promise.all(used.map(async id=> {
      const info=this.inventory(p).find(f=>f.id===id);
      if(!info) throw new Error(`Brak fontu „${id}”. Zaimportuj odpowiedni plik lub wybierz dostępny font.`);
      const prev=this.loaded.get(id);
      if(prev&&prev.data===info.data)return;
      let bytes:Uint8Array;
      if(info.data) bytes=fromBase64(info.data);
      else {const r=await fetch(info.url!);if(!r.ok)throw new Error(`Nie można odczytać lokalnego fontu ${info.name}.`);bytes=new Uint8Array(await r.arrayBuffer());}
      const font=fontkit.create(bytes);
      this.checkFont(font,info.name);
      this.loaded.set(id,{font,bytes,data:info.data});
    }));
  }
  private checkFont(font:Font,name:string) {
    if(!font.unitsPerEm || !font.layout)throw new Error(`Nieobsługiwany font: ${name}. Wybierz statyczny TTF lub OTF.`);
    const fsType=(font as any)['OS/2']?.fsType ?? 0;
    if((typeof fsType==='number'&&(fsType&0x202)) || (typeof fsType==='object'&&(fsType.noEmbedding||fsType.bitmapOnly)))throw new Error(`Font „${name}” zabrania osadzania wektorowego. Wybierz font z odpowiednią licencją.`);
    if(Object.keys((font as any).variationAxes??{}).length)throw new Error('Font zmienny: użyj statycznej odmiany TTF/OTF.');
  }
  get(id:string) {const entry=this.loaded.get(id);if(!entry)throw new Error(`Font „${id}” nie jest załadowany.`);return entry.font;}
  bytes(id:string) {this.get(id);return this.loaded.get(id)!.bytes;}
  async import(file:File):Promise<Project['fonts'][number]> {
    if(!/\.(ttf|otf)$/i.test(file.name))throw new Error('Wybierz plik TTF lub OTF.');
    if(file.size>20_000_000)throw new Error('Maksymalny rozmiar fontu to 20 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());const f=fontkit.create(bytes);
    this.checkFont(f,file.name);
    const sub=f.subfamilyName??'';
    const info={id:`import-${uid()}`,name:f.fullName||file.name,family:f.familyName||file.name,bold:/bold|black|heavy/i.test(sub),italic:/italic|oblique/i.test(sub),data:toBase64(bytes)};
    this.loaded.set(info.id,{font:f,bytes,data:info.data});return info;
  }
  async portable(p:Project):Promise<Project> {
    await this.ensure(p,true);
    const ids=new Set(p.templates.flatMap(t=>t.objects.flatMap(o=>o.kind==='text'?[o.fontId]:[])));
    return {...p,fonts:this.inventory(p).filter(f=>ids.has(f.id)||p.fonts.some(pf=>pf.id===f.id)).map(({url,...f})=>({...f,data:toBase64(this.bytes(f.id))}))};
  }
}
export const fonts=new FontRegistry();
