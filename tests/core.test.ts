import { describe,it,expect,beforeAll,vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { newProject, parseProject, MM_TO_PT, uid, type TextObject } from '../src/core/model';
import { generateLabels, formatSerial } from '../src/core/numbering';
import { packLabels, sheetBorders, mergeSegments } from '../src/core/layout';
import { FontRegistry, BUILTIN_FONTS, toBase64 } from '../src/core/fonts';
import { measureText, preflight } from '../src/core/text';
import { exportPdf, svgSheet } from '../src/core/export';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const artifacts=join(tmpdir(),'label-test-artifacts');
import { PDFDocument, PDFName, PDFDict, PDFArray } from 'pdf-lib';
function project(quantity=140) {const p=newProject();p.numbering.month=10;p.numbering.year=2026;p.types[0].quantity=quantity;return p;}
function twoTypes(){const p=project(40);p.types.push({...p.types[0],id:'B',name:'B',quantity:25});return p;}
const registry=new FontRegistry();
beforeAll(async()=>{
  mkdirSync(artifacts,{recursive:true});
  vi.stubGlobal('fetch',async (input:string)=>new Response(readFileSync('public'+input)));
  const p=project();
  p.fonts=BUILTIN_FONTS.map(({url,...f})=>({...f,data:toBase64(readFileSync('public'+url))}));
  await registry.ensure(p,true);
});
describe('Numeracja',()=>{
  it('A: własne zakresy i dozwolone powtórzenia między rodzajami',()=>{const p=twoTypes(),l=generateLabels(p);expect(l).toHaveLength(65);expect(l[0].serial).toBe('001/10/2026');expect(l[39].serial).toBe('040/10/2026');expect(l[40].serial).toBe('001/10/2026');expect(l[64].serial).toBe('025/10/2026');for(const t of p.types){const own=l.filter(l=>l.typeId===t.id);expect(new Set(own.map(l=>l.serial)).size).toBe(own.length);}});
  it('B: jeden licznik bez powtórzeń, respektuje kolejność',()=>{const p=twoTypes();p.numbering.mode='shared';const l=generateLabels(p);expect(l[40].serial).toBe('041/10/2026');expect(l[64].serial).toBe('065/10/2026');expect(new Set(l.map(l=>l.serial)).size).toBe(65);p.types.reverse();expect(generateLabels(p)[25].typeId).toBe(p.types[1].id);});
  it('C: powtarza numer tylko w zestawie danego wyrobu',()=>{const p=twoTypes();p.numbering.mode='sets';p.numbering.products=3;p.numbering.start=7;p.numbering.step=2;p.types[0].perProduct=2;p.types[1].perProduct=1;const l=generateLabels(p);expect(l).toHaveLength(9);expect(l.map(l=>l.value)).toEqual([7,7,7,9,9,9,11,11,11]);expect(l.map(l=>l.product)).toEqual([1,1,1,2,2,2,3,3,3]);expect(new Set(l.map(l=>l.serial)).size).toBe(3);});
  it('krok, minimalna liczba cyfr i pamiętanie miesiąca',()=>{const p=project(3);p.types[0].start=999;p.numbering.step=2;expect(generateLabels(p).map(l=>l.serial)).toEqual(['999/10/2026','1001/10/2026','1003/10/2026']);p.numbering.month=2;expect(formatSerial(p,3)).toBe('003/02/2026');const roundtrip=parseProject(JSON.stringify(p));expect(roundtrip.numbering.month).toBe(2);expect(roundtrip.numbering.year).toBe(2026);});
  it('obrót, rozmieszczenie, podział stron i wygląd nie zmieniają numerów',()=>{const p=twoTypes();p.numbering.mode='shared';const before=generateLabels(p);p.material.width=200;p.material.maxLength=100;p.types[0].rotated=true;p.templates[0].objects.reverse();expect(packLabels(p).sheets.length).toBeGreaterThan(1);expect(generateLabels(p)).toEqual(before);});
  it('odrzuca format bez {numer}, nadmierne ilości i zerowy krok',()=>{const p=project();p.numbering.format='{rok}';expect(()=>generateLabels(p)).toThrow('Format');p.numbering.format='{numer}';p.types[0].quantity=20001;expect(()=>generateLabels(p)).toThrow('20 000');p.numbering.step=0;expect(()=>generateLabels(p)).toThrow('Krok');});
});
describe('Rozmieszczanie',()=>{
  it.each([[28,1,30],[29,2,60],[140,5,150]])('%i etykiet: %i wierszy, %i mm', (count,rows,height)=>{const layout=packLabels(project(count));expect(layout.count).toBe(count);expect(layout.sheets).toHaveLength(1);expect(layout.length).toBe(height);expect(new Set(layout.sheets[0].placements.map(r=>r.y)).size).toBe(rows);expect(layout.sheets[0].placements.filter(r=>r.y===0)).toHaveLength(Math.min(28,count));expect(layout.unusedArea).toBe((1400*height)-(count*50*30));});
  it('kolejny rodzaj wypełnia rozpoczęty wiersz',()=>{const p=twoTypes();const l=packLabels(p).sheets[0].placements;expect(l[40].x).toBe(600);expect(l[40].y).toBe(30);});
  it('za szeroka etykieta daje czytelny błąd',()=>{const p=project();p.types[0].width=1401;expect(()=>packLabels(p)).toThrow('nie mieści');});
  it('obrót wyłącznie na życzenie',()=>{const p=project(1);p.material.width=40;expect(()=>packLabels(p)).toThrow();p.material.autoRotate=true;const r=packLabels(p).sheets[0].placements[0];expect(r.rotated).toBe(true);expect(r.width).toBe(30);expect(r.height).toBe(50);});
  it('nie tnie etykiet przy podziale stron i zachowuje marginesy',()=>{const p=project(29);p.material.maxLength=50;p.material.top=5;p.material.bottom=5;const l=packLabels(p);expect(l.sheets).toHaveLength(2);expect(l.sheets.every(s=>s.height===40)).toBe(true);expect(l.sheets[1].placements).toHaveLength(1);});
  it('mieszane półki: brak kolizji, przekroczeń i zmiany liczby sztuk',()=>{const p=twoTypes();p.material={...p.material,width:187,maxLength:130,left:3,right:4,top:5,bottom:6,gapX:1,gapY:2,autoRotate:true};p.types[1].width=33;p.types[1].height=42;const l=packLabels(p);expect(l.count).toBe(65);for(const sheet of l.sheets){for(const r of sheet.placements){expect(r.x).toBeGreaterThanOrEqual(3);expect(r.x+r.width).toBeLessThanOrEqual(183+1e-6);expect(r.y+r.height).toBeLessThanOrEqual(124+1e-6);for(const other of sheet.placements){if(r===other)continue;const collision=r.x<other.x+other.width-1e-6&&r.x+r.width>other.x+1e-6&&r.y<other.y+other.height-1e-6&&r.y+r.height>other.y+1e-6;expect(collision).toBe(false);}}}});
  it('wspólna krawędź dwóch etykiet jest rysowana raz',()=>{const p=project(2),edges=sheetBorders(p,packLabels(p).sheets[0]);expect(edges).toHaveLength(5);expect(edges.filter(e=>e.x1===50&&e.x2===50)).toHaveLength(1);});
  it('scala częściowo pokrywające się odcinki',()=>{const edges=mergeSegments([{x1:0,y1:0,x2:50,y2:0,stroke:.2},{x1:25,y1:0,x2:75,y2:0,stroke:.2}]);expect(edges).toEqual([{x1:0,y1:0,x2:75,y2:0,stroke:.2}]);});
});
describe('Tekst i pliki projektu',()=>{
  it('polskie znaki i wspólne metryki bez fontów systemowych',()=>{const p=project(1),o=p.templates[0].objects[0] as TextObject;const g=measureText(registry.get('sans-bold'),{...o,w:150,h:20},'Zażółć gęślą jaźń ĄĘŁÓŚŻŹĆŃ');expect(g.warnings).toEqual([]);expect(g.lines[0].glyphs.length).toBeGreaterThan(20);expect(g.width).toBeGreaterThan(20);});
  it('wykrywa długą nazwę i numer oraz tekst obrócony poza etykietę',()=>{const p=project(3);p.productName='Bardzo długa nazwa elementu konstrukcyjnego wymagająca większego pola';p.numbering.start=123456789;p.types[0].start=123456789;p.templates[0].objects[3].w=10;const issues=preflight(p,generateLabels(p),registry);expect(issues.some(i=>i.message.includes('poza pole'))).toBe(true);expect(issues.some(i=>i.message.includes('poza etykietę'))).toBe(true);const o=p.templates[0].objects[0];o.rotation=-90;p.productName='Tekst';expect(preflight(p,generateLabels(p),registry).some(i=>i.message.includes('poza etykietę'))).toBe(true);});
  it('brak znaku nie jest cicho zastępowany',()=>{const p=project(1),o=p.templates[0].objects[0] as TextObject;expect(measureText(registry.get('sans-bold'),o,'\u{1F984}').warnings.join(' ')).toContain('Brak znaków');});
  it('wielowierszowy tekst jest mierzony również w pionie',()=>{const p=project(1),o=p.templates[0].objects[0] as TextObject;const g=measureText(registry.get('sans-bold'),o,'Pierwszy\nDrugi\nTrzeci');expect(g.lines).toHaveLength(3);expect(g.warnings.join(' ')).toContain('poza pole');});
  it('kompletny projekt z fontami przechodzi roundtrip',async()=>{const p=project(1);await registry.ensure(p);const portable=await registry.portable(p),restored=parseProject(JSON.stringify(portable));expect(restored.numbering).toEqual(p.numbering);expect(restored.templates).toEqual(p.templates);expect(restored.fonts.length).toBe(3);expect(restored.fonts[0].data.length).toBeGreaterThan(1000);});
  it('odrzuca złą wersję, NaN, brak szablonu, ujemne ilości i duplikaty ID',()=>{const p=project();expect(()=>parseProject(JSON.stringify({...p,version:99}))).toThrow();p.types[0].quantity=-1;expect(()=>parseProject(JSON.stringify(p))).toThrow();p.types[0].quantity=1;p.types.push({...p.types[0]});expect(()=>parseProject(JSON.stringify(p))).toThrow('Powtórzone');p.types.pop();p.types[0].templateId='missing';expect(()=>parseProject(JSON.stringify(p))).toThrow('Brak szablonu');});
});
describe('Eksport wektorowy',()=>{
  it('PDF: rzeczywiste mm, osadzone fonty, polski tekst, bez obrazów',async()=>{const p=project(140);p.productName='Zażółć gęślą jaźń';const before=JSON.stringify(p);const bytes=await exportPdf(p,registry),doc=await PDFDocument.load(bytes),page=doc.getPages()[0];expect(doc.getPageCount()).toBe(1);expect(page.getWidth()).toBeCloseTo(1400*MM_TO_PT,5);expect(page.getHeight()).toBeCloseTo(150*MM_TO_PT,5);expect(JSON.stringify(p)).toBe(before);
    const fontResources=page.node.Resources()!.lookup(PDFName.of('Font'),PDFDict);expect(fontResources.keys().length).toBe(3);
    for(const key of fontResources.keys()){const font=fontResources.lookup(key,PDFDict);const descendant=font.lookup(PDFName.of('DescendantFonts'),PDFArray).lookup(0,PDFDict);const descriptor=descendant.lookup(PDFName.of('FontDescriptor'),PDFDict);expect(descriptor.has(PDFName.of('FontFile2'))||descriptor.has(PDFName.of('FontFile3'))).toBe(true);}
    expect(page.node.Resources()!.lookup(PDFName.of('XObject'),PDFDict).keys()).toHaveLength(0);
    mkdirSync(artifacts,{recursive:true});writeFileSync(join(artifacts,'etykiety.pdf'),bytes);
  });
  it('wielostronicowy PDF zachowuje wysokość i liczbę etykiet',async()=>{const p=project(29);p.material.maxLength=30;const bytes=await exportPdf(p,registry);const doc=await PDFDocument.load(bytes);expect(doc.getPageCount()).toBe(2);expect(doc.getPages().every(p=>Math.abs(p.getHeight()-30*MM_TO_PT)<1e-6)).toBe(true);});
  it('SVG: mm, viewBox, krzywe zamiast tekstu, bez uchwytów i siatki',()=>{const p=project(28),sheet=packLabels(p).sheets[0],svg=svgSheet(p,sheet,registry);expect(svg).toContain('width="1400mm" height="30mm" viewBox="0 0 1400 30"');expect(svg).toContain('<path d="M');expect(svg).not.toContain('<text');expect(svg).not.toContain('pattern');expect(svg).not.toContain('data:image');writeFileSync(join(artifacts,'etykiety.svg'),svg);});
  it('ponowny eksport i zmiana szerokości nie przesuwają licznika',async()=>{const p=project(2),before=generateLabels(p);await exportPdf(p,registry);await exportPdf(p,registry);p.material.width=100;await exportPdf(p,registry);expect(generateLabels(p)).toEqual(before);});
  it('brak glifów blokuje PDF nawet przy zgodzie na przepełnienie',async()=>{const p=project(1);p.productName='\u{1F984}';await expect(exportPdf(p,registry,{allowOverflow:true})).rejects.toThrow('Brak znaków');});
});

// Ordinary LAN HTTP does not expose crypto.randomUUID.
it('tworzy unikalne UUID również bez bezpiecznego kontekstu HTTPS',()=>{
  const original=globalThis.crypto;
  vi.stubGlobal('crypto',{getRandomValues:original.getRandomValues.bind(original)});
  try{const ids=Array.from({length:100},()=>uid());expect(new Set(ids).size).toBe(100);for(const id of ids)expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);}finally{vi.stubGlobal('crypto',original);}
});
