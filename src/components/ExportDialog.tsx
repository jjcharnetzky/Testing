import {CheckCircle2,AlertTriangle,Check,Download,FileDown,Package} from 'lucide-react';
import {Modal,Toggle} from './Controls';
import type {Project} from '../core/model';
import type {Layout} from '../core/layout';
import type {LabelInstance} from '../core/numbering';
import type {PreflightIssue} from '../core/text';
interface Props {p:Project;layout:Layout|null;labels:LabelInstance[];issues:PreflightIssue[];allowOverflow:boolean;setAllowOverflow:(v:boolean)=>void;busy:boolean;onClose:()=>void;onIssue:(issue:PreflightIssue)=>void;onExport:(format:'pdf'|'dxf'|'package')=>void;onControl:()=>void}
export function ExportDialog({p,layout,labels,issues,allowOverflow,setAllowOverflow,busy,onClose,onIssue,onExport,onControl}:Props){
  const blocked=busy||issues.some(i=>!allowOverflow||!/wychodzi/.test(i.message));
  return <Modal title="Eksport do druku i CAD" onClose={onClose} wide>
    <div className="export-summary"><CheckCircle2 size={30}/><div><h3>{layout?.count} etykiet · {layout?.sheets.length} arkuszy</h3><p>{p.material.width} mm szerokości · {layout?.length} mm długości · skala 1:1</p></div></div>
    <div className="export-ranges">{p.types.map(t=>{const l=labels.filter(l=>l.typeId===t.id);return <div key={t.id}><strong>{t.name}</strong><span>{l.length} szt.</span><code>{l[0]?.serial??'—'} → {l.at(-1)?.serial??'—'}</code></div>;})}</div>
    {issues.length>0?<div className="preflight-issues"><h4><AlertTriangle size={17}/> Wymaga sprawdzenia ({issues.length})</h4><ul>{issues.map((issue,i)=><li key={i}><button onClick={()=>onIssue(issue)}><strong>{issue.typeName} · {issue.serial}</strong><span>{issue.message}</span></button></li>)}</ul>{issues.every(i=>/wychodzi/.test(i.message))&&<Toggle checked={allowOverflow} onChange={setAllowOverflow}>Świadomie eksportuję mimo przepełnienia. Treść nie zostanie pomniejszona; na granicy PDF może zostać ucięta.</Toggle>}</div>:<div className="success-box"><Check size={16}/> Sprawdzono wszystkie etykiety: fonty, polskie znaki, grafiki i przepełnienia.</div>}
    <div className="info-box"><strong>Drukuj w skali 100% / rzeczywisty rozmiar.</strong> Wyłącz „Dopasuj do strony”. W pakiecie PDF i DXF mają odpowiadające sobie nazwy arkuszy. Wyodrębnij cały ZIP razem z katalogiem <code>obrazy</code>, aby zachować względne odwołania PNG.</div>
    <div className="export-buttons"><button className="button primary" disabled={blocked} onClick={()=>onExport('package')}><Package size={16}/> Pobierz pakiet PDF + DXF</button><button className="button" disabled={blocked} onClick={()=>onExport('pdf')}><Download size={16}/> Pobierz wektorowy PDF</button><button className="button" disabled={blocked} onClick={()=>onExport('dxf')}><FileDown size={16}/> Pobierz DXF (ZIP)</button></div>
    <p className="muted">DXF 2007, model space, 1 jednostka = 1 mm. Tekst ma wypełnione obrysy glifów; PNG są osobnymi plikami pakietu. PDF osadza fonty i obrazy. Numery nie zmieniają się podczas eksportu.</p>
    <p className="muted">DWG nie jest generowany: brak obsługi tego formatu offline w użytych bibliotekach. Nie wykonano testu otwarcia w DraftSight 2024.</p>
    <div className="modal-actions"><button className="link-button" onClick={onControl}>Plik kontrolny 1:1</button></div>
  </Modal>;
}
