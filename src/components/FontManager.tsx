import {Upload,CheckCircle2,AlertTriangle} from 'lucide-react';
import {Modal} from './Controls';
import {fonts,ARIAL_FONTS,availableFont} from '../core/fonts';
import type {Project} from '../core/model';
export function FontManager({p,onImport,onClose}:{p:Project;onImport:(id?:string)=>void;onClose:()=>void}){
  const inventory=fonts.inventory(p);
  return <Modal title="Czcionki — jednorazowe wczytanie" onClose={onClose} wide>
    <p className="modal-intro">Wczytaj własne pliki TTF/OTF. Zostają zapisane w tej przeglądarce i są dostępne przy kolejnych uruchomieniach oraz w nowych projektach. PDF i DXF korzystają z tych samych danych co edytor.</p>
    <div className="font-library">{ARIAL_FONTS.map(slot=>{const actual=inventory.find(f=>f.id===slot.id)!,available=availableFont(actual);return <div key={slot.id}><div><strong>{slot.name}</strong><span>{available?<><CheckCircle2 size={13}/> Font wczytany lokalnie</>:<><AlertTriangle size={13}/> Brak pliku — nie używamy zamiennika</>}</span></div><button className="button" onClick={()=>onImport(slot.id)}><Upload size={14}/>{available?'Wymień':'Wczytaj'} {slot.name}</button></div>;})}</div>
    <div className="info-box">Typowe pliki Windows: <code>arial.ttf</code>, <code>arialbd.ttf</code> i <code>ariblk.ttf</code>. Wybierz je przez systemowe okno plików, np. z folderu Windows/Fonts, jeżeli masz do nich dostęp i prawo osadzania. Nazwa w CSS nie zastępuje pliku fontu. Arial Black jest osobnym krojem.</div>
    <div className="modal-actions"><button className="button" onClick={()=>onImport()}><Upload size={14}/> Importuj inny TTF / OTF</button><button className="button primary" onClick={onClose}>Gotowe</button></div>
  </Modal>;
}
