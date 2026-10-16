import { type Font, type Glyph } from '@pdf-lib/fontkit';
import { type Project, type LabelType, type TextObject, PT_TO_MM } from './model';
import { type LabelInstance, resolveText } from './numbering';
import { type FontRegistry } from './fonts';
import { pngInfo } from './png';
export interface TextLine { text:string; x:number; baseline:number; width:number; glyphs:{glyph:Glyph;x:number}[] }
export interface TextGeometry { lines:TextLine[]; scale:number; warnings:string[]; width:number;height:number; bounds:{minX:number;minY:number;maxX:number;maxY:number} }
const measurements=new WeakMap<Font,Map<string,TextGeometry>>();
export function measureText(font:Font,o:TextObject,text:string):TextGeometry {
  const key=JSON.stringify([o.fontSize,o.w,o.h,o.align,o.valign,o.lineHeight,text]);
  const cache=measurements.get(font)??new Map<string,TextGeometry>();
  measurements.set(font,cache);
  const cached=cache.get(key);if(cached)return {...cached,warnings:[...cached.warnings]};
  const scale=o.fontSize*PT_TO_MM/font.unitsPerEm;
  const missing=[...new Set(Array.from(text.replaceAll('\n','')).filter(c=>!font.hasGlyphForCodePoint(c.codePointAt(0)!)))];
  const warnings:string[]=[];
  if(missing.length)warnings.push(`Brak znaków w foncie: ${missing.map(c=>`„${c}”`).join(', ')}.`);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const texts=text.split('\n');
  const height=(font.ascent-font.descent)*scale+Math.max(0,texts.length-1)*o.fontSize*PT_TO_MM*o.lineHeight;
  const vertical=o.valign==='middle'?(o.h-height)/2:o.valign==='bottom'?o.h-height:0;
  const lines=texts.map((text,i)=>{
    // pdf-lib encodes this glyph sequence and advances using glyph.advanceWidth.
    // Use the identical metrics and no browser/system font fallback.
    const glyphs=font.layout(text).glyphs;
    const width=glyphs.reduce((s,g)=>s+g.advanceWidth*scale,0);
    const x=o.align==='center'?(o.w-width)/2:o.align==='right'?o.w-width:0;
    const baseline=vertical+font.ascent*scale+i*o.fontSize*PT_TO_MM*o.lineHeight;
    let offset=0;
    const positioned=glyphs.map(glyph=>{
      const gx=x+offset,box=glyph.bbox;
      if(box&&Number.isFinite(box.minX)) {
        minX=Math.min(minX,gx+box.minX*scale);maxX=Math.max(maxX,gx+box.maxX*scale);
        minY=Math.min(minY,baseline-box.maxY*scale);maxY=Math.max(maxY,baseline-box.minY*scale);
      }
      const result={glyph,x:gx};offset+=glyph.advanceWidth*scale;return result;
    });
    return {text,x,baseline,width,glyphs:positioned};
  });
  const width=Math.max(0,...lines.map(l=>l.width));
  if(width>o.w+0.01||height>o.h+0.01||minX< -0.01||minY< -0.01||maxX>o.w+0.01||maxY>o.h+0.01)warnings.push('Tekst wychodzi poza pole. Powiększ pole lub zmień treść / rozmiar fontu.');
  const result={lines,scale,warnings,width,height,bounds:Number.isFinite(minX)?{minX,minY,maxX,maxY}:{minX:0,minY:0,maxX:width,maxY:height}};
  if(cache.size>=2000)cache.delete(cache.keys().next().value!);
  cache.set(key,result);
  return {...result,warnings:[...warnings]};
}
export function rotatedPoint(x:number,y:number,angle:number) {const r=angle*Math.PI/180;return {x:x*Math.cos(r)-y*Math.sin(r),y:x*Math.sin(r)+y*Math.cos(r)};}
export function textGeometry(p:Project,t:LabelType,o:TextObject,l:LabelInstance,registry:FontRegistry) {
  const text=resolveText(o.text,p,t,l);
  const result=measureText(registry.get(o.fontId),o,text);
  if(/\{[^}]+\}/.test(text))result.warnings.push('Nieznane pole dynamiczne w treści.');
  const b=result.bounds;
  const corners=[[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]].map(([x,y])=>rotatedPoint(x,y,o.rotation));
  if(corners.some(c=>c.x+o.x< -0.01||c.y+o.y< -0.01||c.x+o.x>t.width+0.01||c.y+o.y>t.height+0.01))result.warnings.push('Tekst wychodzi poza etykietę.');
  return result;
}
export interface PreflightIssue { typeId:string;typeName:string;objectId:string;serial:string;message:string }
export function preflight(p:Project,labels:LabelInstance[],registry:FontRegistry):PreflightIssue[] {
  const result:PreflightIssue[]=[];
  const seen=new Set<string>();
  for(const l of labels) {
    const t=p.types.find(t=>t.id===l.typeId)!,template=p.templates.find(s=>s.id===t.templateId)!;
    for(const o of template.objects) {
      let warnings:string[]=[];
      if(o.kind==='text') warnings=textGeometry(p,t,o,l,registry).warnings;
      else {
        if(o.kind==='image'){try{const info=pngInfo(o.data);if(info.width!==o.pixelWidth||info.height!==o.pixelHeight)warnings.push('Wymiary PNG nie zgadzają się z projektem.');}catch(e){warnings.push((e as Error).message);}}
        const c=[[0,0],[o.w,0],[o.w,o.kind==='line'?0:o.h],[0,o.kind==='line'?0:o.h]].map(([x,y])=>rotatedPoint(x,y,o.rotation));
        if(c.some(c=>c.x+o.x<0||c.y+o.y<0||c.x+o.x>t.width||c.y+o.y>t.height))warnings.push('Geometria wychodzi poza etykietę.');
      }
      for(const message of warnings) {
        const key=`${t.id}:${o.id}:${message}`;
        if(!seen.has(key)){result.push({typeId:t.id,typeName:t.name,objectId:o.id,serial:l.serial,message});seen.add(key);}
      }
    }
  }
  return result;
}
