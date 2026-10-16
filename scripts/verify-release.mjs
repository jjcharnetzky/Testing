// Developer acceptance check; the extracted runtime itself uses no npm packages.
import {chromium} from '@playwright/test';
import {unzipSync} from 'fflate';
import {readFile,mkdtemp,mkdir,writeFile,access,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
const distribution=process.argv[2]||'Generator-etykiet-offline';
if(!['Generator-etykiet-offline','Generator-etykiet-LAN'].includes(distribution))throw new Error('Nieznana paczka.');
const temp=await mkdtemp(path.join(tmpdir(),'etykiety-release-'));
let server,browser;
async function start(){
  let output='';server=spawn(process.execPath,['server.mjs'],{cwd:path.join(temp,distribution),stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
  await Promise.race([new Promise((resolve,reject)=>{server.stdout.on('data',()=>{if(output.includes('http://localhost:4173'))resolve();});server.on('exit',()=>reject(new Error(output)));}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Serwer nie uruchomił się: '+output)),10000))]);
}
async function stop(){if(server&&server.exitCode===null){const closed=once(server,'exit');server.kill();await closed;}server=undefined;}
try{
  const archive=unzipSync(await readFile('release/'+distribution+'.zip'));
  const root=distribution+'/';
  for(const [name,data] of Object.entries(archive)){
    const target=path.resolve(temp,name);if(!target.startsWith(temp+path.sep))throw new Error('Niepoprawna ścieżka ZIP');
    if(name.endsWith('/'))continue;await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data);
  }
  const manifest=new TextDecoder().decode(archive[root+'SHA256SUMS.txt']);
  for(const row of manifest.trim().split('\n')){const hash=row.slice(0,64),file=row.slice(66);const actual=createHash('sha256').update(archive[root+file]).digest('hex');if(hash!==actual)throw new Error('Błędna suma: '+file);}
  if(existsSync(path.join(temp,root,'node_modules')))throw new Error('Paczka nie powinna zawierać node_modules');
  await start();
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
  const context=await browser.newContext();const external=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='localhost')return route.continue();external.push(route.request().url());return route.abort();});
  let page=await context.newPage();await page.goto('http://localhost:4173');
  await page.waitForFunction(()=>document.querySelectorAll('.label-svg path').length>5);
  await page.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
  await page.getByLabel('Nazwa bieżącego projektu').fill('Próba restartu paczki offline');
  await page.getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.project-meta')?.textContent.includes('Zapisano lokalnie'));
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.close();await stop();await start();
  page=await context.newPage();await page.goto('http://localhost:4173');
  await page.waitForFunction(()=>document.querySelector('.project-name')?.textContent.includes('Próba restartu paczki offline'));
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.label-svg path').length>5);
  await page.getByLabel('Nazwa elementu na etykiecie').fill('Próba po restarcie');
  await page.getByRole('button',{name:'Eksportuj do druku'}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz wektorowy PDF'}).click();
  const downloaded=await pending;const bytes=await readFile(await downloaded.path());
  const doc=await PDFDocument.load(bytes);if(doc.getPageCount()!==1)throw new Error('Zła liczba stron PDF');
  if(Math.abs(doc.getPages()[0].getHeight()*25.4/72-150)>1e-6)throw new Error('Zły rozmiar PDF');
  if(external.length)throw new Error('Połączenia zewnętrzne: '+external.join(', '));
  console.log('PASS: sumy SHA-256; paczka bez node_modules; start bez internetu; restart serwera i aplikacji; zachowany projekt; edycja i PDF w trybie offline; 0 żądań zewnętrznych.');
}finally{try{if(browser)await browser.close();}finally{await stop();await rm(temp,{recursive:true,force:true});}}
