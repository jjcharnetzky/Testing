import type { ReactNode } from 'react';
import { X } from 'lucide-react';
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}) {return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function Num({value,onChange,min=0,max=10000,step=1,label}:{value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number;label?:string}) {
  return <input aria-label={label} type="number" min={min} max={max} step={step} value={Number.isFinite(value)?value:0} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n))onChange(Math.min(max,Math.max(min,step===1?Math.round(n):n)));}}/>;
}
export function Toggle({checked,onChange,children}:{checked:boolean;onChange:(b:boolean)=>void;children:ReactNode}){return <label className="toggle"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span>{children}</span></label>;}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section role="dialog" aria-modal="true" aria-label={title} className={'modal '+(wide?'wide':'')}><header><h2>{title}</h2><button aria-label="Zamknij" className="icon-btn" onClick={onClose}><X size={20}/></button></header><div className="modal-body">{children}</div></section></div>;
}
export function Empty({children}:{children:ReactNode}) {return <div className="empty">{children}</div>;}
