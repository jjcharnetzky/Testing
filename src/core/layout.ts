import { type Project } from './model';
import { generateLabels, type LabelInstance } from './numbering';
export interface Placement { label: LabelInstance; x: number; y: number; width: number; height: number; rotated: boolean }
export interface Sheet { width: number; height: number; placements: Placement[] }
export interface Layout { sheets: Sheet[]; count: number; length: number; unusedArea: number; usedArea: number }
const EPS=1e-7;
export function packLabels(p: Project, labels=generateLabels(p)): Layout {
  const m=p.material, available=m.width-m.left-m.right, length=m.maxLength-m.top-m.bottom;
  if(available<=0 || length<=0) throw new Error('Marginesy nie pozostawiają miejsca na etykiety.');
  const sheets: Sheet[]=[]; let page: Sheet={width:m.width,height:0,placements:[]};
  let x=m.left,y=m.top,rowHeight=0;
  const finish=()=> { if(page.placements.length) {page.height=y+rowHeight+m.bottom;sheets.push(page);} page={width:m.width,height:0,placements:[]};x=m.left;y=m.top;rowHeight=0; };
  for(const label of labels) {
    const t=p.types.find(t=>t.id===label.typeId)!;
    let rotated=t.rotated,w=rotated?t.height:t.width,h=rotated?t.width:t.height;
    const fits=(w:number,h:number)=>w<=available+EPS && h<=length+EPS;
    if(!fits(w,h)) {
      if(m.autoRotate&&fits(h,w)) {[w,h]=[h,w];rotated=!rotated;}
      else throw new Error(`„${t.name}” (${w} × ${h} mm) nie mieści się w obszarze ${available} × ${length} mm. Zmień wymiary, obrót lub materiał.`);
    }
    if(x+w>m.width-m.right+EPS) {
      if(m.autoRotate && x+h<=m.width-m.right+EPS && y+Math.max(rowHeight,w)<=m.maxLength-m.bottom+EPS) { [w,h]=[h,w];rotated=!rotated; }
      else {x=m.left;y+=rowHeight+m.gapY;rowHeight=0;}
    }
    if(y+Math.max(rowHeight,h)>m.maxLength-m.bottom+EPS) finish();
    page.placements.push({label,x,y,width:w,height:h,rotated});
    rowHeight=Math.max(rowHeight,h);x+=w+m.gapX;
  }
  finish();
  const usedArea=sheets.reduce((s,page)=>s+page.placements.reduce((a,r)=>a+r.width*r.height,0),0);
  const total=sheets.reduce((s,page)=>s+page.width*page.height,0);
  return {sheets,count:labels.length,length:sheets.reduce((s,page)=>s+page.height,0),unusedArea:total-usedArea,usedArea};
}
export interface Segment { x1:number;y1:number;x2:number;y2:number;stroke:number }
// Union of collinear border intervals, including partial overlaps. Thickest stroke wins.
export function mergeSegments(segments: Segment[]): Segment[] {
  const groups=new Map<string,{horizontal:boolean;position:number;items:{a:number;b:number;stroke:number}[]}>();
  for(const s of segments) {
    const horizontal=Math.abs(s.y1-s.y2)<EPS;
    const position=horizontal?s.y1:s.x1,key=`${horizontal?'h':'v'}:${position.toFixed(6)}`;
    const group=groups.get(key)??{horizontal,position,items:[]};
    group.items.push({a:Math.min(horizontal?s.x1:s.y1,horizontal?s.x2:s.y2),b:Math.max(horizontal?s.x1:s.y1,horizontal?s.x2:s.y2),stroke:s.stroke});groups.set(key,group);
  }
  const result: Segment[]=[];
  for(const g of groups.values()) {
    const points=[...new Set(g.items.flatMap(i=>[i.a,i.b]))].sort((a,b)=>a-b);
    let last: Segment|undefined;
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1],active=g.items.filter(s=>s.a<=a+EPS&&s.b>=b-EPS);
      if(!active.length) {last=undefined;continue;}
      const stroke=Math.max(...active.map(s=>s.stroke));
      if(last&&last.stroke===stroke&&Math.abs((g.horizontal?last.x2:last.y2)-a)<EPS) {if(g.horizontal)last.x2=b;else last.y2=b;}
      else {last=g.horizontal?{x1:a,y1:g.position,x2:b,y2:g.position,stroke}:{x1:g.position,y1:a,x2:g.position,y2:b,stroke};result.push(last);}
    }
  }
  return result;
}
export function sheetBorders(p: Project,sheet: Sheet): Segment[] {
  return mergeSegments(sheet.placements.flatMap(r=> {
    const t=p.types.find(t=>t.id===r.label.typeId)!,s=p.templates.find(s=>s.id===t.templateId)!;
    if(!s.border)return [];
    const x=r.x,y=r.y,w=r.width,h=r.height,stroke=s.borderWidth;
    return [{x1:x,y1:y,x2:x+w,y2:y,stroke},{x1:x,y1:y+h,x2:x+w,y2:y+h,stroke},{x1:x,y1:y,x2:x,y2:y+h,stroke},{x1:x+w,y1:y,x2:x+w,y2:y+h,stroke}];
  }));
}
