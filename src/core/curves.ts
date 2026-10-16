import type {Glyph} from '@pdf-lib/fontkit';
import type {Point} from './geometry';
interface Command {command:string;args:number[]}
const mid=(a:Point,b:Point):Point=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distanceToSegment=(p:Point,a:Point,b:Point)=>{const dx=b.x-a.x,dy=b.y-a.y;const length=dx*dx+dy*dy;if(!length)return Math.hypot(p.x-a.x,p.y-a.y);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
const cache=new WeakMap<Glyph,Map<number,Point[][]>>();
// Adaptive De Casteljau subdivision: physical tolerance is 0.005 mm by default.
export function glyphContours(glyph:Glyph,scale:number,tolerance=.005):Point[][] {
  const byScale=cache.get(glyph)??new Map<number,Point[][]>();cache.set(glyph,byScale);
  const key=scale/tolerance,hit=byScale.get(key);if(hit)return hit;
  const commands=(glyph.path as unknown as {commands:Command[]}).commands;
  const loops:Point[][]=[];let points:Point[]=[],current:Point={x:0,y:0},start=current;
  const tol=tolerance/scale;
  const add=(p:Point)=>{points.push(p);current=p;};
  function quadratic(a:Point,b:Point,c:Point,depth=0){if(depth>20||distanceToSegment(b,a,c)<=tol){add(c);return;}const ab=mid(a,b),bc=mid(b,c),m=mid(ab,bc);quadratic(a,ab,m,depth+1);quadratic(m,bc,c,depth+1);}
  function cubic(a:Point,b:Point,c:Point,d:Point,depth=0){if(depth>20||Math.max(distanceToSegment(b,a,d),distanceToSegment(c,a,d))<=tol){add(d);return;}const ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);cubic(a,ab,abc,m,depth+1);cubic(m,bcd,cd,d,depth+1);}
  const finish=()=>{if(points.length>1&&Math.hypot(points.at(-1)!.x-start.x,points.at(-1)!.y-start.y)<1e-8)points.pop();if(points.length>=3)loops.push(points);points=[];};
  for(const {command,args:a} of commands){
    if(command==='moveTo'){finish();current={x:a[0],y:a[1]};start=current;points=[current];}
    else if(command==='lineTo')add({x:a[0],y:a[1]});
    else if(command==='quadraticCurveTo')quadratic(current,{x:a[0],y:a[1]},{x:a[2],y:a[3]});
    else if(command==='bezierCurveTo')cubic(current,{x:a[0],y:a[1]},{x:a[2],y:a[3]},{x:a[4],y:a[5]});
    else if(command==='closePath')finish();
    else throw new Error('Nieobsługiwana geometria glifu: '+command);
  }
  finish();byScale.set(key,loops);return loops;
}
