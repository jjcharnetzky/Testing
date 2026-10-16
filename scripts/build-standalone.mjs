// Produce one HTML document. No server, external resources or npm at runtime.
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const index=await readFile('dist/index.html','utf8');
const js=index.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const stylesheet=index.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if(!js||!stylesheet)throw new Error('Nie znaleziono plików buildu Vite.');
let bundle=await readFile(path.join('dist',js),'utf8');
let css=await readFile(path.join('dist',stylesheet),'utf8');
const fonts={},fontFiles={};
for(const [id,name] of [['sans','LiberationSans'],['serif','LiberationSerif'],['mono','LiberationMono']]){
  for(const [style,file] of [['regular','Regular'],['bold','Bold'],['italic','Italic'],['bolditalic','BoldItalic']]){
    const filename=`${name}-${file}.ttf`;
    const data=(await readFile('public/fonts/'+filename)).toString('base64');
    fonts[`${id}-${style}`]=data;fontFiles[filename]=data;
  }
}
css=css.replace(/url\((['"]?)\/fonts\/([^)'"\s]+)\1\)/g,(_,quote,filename)=>{
  if(!fontFiles[filename])throw new Error('Nieznany font CSS: '+filename);
  return `url("data:font/ttf;base64,${fontFiles[filename]}")`;
});
if(/url\((['"]?)\//.test(css))throw new Error('W CSS pozostał zewnętrzny zasób.');
const licenses=[];
for(const file of (await readdir('LICENSES')).sort())licenses.push(file+'\n\n'+await readFile('LICENSES/'+file,'utf8'));
const embedded=JSON.stringify({fonts,licenses:licenses.join('\n\n--------------------\n\n')}).replace(/</g,'\\u003c');
const icon='data:image/svg+xml;base64,'+(await readFile('public/favicon.svg')).toString('base64');
// Escape closing HTML raw-text tags within JS/CSS strings.
bundle=bundle.replace(/<\/script/gi,'<\\/script');
css=css.replace(/<\/style/gi,'<\\/style');
const html=`<!doctype html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#12634c"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'"><title>Generator etykiet — bez instalacji</title><link rel="icon" href="${icon}"><style>${css}\n.embedded-licenses pre{white-space:pre-wrap;font-size:10px;line-height:1.5;max-height:300px;overflow:auto;padding:14px;background:#f5f7f2;color:#728669}</style></head><body><div id="root"></div><script>window.__LABEL_SINGLE_FILE__=${embedded};</script><script type="module">${bundle}</script></body></html>`;
await mkdir('release',{recursive:true});
await writeFile('release/Generator-etykiet.html',html);
console.log('Pojedynczy HTML bez instalacji: '+(Buffer.byteLength(html)/1048576).toFixed(2)+' MB; 12 fontów i licencje w środku.');
