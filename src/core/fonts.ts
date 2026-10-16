import fontkit, { type Font } from '@pdf-lib/fontkit';
import { type Project, type ImportedFont, uid } from './model';
import { embeddedFonts } from './runtime';
import {toBase64,fromBase64} from './binary';
export {toBase64,fromBase64} from './binary';
export interface FontInfo { id:string;name:string;family:string;bold:boolean;italic:boolean;url?:string;data?:string }
const families=[['sans','LiberationSans','Liberation Sans'],['serif','LiberationSerif','Liberation Serif'],['mono','LiberationMono','Liberation Mono']];
export const BUILTIN_FONTS:FontInfo[]=families.flatMap(([id,file,name])=>[
  {id:`${id}-regular`,name,family:name,bold:false,italic:false,url:`/fonts/${file}-Regular.ttf`},
  {id:`${id}-bold`,name:`${name} Bold`,family:name,bold:true,italic:false,url:`/fonts/${file}-Bold.ttf`},
  {id:`${id}-italic`,name:`${name} Italic`,family:name,bold:false,italic:true,url:`/fonts/${file}-Italic.ttf`},
  {id:`${id}-bolditalic`,name:`${name} Bold Italic`,family:name,bold:true,italic:true,url:`/fonts/${file}-BoldItalic.ttf`},
]);
export const ARIAL_FONTS:FontInfo[]=[
  {id:'arial-regular',name:'Arial Regular',family:'Arial',bold:false,italic:false},
  {id:'arial-bold',name:'Arial Bold',family:'Arial',bold:true,italic:false},
  {id:'arial-black',name:'Arial Black',family:'Arial Black',bold:false,italic:false},
];
export const availableFont=(f:FontInfo)=>Boolean(f.data||f.url);
export function identifyArial(f:{familyName?:string|null;fullName?:string|null;subfamilyName?:string|null;postscriptName?:string|null}) {
  const family=(f.familyName??'').replace(/[\s-]/g,'').toLowerCase();
  const full=(f.fullName??'').replace(/[\s-]/g,'').toLowerCase();
  const sub=f.subfamilyName??'';
  if(family==='arialblack'||full==='arialblack')return 'arial-black';
  if(family==='arial'&&!/italic|oblique/i.test(sub))return /bold/i.test(sub)||/arialbold/i.test(full)?'arial-bold':'arial-regular';
  return undefined;
}
export class FontRegistry {
  private loaded=new Map<string,{font:Font;bytes:Uint8Array;data?:string}>();
  private library:ImportedFont[]=[];
  setLibrary(fonts:ImportedFont[]) {this.library=fonts;}
  inventory(p:Project):FontInfo[] {
    const map=new Map<string,FontInfo>();
    for(const f of [...BUILTIN_FONTS,...ARIAL_FONTS])map.set(f.id,embeddedFonts()[f.id]?{...f,data:embeddedFonts()[f.id]}:f);
    for(const f of [...this.library,...p.fonts])map.set(f.id,f);
    return [...map.values()];
  }
  async ensure(p:Project,all=false) {
    const required=p.templates.flatMap(t=>t.objects.flatMap(o=>o.kind==='text'?[o.fontId]:[]));
    const inventory=this.inventory(p);
    const used=[...new Set([...required,...(all?inventory.filter(availableFont).map(f=>f.id):[])])];
    await Promise.all(used.map(async id=> {
      const info=inventory.find(f=>f.id===id);
      if(!info||!availableFont(info))throw new Error(`Brak fontu „${info?.name??id}”. Wczytaj odpowiedni TTF/OTF w oknie Czcionki. Nie zastosowano zamiennika.`);
      const prev=this.loaded.get(id);if(prev&&prev.data===info.data)return;
      let bytes:Uint8Array;
      if(info.data)bytes=fromBase64(info.data);
      else {const r=await fetch(info.url!);if(!r.ok)throw new Error(`Nie można odczytać lokalnego fontu ${info.name}.`);bytes=new Uint8Array(await r.arrayBuffer());}
      const font=fontkit.create(bytes);this.checkFont(font,info.name);
      this.loaded.set(id,{font,bytes,data:info.data});
    }));
  }
  private checkFont(font:Font,name:string) {
    if(!font.unitsPerEm||!font.layout)throw new Error(`Nieobsługiwany font: ${name}. Wybierz statyczny TTF lub OTF.`);
    const fsType=(font as any)['OS/2']?.fsType??0;
    if((typeof fsType==='number'&&(fsType&0x202))||(typeof fsType==='object'&&(fsType.noEmbedding||fsType.bitmapOnly)))throw new Error(`Font „${name}” zabrania osadzania wektorowego. Wybierz font z odpowiednią licencją.`);
    if(Object.keys((font as any).variationAxes??{}).length)throw new Error('Font zmienny: użyj statycznej odmiany TTF/OTF.');
  }
  get(id:string){const entry=this.loaded.get(id);if(!entry)throw new Error(`Brak załadowanego fontu „${id}”. Wczytaj go w oknie Czcionki.`);return entry.font;}
  bytes(id:string){this.get(id);return this.loaded.get(id)!.bytes;}
  async import(file:File,expectedId?:string):Promise<ImportedFont> {
    if(!/\.(ttf|otf)$/i.test(file.name))throw new Error('Wybierz plik TTF lub OTF.');
    if(file.size>20_000_000)throw new Error('Maksymalny rozmiar fontu to 20 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer()),f=fontkit.create(bytes);this.checkFont(f,file.name);
    const arial=identifyArial(f),slot=ARIAL_FONTS.find(a=>a.id===arial);
    if(expectedId&&arial!==expectedId)throw new Error(`Ten plik nie jest odmianą ${ARIAL_FONTS.find(a=>a.id===expectedId)?.name??expectedId}. Rozpoznano: ${f.fullName||file.name}. Wybierz właściwy font.`);
    const sub=f.subfamilyName??'';
    const info:ImportedFont={id:slot?.id??`import-${uid()}`,name:slot?.name??f.fullName??file.name,family:slot?.family??f.familyName??file.name,bold:slot?.bold??/bold|black|heavy/i.test(sub),italic:slot?.italic??/italic|oblique/i.test(sub),data:toBase64(bytes)};
    this.loaded.set(info.id,{font:f,bytes,data:info.data});return info;
  }
  async portable(p:Project):Promise<Project> {
    await this.ensure(p,true);
    const ids=new Set(p.templates.flatMap(t=>t.objects.flatMap(o=>o.kind==='text'?[o.fontId]:[])));
    return {...p,version:2,fonts:this.inventory(p).filter(f=>availableFont(f)&&(ids.has(f.id)||p.fonts.some(pf=>pf.id===f.id))).map(({url,...f})=>({...f,data:toBase64(this.bytes(f.id))}))};
  }
}
export const fonts=new FontRegistry();
