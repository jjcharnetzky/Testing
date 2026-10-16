// Local/LAN static server. Uses only the Node.js standard library.
import http from 'node:http';
import https from 'node:https';
import {readFile,stat} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf'};
const host=process.env.LABEL_HOST||'127.0.0.1',port=Number(process.env.LABEL_PORT||4173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('LABEL_PORT musi być numerem portu od 1 do 65535.');
const certificate=process.env.LABEL_TLS_CERT,key=process.env.LABEL_TLS_KEY;
if(Boolean(certificate)!==Boolean(key))throw new Error('HTTPS wymaga obu plików: LABEL_TLS_CERT oraz LABEL_TLS_KEY.');
const tls=certificate?{cert:await readFile(certificate),key:await readFile(key)}:null;
const handle=async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost');
    const name=decodeURIComponent(url.pathname);
    const location=path.resolve(root,'.'+name);
    if(location!==root&&!location.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    let file=location;
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Nie znaleziono pliku. Sprawdź, czy folder dist jest kompletny.');}
};
const server=tls?https.createServer(tls,handle):http.createServer(handle);
server.on('error',error=>{console.error('Nie można uruchomić serwera:',error.message);process.exit(1);});
server.listen(port,host,()=>{
  const scheme=tls?'https':'http';
  console.log(`Etykietson: ${scheme}://localhost:${port} (Ctrl+C kończy pracę)`);
  if(host==='0.0.0.0'||host==='::'){
    const addresses=[...new Set(Object.values(networkInterfaces()).flat().filter(i=>i&&!i.internal&&i.family==='IPv4').map(i=>i.address))];
    console.log('\nAdresy dla użytkowników sieci firmowej:');
    for(const address of addresses)console.log(`  ${scheme}://${address}:${port}`);
    if(!addresses.length)console.log('  Brak aktywnego interfejsu IPv4. Sprawdź połączenie sieciowe.');
    console.log('\nOtwórz jeden z adresów w Edge lub Chrome na drugim komputerze w tej samej sieci.');
    if(!tls)console.log('Edycja i PDF działają przez HTTP. Praca offline na stacjach LAN wymaga HTTPS z zaufanym certyfikatem (instrukcja: SIEC-FIRMOWA.md).');
  }
});
