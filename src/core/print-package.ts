import {zipSync,strToU8} from 'fflate';
import type {Project} from './model';
import {fonts,type FontRegistry} from './fonts';
import {packLabels} from './layout';
import {preflight} from './text';
import {dxfSheet,imageAssets} from './dxf';
import {exportPdf} from './export';
import {fromBase64} from './binary';
const csv=(v:unknown)=>'"'+String(v??'').replaceAll('"','""')+'"';
export async function printFiles(p:Project,registry:FontRegistry=fonts,allowOverflow=false,includePdf=true):Promise<Record<string,Uint8Array>> {
  await registry.ensure(p);
  const sheets=packLabels(p).sheets;
  const issues=preflight(p,sheets.flatMap(s=>s.placements.map(r=>r.label)),registry).filter(i=>!allowOverflow||!/wychodzi/.test(i.message));
  if(issues.length)throw new Error(`${issues[0].typeName}: ${issues[0].message}`);
  const assets=imageAssets(p,sheets),files:Record<string,Uint8Array>={};
  for(let i=0;i<sheets.length;i++){
    const name='arkusz-'+String(i+1).padStart(3,'0');
    files[name+'.dxf']=strToU8(dxfSheet(p,sheets[i],registry,assets));
    if(includePdf)files[name+'.pdf']=await exportPdf(p,registry,{allowOverflow,sheets:[sheets[i]]});
  }
  for(const asset of assets)files[asset.path]=fromBase64(asset.data);
  const records=[['Arkusz','Lp.','Rodzaj','Nr seryjny','Egzemplarz','X mm','Y mm','Szerokosc mm','Wysokosc mm','Obrot 90°']];
  let index=0;for(let i=0;i<sheets.length;i++)for(const r of sheets[i].placements)records.push([String(i+1),String(++index),p.types.find(t=>t.id===r.label.typeId)!.name,r.label.serial,String(r.label.product??''),String(r.x),String(r.y),String(r.width),String(r.height),r.rotated?'tak':'nie']);
  files['zestawienie.csv']=strToU8('\uFEFF'+records.map(row=>row.map(csv).join(';')).join('\r\n'));
  files['CZYTAJ.txt']=strToU8('Etykietson — pakiet produkcyjny\r\n\r\nJednostki DXF: 1 jednostka = 1 mm, model space, DXF AutoCAD 2007 (AC1021).\r\nWyodrębnij cały ZIP. Pozostaw katalog obrazy obok plików DXF. Odwołania IMAGEDEF używają względnych ścieżek obrazy/grafika-NNN.png.\r\nNumer arkusza w nazwach PDF i DXF jest identyczny. Tekst DXF to wypełnione obrysy glifów (HATCH), bez zależności od fontów systemowych. Dokładność aproksymacji krzywych: 0,005 mm.\r\nW zestawienie.csv współrzędne podano tak jak w podglądzie: od lewego górnego rogu. W DXF początek jest w lewym dolnym rogu, oś Y w górę.\r\nDruk PDF: skala 100%, bez dopasowania do strony.\r\nNie wykonano testu w rzeczywistym DraftSight 2024 ani na ploterze. DWG nie jest generowany; brak obsługiwanej biblioteki offline.\r\n');
  return files;
}
export async function printPackage(p:Project,registry:FontRegistry=fonts,allowOverflow=false,includePdf=true){return zipSync(await printFiles(p,registry,allowOverflow,includePdf),{level:6});}
