import {mkdir,readdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=JSON.parse(await readFile('package.json','utf8'));
await mkdir('LICENSES',{recursive:true});
const visited=new Set(),notices=[];
async function collect(name){
  if(visited.has(name))return;visited.add(name);
  const dir=path.join('node_modules',name),p=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
  const files=(await readdir(dir)).filter(f=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(f));
  notices.push(`${p.name}@${p.version} — ${p.license||'see package'}\n${JSON.stringify(p.repository||'')}\n${files.length?'Included license: '+files.join(', '):'License declared in package metadata. README copied for original notice.'}\n`);
  for(const file of files)await copyFile(path.join(dir,file),path.join('LICENSES',name.replaceAll('/','_')+'-'+file));
  if(!files.length) {
    await writeFile(path.join('LICENSES',name.replaceAll('/','_')+'-package.json'),JSON.stringify({name:p.name,version:p.version,author:p.author,contributors:p.contributors,license:p.license,repository:p.repository},null,2));
    if((await readdir(dir)).includes('README.md'))await copyFile(path.join(dir,'README.md'),path.join('LICENSES',name.replaceAll('/','_')+'-README.md'));
  }
  for(const dep of Object.keys(p.dependencies||{}))await collect(dep);
}
for(const dep of Object.keys(root.dependencies))await collect(dep);
await copyFile('public/fonts/LICENSE-Liberation.txt','LICENSES/FONTY-Liberation-OFL.txt');
// Preserve notices from dependencies bundled within fontkit, in addition to npm-level dependencies.
const fontkit=await readFile('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js','utf8');
const comments=[...fontkit.matchAll(/\/\*[\s\S]*?\*\/|(?:^\s*\/\/[^\n]*\n)+/gm)].map(m=>m[0]).filter(s=>/copyright|license|redistribution|permission is hereby/i.test(s));
await writeFile('LICENSES/fontkit-bundled-notices.txt',comments.join('\n\n'));
await writeFile('LICENSES/INDEKS.txt','Local runtime dependencies and fonts\n\n'+notices.join('\n')+'\nLiberation Fonts — SIL Open Font License 1.1 (see FONTY-Liberation-OFL.txt)\n');
console.log('Licencje i oryginalne informacje: '+visited.size+' pakietów oraz fonty Liberation.');
