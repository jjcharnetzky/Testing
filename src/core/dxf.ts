import {DxfWriter,DxfObject,Units,Colors,HatchPredefinedPatterns,ImageDisplayFlags,point2d,point3d,Hatch,HatchBoundaryPaths,pattern,Image as DxfImage,BoundingBox,type Dxfier,type DxfImageDef,type DxfDictionary} from '@tarikjabiri/dxf';
import type {Project,ImageObject} from './model';
import {fonts,type FontRegistry} from './fonts';
import {packLabels,sheetBorders,type Sheet} from './layout';
import {objectPoint,type Point} from './geometry';
import {textGeometry,preflight} from './text';
import {glyphContours} from './curves';
import {fromBase64} from './binary';
export interface CadAsset {path:string;data:string;width:number;height:number}
export function imageAssets(p:Project,sheets:Sheet[]):CadAsset[]{
  const assets:CadAsset[]=[],seen=new Set<string>();
  for(const sheet of sheets)for(const r of sheet.placements){const t=p.types.find(t=>t.id===r.label.typeId)!,s=p.templates.find(s=>s.id===t.templateId)!;for(const o of s.objects)if(o.kind==='image'&&!seen.has(o.data)){seen.add(o.data);assets.push({path:`obrazy/grafika-${String(assets.length+1).padStart(3,'0')}.png`,data:o.data,width:o.pixelWidth,height:o.pixelHeight});}}
  return assets;
}
function inside(point:Point,loop:Point[]){let inside=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
// The library provides valid handles, tables, model-space owners and dictionaries.
// Specialize HATCH to preserve holes (normal style) and IMAGE to support independent
// physical U/V pixel vectors, including rotated/non-uniformly sized PNGs.
class GlyphHatch extends Hatch {
  constructor(private loops:Point[][]){super(new HatchBoundaryPaths(),pattern({name:HatchPredefinedPatterns.SOLID}),{layerName:'TEKST',colorNumber:Colors.White});}
  boundingBox(){return BoundingBox.verticesBBox(this.loops.flat().map(p=>point3d(p.x,p.y)));}
  protected dxfyChild(dx:Dxfier){
    dx.point3d(point3d(0,0,0));dx.push(210,0);dx.push(220,0);dx.push(230,1);dx.push(2,'SOLID');dx.push(70,1);dx.push(71,0);dx.push(91,this.loops.length);
    for(const loop of this.loops){const depth=this.loops.filter(other=>other!==loop&&inside(loop[0],other)).length;dx.push(92,2|(depth%2===0?1:0));dx.push(72,0);dx.push(73,1);dx.push(93,loop.length);for(const p of loop)dx.point2d(point2d(p.x,p.y));dx.push(97,0);}
    dx.push(75,0);dx.push(76,1);dx.push(98,0);
  }
}
class RasterSettings extends DxfObject {
  constructor(){super('RASTERVARIABLES');}
  dxfy(dx:Dxfier){super.dxfy(dx);dx.subclassMarker('AcDbRasterVariables');dx.push(70,0);dx.push(71,1);dx.push(72,1);}
}
class RasterImage extends DxfImage {
  constructor(o:ImageObject,origin:Point,private u:Point,private v:Point,definition:DxfImageDef){super({width:o.pixelWidth,height:o.pixelHeight,scale:o.w,rotation:0,insertionPoint:point3d(origin.x,origin.y),imageDefHandle:definition.handle},{layerName:'GRAFIKI',imageDisplayFlags:ImageDisplayFlags.ShowImage | ImageDisplayFlags.ShowImageWhenNotAlignedWithScreen | ImageDisplayFlags.TransparencyIsOn});}
  boundingBox(){const a=this.insertionPoint;return BoundingBox.verticesBBox([[0,0],[this.width,0],[this.width,this.height],[0,this.height]].map(([x,y])=>point3d(a.x+this.u.x*x+this.v.x*y,a.y+this.u.y*x+this.v.y*y)));}
  protected dxfyChild(dx:Dxfier){
    dx.push(90,0);dx.point3d(this.insertionPoint);dx.point3d(point3d(this.u.x,this.u.y),1);dx.point3d(point3d(this.v.x,this.v.y),2);dx.push(13,this.width);dx.push(23,this.height);dx.push(340,this.imageDefHandle);dx.push(70,11);dx.push(280,0);dx.push(281,50);dx.push(282,50);dx.push(283,0);dx.push(360,this.imageDefReactorHandle);dx.push(71,1);dx.push(91,2);dx.point2d(point2d(-.5,-.5),4);dx.point2d(point2d(this.width-.5,this.height-.5),4);dx.push(290,1);
  }
}
export function dxfSheet(p:Project,sheet:Sheet,registry:FontRegistry,assets=imageAssets(p,[sheet])):string {
  const dxf=new DxfWriter();dxf.setUnits(Units.Millimeters);
  dxf.setVariable('$ACADVER',{1:'AC1021'});dxf.setVariable('$LASTSAVEDBY',{1:'Etykietson'});dxf.setVariable('$MEASUREMENT',{70:1});dxf.setVariable('$LUNITS',{70:2});dxf.setVariable('$LUPREC',{70:6});dxf.setVariable('$EXTMIN',{10:0,20:0,30:0});dxf.setVariable('$EXTMAX',{10:sheet.width,20:sheet.height,30:0});dxf.setVariable('$LIMMIN',{10:0,20:0});dxf.setVariable('$LIMMAX',{10:sheet.width,20:sheet.height});
  for(const name of ['OBRYSY','TEKST','GRAFIKI'])dxf.addLayer(name,Colors.White);
  const cad=(point:Point):Point=>({x:point.x,y:sheet.height-point.y});
  const line=(a:Point,b:Point,stroke:number)=>{a=cad(a);b=cad(b);dxf.addLWPolyline([{point:point2d(a.x,a.y)},{point:point2d(b.x,b.y)}],{constantWidth:stroke,layerName:'OBRYSY',colorNumber:Colors.White});};
  let imageDictionary:DxfDictionary|undefined;
  const definitions=new Map<string,DxfImageDef>();
  for(const r of sheet.placements){
    const t=p.types.find(t=>t.id===r.label.typeId)!,template=p.templates.find(s=>s.id===t.templateId)!;
    for(const o of template.objects){
      const map=(x:number,y:number)=>objectPoint(t,r,o,x,y);
      if(o.kind==='text'){
        const geom=textGeometry(p,t,o,r.label,registry);
        for(const l of geom.lines)for(const g of l.glyphs){
          const contours=glyphContours(g.glyph,geom.scale).map(loop=>loop.map(point=>cad(map(g.x+point.x*geom.scale,l.baseline-point.y*geom.scale))));
          if(contours.length)dxf.modelSpace.addEntity(new GlyphHatch(contours));
        }
      }else if(o.kind==='image'){
        const asset=assets.find(a=>a.data===o.data);if(!asset)throw new Error('Brak pliku PNG w pakiecie CAD.');
        if(!imageDictionary){imageDictionary=dxf.document.objects.addDictionary();dxf.document.objects.root.addEntryObject('ACAD_IMAGE_DICT',imageDictionary.handle);const settings=dxf.document.objects.addObject(new RasterSettings());settings.ownerObjecthandle=dxf.document.objects.root.handle;dxf.document.objects.root.addEntryObject('ACAD_IMAGE_VARS',settings.handle);}
        let definition=definitions.get(o.data);
        if(!definition){definition=dxf.document.objects.addImageDef(asset.path);definition.width=o.pixelWidth;definition.height=o.pixelHeight;definition.ownerObjecthandle=imageDictionary.handle;definition.acadImageDictHandle=imageDictionary.handle;imageDictionary.addEntryObject(asset.path.replace(/[^a-zA-Z0-9]/g,'_'),definition.handle);definitions.set(o.data,definition);}
        const origin=cad(map(0,o.h)),right=cad(map(o.w,o.h)),top=cad(map(0,0));
        const image=new RasterImage(o,origin,{x:(right.x-origin.x)/o.pixelWidth,y:(right.y-origin.y)/o.pixelWidth},{x:(top.x-origin.x)/o.pixelHeight,y:(top.y-origin.y)/o.pixelHeight},definition);
        const reactor=dxf.document.objects.addImageDefReactor(image.handle);reactor.ownerObjecthandle=image.handle;image.imageDefReactorHandle=reactor.handle;definition.addImageDefReactorHandle(reactor.handle);dxf.modelSpace.addEntity(image);
      }else if(o.kind==='line')line(map(0,0),map(o.w,0),o.stroke);
      else {const pts=[[0,0],[o.w,0],[o.w,o.h],[0,o.h],[0,0]].map(([x,y])=>map(x,y));for(let i=0;i<4;i++)line(pts[i],pts[i+1],o.stroke);}
    }
  }
  for(const s of sheetBorders(p,sheet))line({x:s.x1,y:s.y1},{x:s.x2,y:s.y2},s.stroke);
  return dxf.stringify();
}
export async function exportDxf(p:Project,registry:FontRegistry=fonts,allowOverflow=false){
  await registry.ensure(p);const sheets=packLabels(p).sheets;
  const blocking=preflight(p,sheets.flatMap(s=>s.placements.map(r=>r.label)),registry).filter(i=>!allowOverflow||!/wychodzi/.test(i.message));
  if(blocking.length)throw new Error(blocking[0].typeName+': '+blocking[0].message);
  const assets=imageAssets(p,sheets);
  return {sheets:sheets.map(s=>dxfSheet(p,s,registry,assets)),assets:assets.map(a=>({...a,bytes:fromBase64(a.data)}))};
}
