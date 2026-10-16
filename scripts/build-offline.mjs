import {readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
async function walk(dir){const all=[];for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())all.push(...await walk(file));else if(e.name!=='sw.js')all.push(file);}return all;}
const files=await walk('dist');
const hash=createHash('sha256');for(const file of files)hash.update(await readFile(file));
const version=hash.digest('hex').slice(0,16);
const assets=['/',...files.map(f=>'/'+f.slice(5).replaceAll('\\','/'))];
await writeFile('dist/sw.js',`const CACHE='etykiety-${version}';\nconst ASSETS=${JSON.stringify(assets)};\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('etykiety-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>r.ok?r:caches.match(e.request).then(c=>c||r)).catch(()=>caches.match(e.request).then(r=>r||new Response('Brak lokalnego pliku',{status:503}))));});\n`);
console.log('Service Worker: '+assets.length+' lokalnych zasobów, wersja '+version);
