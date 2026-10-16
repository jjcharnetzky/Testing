import type {LabelObject,LabelType,ImageObject,Project} from './model';
import type {Placement} from './layout';
import type {LabelInstance} from './numbering';
import type {FontRegistry} from './fonts';
import {rotatedPoint,textGeometry} from './text';
export interface Point {x:number;y:number}
export function objectPoint(t:LabelType,r:Placement,o:LabelObject,x:number,y:number):Point {
  const v=rotatedPoint(x,y,o.rotation);x=o.x+v.x;y=o.y+v.y;
  return r.rotated?{x:r.x+t.height-y,y:r.y+x}:{x:r.x+x,y:r.y+y};
}
export function objectBounds(o:LabelObject){
  const points=[[0,0],[o.w,0],[o.w,o.h],[0,o.h]].map(([x,y])=>rotatedPoint(x,y,o.rotation));
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))};
}
export function centeredObject(o:LabelObject,t:LabelType){const b=objectBounds(o);return {x:(t.width-b.maxX-b.minX)/2,y:(t.height-b.maxY-b.minY)/2};}
export function resizedImage(o:ImageObject,dimension:'w'|'h',value:number):Pick<ImageObject,'w'|'h'> {
  let w=dimension==='w'?value:o.w,h=dimension==='h'?value:o.h;
  if(o.keepAspect){const ratio=o.pixelWidth/o.pixelHeight;if(dimension==='w')h=w/ratio;else w=h*ratio;const scale=Math.min(1,5000/w,5000/h);w*=scale;h*=scale;}
  return {w:Math.max(.1,Math.min(5000,w)),h:Math.max(.1,Math.min(5000,h))};
}
export function centeredText(p:Project,t:LabelType,label:LabelInstance,registry:FontRegistry){
  const template=p.templates.find(s=>s.id===t.templateId)!;
  const texts=template.objects.filter(o=>o.kind==='text').map(o=>({...o,align:'center' as const,valign:'middle' as const}));
  if(!texts.length)return template.objects;
  const corners=texts.flatMap(o=>{const b=textGeometry(p,t,o,label,registry).bounds;return [[b.minX,b.minY],[b.maxX,b.minY],[b.maxX,b.maxY],[b.minX,b.maxY]].map(([x,y])=>{const v=rotatedPoint(x,y,o.rotation);return {x:o.x+v.x,y:o.y+v.y};});});
  const dx=t.width/2-(Math.min(...corners.map(c=>c.x))+Math.max(...corners.map(c=>c.x)))/2;
  const dy=t.height/2-(Math.min(...corners.map(c=>c.y))+Math.max(...corners.map(c=>c.y)))/2;
  return template.objects.map(o=>{const text=texts.find(t=>t.id===o.id);return text?{...text,x:text.x+dx,y:text.y+dy}:o;});
}
