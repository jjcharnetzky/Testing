import { type Project, type LabelType } from './model';
export interface LabelInstance { id: string; typeId: string; serial: string; value: number; product?: number }
export function formatSerial(p: Project, value: number) {
  return p.numbering.format.replaceAll('{numer}',String(value).padStart(p.numbering.digits,'0')).replaceAll('{miesiac}',String(p.numbering.month).padStart(2,'0')).replaceAll('{rok}',String(p.numbering.year));
}
export function generateLabels(p: Project): LabelInstance[] {
  const n=p.numbering;
  if (!n.format.includes('{numer}') || /[{}]/.test(n.format.replace(/\{(numer|miesiac|rok)\}/g,''))) throw new Error('Format numeru: użyj {numer}, {miesiac}, {rok}.');
  if (!Number.isInteger(n.step) || n.step<1) throw new Error('Krok numeracji musi być dodatnią liczbą całkowitą.');
  const count=p.types.reduce((a,t)=>a+(n.mode==='sets'?t.perProduct*n.products:t.quantity),0);
  if (count>20000) throw new Error('Jedno zlecenie może zawierać do 20 000 etykiet. Podziel większe zlecenie na projekty.');
  if (!Number.isInteger(count) || count<1) throw new Error('Ustaw liczbę etykiet większą od zera.');
  const labels: LabelInstance[]=[];
  let shared=n.start;
  const add=(t: LabelType,value: number,product?: number)=>labels.push({id:`${t.id}:${labels.length}`,typeId:t.id,serial:formatSerial(p,value),value,product});
  if (n.mode==='sets') {
    for(let product=0;product<n.products;product++) for(const t of p.types) for(let i=0;i<t.perProduct;i++) add(t,n.start+product*n.step,product+1);
  } else for (const t of p.types) for(let i=0;i<t.quantity;i++) {
    add(t,n.mode==='shared'?shared:t.start+i*n.step); shared+=n.step;
  }
  return labels;
}
export function resolveText(text: string,p: Project,t: LabelType,label: LabelInstance) {
  const data: Record<string,string>={nazwa_wyrobu:p.productName,nazwa_elementu:t.elementName,typ_etykiety:t.name,nr_seryjny:label.serial,miesiac:String(p.numbering.month).padStart(2,'0'),rok:String(p.numbering.year)};
  return text.replace(/\{([^}]+)\}/g,(original,key)=>data[key]??original);
}
