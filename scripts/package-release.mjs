import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {zipSync,strToU8} from 'fflate';
import {createHash} from 'node:crypto';
const excluded=new Set(['node_modules','.git','release','test-results','playwright-report']);
async function walk(dir='.'){
  const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){
    if(excluded.has(entry.name)||entry.name.endsWith('.tsbuildinfo')||/\.(pem|key|pfx|p12)$/i.test(entry.name)||/^\.env(?:\.|$)/.test(entry.name))continue;
    const file=path.join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(file));else files.push(file.replaceAll('\\','/'));
  }return files;
}
await mkdir('release',{recursive:true});
const all=await walk();
const offline=all.filter(f=>f.startsWith('dist/')||f.startsWith('przyklady/')||f.startsWith('LICENSES/')||['server.mjs','start.bat','start-serwer-lan.bat','README.md','TESTY.md','SIEC-FIRMOWA.md','BEZ-INSTALACJI.md'].includes(f));
const outputs=[];
for(const [name,files] of [['Generator-etykiet-LAN',offline],['Generator-etykiet-offline',offline],['Generator-etykiet-projekt',all]]){
  const content={},checks=[];
  for(const file of files.sort()){const data=await readFile(file);content[name+'/'+file]=data;checks.push(createHash('sha256').update(data).digest('hex')+'  '+file);}
  content[name+'/SHA256SUMS.txt']=strToU8(checks.join('\n')+'\n');
  const packed=zipSync(content,{level:6}),target='release/'+name+'.zip';await writeFile(target,packed);
  outputs.push(createHash('sha256').update(packed).digest('hex')+'  '+name+'.zip');
  console.log(target+' — '+files.length+' plików, '+(packed.length/1048576).toFixed(2)+' MB');
}
const standalone=await readFile('release/Generator-etykiet.html');
outputs.push(createHash('sha256').update(standalone).digest('hex')+'  Generator-etykiet.html');
await writeFile('release/SHA256SUMS.txt',outputs.join('\n')+'\n');
