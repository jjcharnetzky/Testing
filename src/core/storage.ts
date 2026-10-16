import type { Project } from './model';
import { singleFile } from './runtime';
const db = () => new Promise<IDBDatabase>((resolve,reject)=>{
  const r=indexedDB.open('generator-etykiet',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});
async function transact<T>(mode:IDBTransactionMode,operation:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const d=await db();
  return new Promise((resolve,reject)=>{
    const tx=d.transaction('projects',mode),r=operation(tx.objectStore('projects'));
    tx.oncomplete=()=>{d.close();resolve(r.result);};
    tx.onerror=()=>{d.close();reject(tx.error);};tx.onabort=()=>{d.close();reject(tx.error);};
  });
}
let temporary=false;
const memory=new Map<string,Project>();
export const temporaryStorage=()=>temporary;
async function withFallback<T>(operation:()=>Promise<T>,fallback:()=>T):Promise<T> {
  if(temporary)return fallback();
  try{return await operation();}catch(error){
    if(!singleFile)throw error;
    temporary=true;
    return fallback();
  }
}
export const listProjects=()=>withFallback(async()=>{
  const items=await transact('readonly',s=>s.getAll()) as Project[];
  if(singleFile)for(const item of items)memory.set(item.id,structuredClone(item));
  return items;
},()=>structuredClone([...memory.values()]));
export const saveProject=(p:Project)=>withFallback(async()=>{
  // Mirror the current session before a possible quota/permission failure.
  if(singleFile)memory.set(p.id,structuredClone(p));
  return transact('readwrite',s=>s.put(p));
},()=>{memory.set(p.id,structuredClone(p));return p.id;});
export const deleteProject=(id:string)=>{memory.delete(id);return withFallback(()=>transact('readwrite',s=>s.delete(id)),()=>undefined);};
export function lastProjectId(){try{return localStorage.getItem('last-project');}catch{return null;}}
export function rememberProject(id:string){try{localStorage.setItem('last-project',id);}catch{/* Choosing the latest saved project still works without this optional hint. */}}

export function download(data: BlobPart, name: string, type: string) {
  const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
