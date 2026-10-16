import {Copy,Trash2,ArrowUp,ArrowDown,Type,Image as ImageIcon,SlidersHorizontal,Bold,Italic,AlignLeft,AlignCenter,AlignRight,Upload,ScanLine} from 'lucide-react';
import {type Project,type LabelType,type LabelObject} from '../core/model';
import {fonts,availableFont} from '../core/fonts';
import {resizedImage} from '../core/geometry';
import {Field,Num,Toggle,Empty} from './Controls';
interface Props {p:Project;t:LabelType;selected:string|null;updateType:(data:Partial<LabelType>)=>void;updateTemplate:(data:Partial<Project['templates'][number]>)=>void;updateObject:(id:string,data:Partial<LabelObject>)=>void;duplicateObject:()=>void;removeObject:()=>void;moveLayer:(d:number)=>void;importFont:()=>void;manageFonts:()=>void;replaceImage:()=>void;centerImage:()=>void;onSelect:(id:string)=>void}
export function Properties({p,t,selected,updateType,updateTemplate,updateObject,duplicateObject,removeObject,moveLayer,importFont,manageFonts,replaceImage,centerImage,onSelect}:Props){
  const template=p.templates.find(s=>s.id===t.templateId)!,o=template.objects.find(o=>o.id===selected);
  const allFonts=fonts.inventory(p),font=o?.kind==='text'?allFonts.find(f=>f.id===o.fontId):undefined;
  const variant=(bold:boolean,italic:boolean)=>allFonts.find(f=>availableFont(f)&&f.family===font?.family&&f.bold===bold&&f.italic===italic);
  const dimension=(key:'w'|'h',n:number)=>{if(!o)return;updateObject(o.id,o.kind==='image'?resizedImage(o,key,n):{[key]:n});};
  return <aside className="properties"><div className="panel-title"><SlidersHorizontal size={16}/><h3>Właściwości</h3><span>{o?'OBIEKT':'ETYKIETA'}</span></div>
    <div className="properties-scroll"><section><h4>Dane rodzaju</h4>
      <Field label="Nazwa rodzaju"><input value={t.name} onChange={e=>e.target.value&&updateType({name:e.target.value})}/></Field>
      <Field label="Nazwa elementu na etykiecie"><input value={t.elementName} onChange={e=>updateType({elementName:e.target.value})}/></Field>
      <div className="form-row"><Field label={p.numbering.mode==='sets'?'Na jeden wyrób':'Liczba sztuk'}><Num min={0} max={20000} value={p.numbering.mode==='sets'?t.perProduct:t.quantity} onChange={n=>updateType(p.numbering.mode==='sets'?{perProduct:n}:{quantity:n})}/></Field><Field label="Numer początkowy"><Num max={1e9} value={t.start} onChange={n=>updateType({start:n})}/>{p.numbering.mode!=='separate'&&<small>Używany tylko w trybie A</small>}</Field></div>
      <div className="form-row"><Field label="Szerokość (mm)"><Num min={1} max={5000} step={.1} value={t.width} onChange={n=>updateType({width:n})}/></Field><Field label="Wysokość (mm)"><Num min={1} max={5000} step={.1} value={t.height} onChange={n=>updateType({height:n})}/></Field></div>
      <Toggle checked={t.rotated} onChange={rotated=>updateType({rotated})}>Obróć w druku o 90°</Toggle><Toggle checked={template.border} onChange={border=>updateTemplate({border})}>Obramowanie etykiety</Toggle>
      {template.border&&<Field label="Grubość obramowania (mm)"><Num value={template.borderWidth} min={.01} max={5} step={.05} onChange={borderWidth=>updateTemplate({borderWidth})}/></Field>}
    </section><section>
      <Field label="Nazwa szablonu wyglądu"><input value={template.name} onChange={e=>e.target.value&&updateTemplate({name:e.target.value})}/></Field>
      <div className="section-heading"><h4>{o?o.kind==='text'?'Pole tekstowe':o.kind==='rect'?'Prostokąt':o.kind==='image'?'Grafika PNG':'Linia':'Obiekt'}</h4>{o&&<div><button className="icon-btn" aria-label="Duplikuj obiekt" title="Duplikuj obiekt" onClick={duplicateObject}><Copy size={14}/></button><button className="icon-btn danger" aria-label="Usuń obiekt" title="Usuń obiekt" onClick={removeObject}><Trash2 size={14}/></button></div>}</div>
      {!o?<Empty><Type size={26}/><p>Zaznacz obiekt na etykiecie<br/>lub dodaj tekst / grafikę PNG.</p></Empty>:<>
        {o.kind==='text'&&<>
          <Field label="Treść pola"><textarea rows={3} value={o.text} onChange={e=>updateObject(o.id,{text:e.target.value})}/></Field>
          <div className="token-list">{['nazwa_wyrobu','nazwa_elementu','typ_etykiety','nr_seryjny','miesiac','rok'].map(token=><button key={token} onClick={()=>updateObject(o.id,{text:o.text+`{${token}}`})}>{`{${token}}`}</button>)}</div>
          <Field label="Czcionka"><select value={o.fontId} onChange={e=>updateObject(o.id,{fontId:e.target.value})}>{allFonts.map(f=><option key={f.id} value={f.id} disabled={!availableFont(f)}>{f.name}{!availableFont(f)?' — brak pliku':''}</option>)}</select></Field>
          <div className="font-style-row"><Num label="Rozmiar fontu w punktach" value={o.fontSize} min={1} max={300} step={.5} onChange={fontSize=>updateObject(o.id,{fontSize})}/><span>pt</span><button aria-label="Pogrubienie" disabled={!variant(!font?.bold,!!font?.italic)} className={'tool '+(font?.bold?'active':'')} onClick={()=>updateObject(o.id,{fontId:variant(!font?.bold,!!font?.italic)!.id})}><Bold size={15}/></button><button aria-label="Kursywa" disabled={!variant(!!font?.bold,!font?.italic)} className={'tool '+(font?.italic?'active':'')} onClick={()=>updateObject(o.id,{fontId:variant(!!font?.bold,!font?.italic)!.id})}><Italic size={15}/></button></div>
          <div className="form-row"><Field label="Wyrównanie"><div className="segmented">{(['left','center','right'] as const).map((a,i)=>{const Icon=[AlignLeft,AlignCenter,AlignRight][i];return <button key={a} aria-label={['Wyrównaj do lewej','Wyśrodkuj tekst','Wyrównaj do prawej'][i]} className={o.align===a?'active':''} onClick={()=>updateObject(o.id,{align:a})}><Icon size={16}/></button>;})}</div></Field><Field label="Interlinia"><Num value={o.lineHeight} min={.5} max={5} step={.05} onChange={lineHeight=>updateObject(o.id,{lineHeight})}/></Field></div>
          <Field label="Wyrównanie pionowe"><select value={o.valign??'top'} onChange={e=>updateObject(o.id,{valign:e.target.value as 'top'|'middle'|'bottom'})}><option value="top">Do góry</option><option value="middle">Do środka</option><option value="bottom">Do dołu</option></select></Field>
          <div className="font-actions"><button className="link-button" onClick={importFont}><Upload size={13}/> Importuj font TTF / OTF</button><button className="link-button" onClick={manageFonts}>Arial / biblioteka fontów</button></div>
        </>}
        {o.kind==='image'&&<>
          <p className="image-filename">{o.name}<small>{o.pixelWidth} × {o.pixelHeight} px · PNG z kanałem alfa</small></p>
          <Toggle checked={o.keepAspect} onChange={keepAspect=>updateObject(o.id,keepAspect?{keepAspect,...resizedImage({...o,keepAspect:true},'w',o.w)}:{keepAspect})}>Zachowaj proporcje grafiki</Toggle>
          <div className="image-actions"><button className="button small" onClick={replaceImage}><Upload size={13}/> Wymień grafikę PNG</button><button className="button small" onClick={centerImage}><ScanLine size={13}/> Wyśrodkuj grafikę</button></div>
        </>}
        <h5>Geometria w milimetrach</h5><div className="form-row"><Field label="Pozycja X"><Num min={-10000} step={.1} value={o.x} onChange={x=>updateObject(o.id,{x})}/></Field><Field label="Pozycja Y"><Num min={-10000} step={.1} value={o.y} onChange={y=>updateObject(o.id,{y})}/></Field></div>
        <div className="form-row"><Field label="Szerokość"><Num min={.1} step={.1} value={o.w} max={5000} onChange={n=>dimension('w',n)}/></Field><Field label="Wysokość"><Num min={.1} step={.1} value={o.h} max={5000} onChange={n=>dimension('h',n)}/></Field></div>
        <div className="form-row"><Field label="Obrót (°)"><Num min={-360} max={360} value={o.rotation} onChange={rotation=>updateObject(o.id,{rotation})}/></Field>{(o.kind==='rect'||o.kind==='line')&&<Field label="Linia (mm)"><Num min={.01} max={5} step={.05} value={o.stroke} onChange={stroke=>updateObject(o.id,{stroke})}/></Field>}</div>
        <div className="layer-order"><span>Kolejność warstw</span><button className="icon-btn" aria-label="Przenieś warstwę w dół" onClick={()=>moveLayer(-1)}><ArrowDown size={15}/></button><button className="icon-btn" aria-label="Przenieś warstwę w górę" onClick={()=>moveLayer(1)}><ArrowUp size={15}/></button></div>
      </>}
    </section><section className="layers"><h4>Warstwy · {template.objects.length}</h4>{[...template.objects].reverse().map((item,i)=><button key={item.id} className={selected===item.id?'selected':''} onClick={()=>onSelect(item.id)}>{item.kind==='image'?<ImageIcon size={13}/>:<Type size={13}/>}<span>{item.kind==='text'?item.text:item.kind==='line'?'Linia':item.kind==='image'?item.name:'Prostokąt'}</span><small>{template.objects.length-i}</small></button>)}</section></div>
  </aside>;
}
