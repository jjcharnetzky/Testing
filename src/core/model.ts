import { z } from 'zod';
import { pngInfo } from './png';
// randomUUID is unavailable on ordinary HTTP LAN origins. getRandomValues
// remains available there; keep RFC 4122 version/variant bits and random IDs.
export const uid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const mm = z.number().finite().min(0).max(10000);
const size = z.number().finite().positive().max(5000);
const base = { id: z.string().min(1), x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000), w: size, h: size, rotation: z.number().finite().min(-360).max(360) };
export const objectSchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('text'), text: z.string().max(10000), fontId: z.string(), fontSize: z.number().min(1).max(300), align: z.enum(['left','center','right']), valign: z.enum(['top','middle','bottom']).optional(), lineHeight: z.number().min(0.5).max(5) }),
  z.object({ ...base, kind: z.literal('rect'), stroke: z.number().min(0.01).max(5) }),
  z.object({ ...base, kind: z.literal('line'), stroke: z.number().min(0.01).max(5) }),
  z.object({ ...base, kind: z.literal('image'), data: z.string().min(1).max(14_000_000), name: z.string().max(200), pixelWidth: z.number().int().positive().max(30000), pixelHeight: z.number().int().positive().max(30000), keepAspect: z.boolean().default(true) }),
]);
export const templateSchema = z.object({ id: z.string(), name: z.string().min(1).max(100), border: z.boolean(), borderWidth: z.number().min(0.01).max(5), objects: z.array(objectSchema).max(200) });
export const projectSchema = z.object({
  version: z.union([z.literal(1),z.literal(2)]), id: z.string().min(1), name: z.string().min(1).max(200), productName: z.string().max(500), updatedAt: z.string(),
  material: z.object({ width: size, maxLength: size, left: mm, right: mm, top: mm, bottom: mm, gapX: mm, gapY: mm, autoRotate: z.boolean() }),
  numbering: z.object({ mode: z.enum(['separate','shared','sets']), start: z.number().int().min(0).max(1e9), step: z.number().int().min(1).max(1e6), digits: z.number().int().min(1).max(12), month: z.number().int().min(1).max(12), year: z.number().int().min(1900).max(9999), format: z.string().min(1).max(100).refine(v => v.includes('{numer}'), 'Format musi zawierać {numer}.'), products: z.number().int().min(1).max(20000) }),
  types: z.array(z.object({ id: z.string(), name: z.string().min(1).max(100), elementName: z.string().max(500), quantity: z.number().int().min(0).max(20000), perProduct: z.number().int().min(0).max(20000), start: z.number().int().min(0).max(1e9), width: size, height: size, rotated: z.boolean(), templateId: z.string() })).min(1).max(1000),
  templates: z.array(templateSchema).min(1).max(1000),
  fonts: z.array(z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(200), family: z.string().min(1).max(200), bold: z.boolean(), italic: z.boolean(), data: z.string().max(28000000) })).max(100),
}).superRefine((p, ctx) => {
  const unique = (items: {id: string}[], label: string) => { if (new Set(items.map(t=>t.id)).size !== items.length) ctx.addIssue({code:'custom',message:`Powtórzone identyfikatory: ${label}.`}); };
  unique(p.types,'rodzaje'); unique(p.templates,'szablony'); unique(p.fonts,'fonty');
  for (const t of p.templates) {
    unique(t.objects,'obiekty');
    for(const o of t.objects)if(o.kind==='image'){try{const info=pngInfo(o.data);if(info.width!==o.pixelWidth||info.height!==o.pixelHeight)throw new Error('Wymiary PNG nie zgadzają się z projektem.');}catch(e){ctx.addIssue({code:'custom',message:(e as Error).message});}}
  }
  if (p.types.some(t => !p.templates.some(s=>s.id===t.templateId))) ctx.addIssue({code:'custom',message:'Brak szablonu przypisanego do rodzaju.'});
  const unknown = p.numbering.format.replace(/\{(numer|miesiac|rok)\}/g,'');
  if (/[{}]/.test(unknown)) ctx.addIssue({code:'custom',message:'Nieznany znacznik formatu numeru.'});
});
export type LabelObject = z.infer<typeof objectSchema>;
export type ImageObject = Extract<LabelObject,{kind:'image'}>;
export type ImportedFont = z.infer<typeof projectSchema>['fonts'][number];
export type TextObject = Extract<LabelObject,{kind:'text'}>;
export type Template = z.infer<typeof templateSchema>;
export type Project = z.infer<typeof projectSchema>;
export type LabelType = Project['types'][number];
export const PT_TO_MM = 25.4 / 72;
export const MM_TO_PT = 72 / 25.4;
export function newTemplate(name = 'Klasyczna') : Template {
  return { id: uid(), name, border: true, borderWidth: 0.2, objects: [
    {id:uid(),kind:'text',text:'{nazwa_wyrobu}',x:3,y:3.5,w:44,h:5,rotation:0,fontId:'sans-bold',fontSize:9,align:'center',valign:'middle',lineHeight:1.15},
    {id:uid(),kind:'text',text:'{nazwa_elementu}',x:3,y:10.5,w:44,h:5,rotation:0,fontId:'sans-regular',fontSize:8,align:'center',valign:'middle',lineHeight:1.15},
    {id:uid(),kind:'line',x:3,y:18,w:44,h:0.1,rotation:0,stroke:0.15},
    {id:uid(),kind:'text',text:'{nr_seryjny}',x:3,y:21.5,w:44,h:5,rotation:0,fontId:'mono-bold',fontSize:10,align:'center',valign:'middle',lineHeight:1.15},
  ] };
}
export function newProject(demo = false): Project {
  const template = newTemplate();
  const names=['Tabliczka główna','Poszycie zewnętrzne','Stelaż nośny','Pokrowiec transportowy','Zestaw akcesoriów'];
  const quantities=[40,25,60,10,5];
  return { version:2,id:uid(),name:demo?'Zlecenie demonstracyjne':'Nowy projekt',productName:demo?'Namiot pneumatyczny':'Nazwa wyrobu',updatedAt:new Date().toISOString(),
    material:{width:1400,maxLength:3000,left:0,right:0,top:0,bottom:0,gapX:0,gapY:0,autoRotate:false},
    numbering:{mode:'separate',start:1,step:1,digits:3,month:new Date().getMonth()+1,year:new Date().getFullYear(),format:'{numer}/{miesiac}/{rok}',products:40},
    templates:[template], fonts:[],
    types:(demo?names:['Etykieta główna']).map((name,i)=>({id:uid(),name,elementName:name,quantity:demo?quantities[i]:28,perProduct:1,start:1,width:50,height:30,rotated:false,templateId:template.id})),
  };
}
export function parseProject(text: string): Project {
  if (text.length > 120_000_000) throw new Error('Plik projektu przekracza limit 120 MB.');
  let raw: unknown; try { raw=JSON.parse(text); } catch { throw new Error('Plik nie jest poprawnym JSON.'); }
  const result=projectSchema.safeParse(raw);
  if (!result.success) throw new Error('Niepoprawny projekt: '+result.error.issues.slice(0,4).map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
  return {...result.data,version:2};
}
