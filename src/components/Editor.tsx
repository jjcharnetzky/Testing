import {useRef,useState} from 'react';
import {MousePointer2,Hand,ZoomIn,ZoomOut,Grid2X2,Magnet,Maximize,Type,RectangleHorizontal,Minus,Undo2,Redo2,ImagePlus,AlignCenter} from 'lucide-react';
import type {Project,LabelObject,LabelType,ImageObject} from '../core/model';
import {fonts} from '../core/fonts';
import {generateLabels,formatSerial} from '../core/numbering';
import {objectSvg} from '../core/export';
import {textGeometry,rotatedPoint} from '../core/text';
import {resizedImage} from '../core/geometry';
interface Props {p:Project;t:LabelType;selected:string|null;setSelected:(id:string|null)=>void;onObject:(id:string,data:Partial<LabelObject>,history?:boolean)=>void;addObject:(kind:'text'|'rect'|'line')=>void;beginDrag:()=>void;undo:()=>void;redo:()=>void;canUndo:boolean;canRedo:boolean;ready:boolean;addPng:()=>void;dropPng:(file:File)=>void;centerText:()=>void}
type Drag={kind:'pan'|'object';id?:string;x:number;y:number;startX:number;startY:number}|{kind:'resize';object:ImageObject;startX:number;startY:number};
export function Editor({p,t,selected,setSelected,onObject,addObject,beginDrag,undo,redo,canUndo,canRedo,ready,addPng,dropPng,centerText}:Props){
  const template=p.templates.find(s=>s.id===t.templateId)!;
  const [zoom,setZoom]=useState(1),[grid,setGrid]=useState(true),[snap,setSnap]=useState(true),[hand,setHand]=useState(false),[pan,setPan]=useState({x:0,y:0}),[drop,setDrop]=useState(false);
  const drag=useRef<Drag|null>(null);
  let label;try{label=generateLabels(p).find(l=>l.typeId===t.id);}catch{}
  label??={id:'preview',typeId:t.id,serial:formatSerial(p,t.start),value:t.start};
  const r={label,x:0,y:0,width:t.width,height:t.height,rotated:false},scale=8*zoom;
  const selectedObject=template.objects.find(o=>o.id===selected);
  return <div className="editor-shell"><div className="editor-toolbar">
    <div className="tool-group"><button title="Zaznacz" aria-label="Zaznacz" className={!hand?'tool active':'tool'} onClick={()=>setHand(false)}><MousePointer2 size={17}/></button><button title="Przesuwaj widok" aria-label="Przesuwaj widok" className={hand?'tool active':'tool'} onClick={()=>setHand(true)}><Hand size={17}/></button></div>
    <div className="tool-group"><button className="tool text-tool" onClick={()=>addObject('text')}><Type size={18}/><span>Tekst</span></button><button title="Dodaj prostokąt" aria-label="Dodaj prostokąt" className="tool" onClick={()=>addObject('rect')}><RectangleHorizontal size={19}/></button><button title="Dodaj linię" aria-label="Dodaj linię" className="tool" onClick={()=>addObject('line')}><Minus size={19}/></button><button title="Dodaj grafikę PNG" aria-label="Dodaj grafikę PNG" className="tool text-tool" onClick={addPng}><ImagePlus size={18}/><span>PNG</span></button></div>
    <div className="tool-group"><button aria-label="Cofnij" title="Cofnij zmianę szablonu" className="tool" disabled={!canUndo} onClick={undo}><Undo2 size={17}/></button><button aria-label="Ponów" className="tool" disabled={!canRedo} onClick={redo}><Redo2 size={17}/></button></div>
    <button className="tool text-tool" title="Wyśrodkuj cały blok tekstowy, zachowując układ pól" aria-label="Wyśrodkuj treść" disabled={!ready} onClick={centerText}><AlignCenter size={16}/><span>Wyśrodkuj treść</span></button>
    <div className="toolbar-spacer"/><button className={'tool '+(grid?'active':'')} aria-label="Siatka" title="Siatka 1 mm" onClick={()=>setGrid(!grid)}><Grid2X2 size={16}/></button><button className={'tool '+(snap?'active':'')} aria-label="Przyciąganie" title="Przyciąganie do 1 mm" onClick={()=>setSnap(!snap)}><Magnet size={16}/></button>
  </div>
  <div className={'canvas '+(hand?'pan-mode ':'')+(drop?'drop-active':'')}
    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';setDrop(true);}}
    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDrop(false);}}
    onDrop={e=>{e.preventDefault();setDrop(false);const file=e.dataTransfer.files[0];if(file)dropPng(file);}}
    onPointerDown={e=>{if(e.button===1||hand){e.preventDefault();drag.current={kind:'pan',x:pan.x,y:pan.y,startX:e.clientX,startY:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}else if(e.target===e.currentTarget)setSelected(null);}}
    onPointerMove={e=>{
      const d=drag.current;if(!d)return;
      if(d.kind==='pan')setPan({x:d.x+e.clientX-d.startX,y:d.y+e.clientY-d.startY});
      else if(d.kind==='resize'){
        const delta=rotatedPoint((e.clientX-d.startX)/scale,(e.clientY-d.startY)/scale,-d.object.rotation);
        const adjust=(v:number)=>Math.max(.1,Math.min(5000,snap?Math.round(v):Math.round(v*100)/100));
        let dimensions;
        if(d.object.keepAspect){const key=Math.abs(delta.x/d.object.w)>=Math.abs(delta.y/d.object.h)?'w':'h';dimensions=resizedImage(d.object,key,adjust(key==='w'?d.object.w+delta.x:d.object.h+delta.y));}
        else dimensions={w:adjust(d.object.w+delta.x),h:adjust(d.object.h+delta.y)};
        onObject(d.object.id,dimensions,false);
      }else{const adjust=(v:number)=>Math.max(-10000,Math.min(10000,snap?Math.round(v):Math.round(v*100)/100));onObject(d.id!,{x:adjust(d.x+(e.clientX-d.startX)/scale),y:adjust(d.y+(e.clientY-d.startY)/scale)},false);}
    }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <div className="canvas-note"><span className="green-dot"/> PODGLĄD ETYKIETY <span>1 jednostka = 1 mm · możesz przeciągnąć PNG</span></div>
    <div className="label-stage" style={{transform:`translate(${pan.x}px,${pan.y}px)`}}><div className="dimension horizontal"><span>{t.width} mm</span></div><div className="dimension vertical"><span>{t.height} mm</span></div>
      <svg data-testid="label-editor" className="label-svg" width={t.width*scale} height={t.height*scale} viewBox={`0 0 ${t.width} ${t.height}`} style={{overflow:'visible'}} onPointerDown={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
        <defs><pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#c4cbd0" strokeWidth="0.035"/></pattern></defs>
        <rect width={t.width} height={t.height} fill="white" onPointerDown={()=>!hand&&setSelected(null)}/>{grid&&<rect width={t.width} height={t.height} fill="url(#grid)" pointerEvents="none"/>}
        {template.border&&<rect width={t.width} height={t.height} fill="none" stroke="#151b1a" strokeWidth={template.borderWidth} pointerEvents="none"/>}
        {ready&&template.objects.map(o=>{
          let bad=false;try{bad=o.kind==='text'&&textGeometry(p,t,o,r.label,fonts).warnings.length>0;}catch{}
          return <g key={o.id}><g pointerEvents="none" dangerouslySetInnerHTML={{__html:objectSvg(p,r,o,fonts)}}/>
            <g transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`} onPointerDown={e=>{if(hand)return;e.stopPropagation();setSelected(o.id);beginDrag();drag.current={kind:'object',id:o.id,x:o.x,y:o.y,startX:e.clientX,startY:e.clientY};e.currentTarget.closest('.canvas')?.setPointerCapture(e.pointerId);}} style={{cursor:hand?'grab':'move'}}>
              <rect x="0" y="0" width={o.w} height={o.kind==='line'?Math.max(o.h,1):o.h} fill="transparent" stroke={selected===o.id?'#13745a':bad?'#c0752e':'transparent'} strokeWidth="0.13" strokeDasharray={selected===o.id?'0.6 0.35':undefined}/>
              {selected===o.id&&[[0,0],[o.w,0],[o.w,o.h],[0,o.h]].map(([x,y],i)=><rect key={i} x={x-.35} y={y-.35} width=".7" height=".7" fill="white" stroke="#13745a" strokeWidth=".13" pointerEvents="none"/>)}
              {selected===o.id&&o.kind==='image'&&<rect data-resize-handle="true" aria-label="Zmień rozmiar grafiki" x={o.w-.7} y={o.h-.7} width="1.4" height="1.4" fill="#13745a" stroke="white" strokeWidth=".15" style={{cursor:'nwse-resize'}} onPointerDown={e=>{e.stopPropagation();beginDrag();drag.current={kind:'resize',object:{...o},startX:e.clientX,startY:e.clientY};e.currentTarget.closest('.canvas')?.setPointerCapture(e.pointerId);}}/>}
            </g></g>;
        })}
      </svg><div className="label-caption">{t.width} × {t.height} mm <span>•</span> {template.name}</div>
    </div>
    <div className="zoom-controls"><button aria-label="Pomniejsz" onClick={()=>setZoom(Math.max(.25,zoom-.25))}><ZoomOut size={16}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Powiększ" onClick={()=>setZoom(Math.min(4,zoom+.25))}><ZoomIn size={16}/></button><i/><button aria-label="Wyśrodkuj widok" onClick={()=>{setPan({x:0,y:0});setZoom(1);}}><Maximize size={15}/></button></div>
  </div><footer className="canvas-footer"><span>{selectedObject?`${selectedObject.kind==='text'?'Pole tekstowe':selectedObject.kind==='rect'?'Prostokąt':selectedObject.kind==='image'?'Grafika PNG':'Linia'} · X ${Number(selectedObject.x.toFixed(2))} · Y ${Number(selectedObject.y.toFixed(2))} mm`:'Wybierz obiekt, aby edytować jego właściwości'}</span><span>{snap?'Przyciąganie: 1 mm':'Przyciąganie wyłączone'}</span></footer></div>;
}
