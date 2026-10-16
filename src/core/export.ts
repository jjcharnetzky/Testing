import { PDFDocument, degrees, rgb, drawText as drawPdfText, type PDFFont, type PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { MM_TO_PT, newProject, type Project, type LabelObject } from './model';
import { type FontRegistry, fonts } from './fonts';
import { packLabels, sheetBorders, type Sheet, type Placement } from './layout';
import { preflight, textGeometry } from './text';
import { objectPoint } from './geometry';
import { fromBase64 } from './binary';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const n=(v:number)=>Number(v.toFixed(6));
export function objectSvg(p:Project,r:Placement,o:LabelObject,registry:FontRegistry) {
  const t=p.types.find(t=>t.id===r.label.typeId)!;
  let content='';
  if(o.kind==='text') {
    const geom=textGeometry(p,t,o,r.label,registry);
    content=geom.lines.map(line=>line.glyphs.map(g=>`<path d="${g.glyph.path.toSVG()}" transform="translate(${n(g.x)} ${n(line.baseline)}) scale(${geom.scale} ${-geom.scale})"/>`).join('')).join('');
  } else if(o.kind==='image')content=`<image href="data:image/png;base64,${o.data}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/>`;
  else if(o.kind==='rect')content=`<rect width="${o.w}" height="${o.h}" fill="none" stroke="black" stroke-width="${o.stroke}"/>`;
  else content=`<line x2="${o.w}" y2="0" stroke="black" stroke-width="${o.stroke}"/>`;
  return `<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation})">${content}</g>`;
}
export function labelSvg(p:Project,r:Placement,registry:FontRegistry) {
  const t=p.types.find(t=>t.id===r.label.typeId)!,template=p.templates.find(s=>s.id===t.templateId)!;
  return `<g transform="translate(${r.x} ${r.y})${r.rotated?` translate(${t.height} 0) rotate(90)`:''}">${template.objects.map(o=>objectSvg(p,r,o,registry)).join('')}</g>`;
}
export function svgSheet(p:Project,sheet:Sheet,registry:FontRegistry):string {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${n(sheet.width)}mm" height="${n(sheet.height)}mm" viewBox="0 0 ${n(sheet.width)} ${n(sheet.height)}"><title>${escape(p.name)}</title>${sheet.placements.map(r=>labelSvg(p,r,registry)).join('')}${sheetBorders(p,sheet).map(s=>`<line x1="${n(s.x1)}" y1="${n(s.y1)}" x2="${n(s.x2)}" y2="${n(s.y2)}" stroke="black" stroke-width="${s.stroke}"/>`).join('')}</svg>`;
}
export async function exportPdf(p:Project,registry:FontRegistry=fonts,options:{allowOverflow?:boolean;control?:boolean;sheets?:Sheet[]}={}) {
  await registry.ensure(p);
  const sheets=options.sheets??packLabels(p).sheets;
  const issues=preflight(p,sheets.flatMap(s=>s.placements.map(r=>r.label)),registry);
  const blocking=issues.filter(i=>!options.allowOverflow||!/wychodzi/.test(i.message));
  if(blocking.length)throw new Error(`Sprawdzenie przed eksportem: ${blocking[0].typeName}, ${blocking[0].serial}: ${blocking[0].message}`);
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  doc.setTitle('Etykietson · '+p.name);doc.setCreator('Etykietson · lokalnie');doc.setProducer('Etykietson / pdf-lib');
  const used=[...new Set(p.templates.flatMap(t=>t.objects.flatMap(o=>o.kind==='text'?[o.fontId]:[])))];
  const embedded=new Map<string,PDFFont>();
  for(const id of used)embedded.set(id,await doc.embedFont(registry.bytes(id),{subset:false}));
  const images=new Map<string,PDFImage>();
  for(const sheet of sheets) {
    const page=doc.addPage([sheet.width*MM_TO_PT,sheet.height*MM_TO_PT]);
    const fontKeys=new Map([...embedded].map(([id,font])=>[id,page.node.newFontDictionary(font.name,font.ref)]));
    const line=(a:{x:number;y:number},b:{x:number;y:number},stroke:number)=>page.drawLine({start:{x:a.x*MM_TO_PT,y:(sheet.height-a.y)*MM_TO_PT},end:{x:b.x*MM_TO_PT,y:(sheet.height-b.y)*MM_TO_PT},thickness:stroke*MM_TO_PT,color:rgb(0,0,0)});
    for(const r of sheet.placements) {
      const t=p.types.find(t=>t.id===r.label.typeId)!,template=p.templates.find(s=>s.id===t.templateId)!;
      for(const o of template.objects) {
        const mapObject=(x:number,y:number)=>objectPoint(t,r,o,x,y);
        if(o.kind==='text') {
          const geom=textGeometry(p,t,o,r.label,registry);
          for(const l of geom.lines)if(l.text) {const at=mapObject(l.x,l.baseline);page.pushOperators(...drawPdfText(embedded.get(o.fontId)!.encodeText(l.text),{x:at.x*MM_TO_PT,y:(sheet.height-at.y)*MM_TO_PT,font:fontKeys.get(o.fontId)!,size:o.fontSize,rotate:degrees(-o.rotation-(r.rotated?90:0)),xSkew:degrees(0),ySkew:degrees(0),color:rgb(0,0,0)}));}
        } else if(o.kind==='image'){
          let image=images.get(o.data);if(!image){image=await doc.embedPng(fromBase64(o.data));images.set(o.data,image);}
          const at=mapObject(0,o.h);
          page.drawImage(image,{x:at.x*MM_TO_PT,y:(sheet.height-at.y)*MM_TO_PT,width:o.w*MM_TO_PT,height:o.h*MM_TO_PT,rotate:degrees(-o.rotation-(r.rotated?90:0))});
        } else if(o.kind==='line')line(mapObject(0,0),mapObject(o.w,0),o.stroke);
        else {const points=[[0,0],[o.w,0],[o.w,o.h],[0,o.h],[0,0]].map(([x,y])=>mapObject(x,y));for(let i=0;i<4;i++)line(points[i],points[i+1],o.stroke);}
      }
    }
    for(const s of sheetBorders(p,sheet))line({x:s.x1,y:s.y1},{x:s.x2,y:s.y2},s.stroke);
    if(options.control) {
      line({x:10,y:55},{x:110,y:55},0.2);line({x:10,y:52},{x:10,y:58},0.2);line({x:110,y:52},{x:110,y:58},0.2);
      page.drawText('100 mm · skala 100%',{x:10*MM_TO_PT,y:(sheet.height-64)*MM_TO_PT,font:embedded.get('sans-regular')!,size:9});
    }
  }
  return doc.save();
}
export async function controlPdf() {
  const p=newProject();p.name='Kontrola skali 1:1 · etykieta 50 × 30 mm';p.productName='KONTROLA SKALI';p.types[0].elementName='50 × 30 mm';p.types[0].quantity=1;
  p.material={...p.material,width:200,maxLength:100,left:10,right:0,top:10,bottom:30};
  return exportPdf(p,fonts,{control:true});
}
