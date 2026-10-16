import {test,expect} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {networkInterfaces} from 'node:os';
import {readFileSync,existsSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
const ip=Object.values(networkInterfaces()).flat().find(i=>i&&!i.internal&&i.family==='IPv4')?.address;
const url=`http://${ip}:4174`;
// Only this machine's interface and loopback connect directly. All other
// destinations are sent to an unused local proxy port, so this test has no Internet route.
test.use({launchOptions:{executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--proxy-server=http://127.0.0.1:9',`--proxy-bypass-list=${ip};localhost;127.0.0.1`]}});
let server:ChildProcess;
test.beforeAll(async()=>{
  if(!ip)throw new Error('Test LAN wymaga interfejsu IPv4.');
  server=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,LABEL_HOST:'0.0.0.0',LABEL_PORT:'4174'},stdio:['ignore','pipe','pipe']});
  await new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Serwer LAN nie uruchomił się.')),10000);
    server.stdout!.on('data',d=>{if(String(d).includes('http://localhost:4174')){clearTimeout(timer);resolve();}});
    server.on('exit',()=>{clearTimeout(timer);reject(new Error('Serwer LAN zakończył pracę przed startem.'));});
  });
});
test.afterAll(async()=>{if(server?.exitCode===null)await new Promise<void>(resolve=>{server.once('exit',()=>resolve());server.kill();});});
test('LAN HTTP: tworzenie, zapis, ponowne otwarcie i PDF przez adres innego niż localhost',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await expect(page.locator('.label-svg path').first()).toBeAttached();
  expect(await page.evaluate(()=>window.isSecureContext)).toBe(false);
  expect(await page.evaluate(()=>typeof crypto.randomUUID)).toBe('undefined');
  await expect(page.locator('.offline-pill')).toContainText('Sieć lokalna · tryb online');
  await page.getByRole('button',{name:'Dodaj rodzaj',exact:true}).click();await expect(page.locator('.type-card')).toHaveCount(6);
  await page.getByLabel('Nazwa elementu na etykiecie').fill('Etykieta LAN Żółć');
  await expect(page.locator('.project-meta')).toContainText('Zapisano lokalnie');
  await page.reload();await expect(page.locator('.type-card')).toHaveCount(6);
  await page.locator('.type-select').filter({hasText:'Nowy rodzaj'}).click();await expect(page.getByLabel('Nazwa elementu na etykiecie')).toHaveValue('Etykieta LAN Żółć');
  await page.getByRole('button',{name:'Eksportuj do druku'}).click();await expect(page.locator('.success-box')).toBeVisible();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz wektorowy PDF'}).click();
  const file=await pending,doc=await PDFDocument.load(readFileSync((await file.path())!));
  expect(doc.getPages()[0].getWidth()*25.4/72).toBeCloseTo(1400,5);
  expect(doc.getPages()[0].getHeight()*25.4/72).toBeCloseTo(180,5);
  expect(errors).toEqual([]);
});
test('LAN: dwa stanowiska mają osobne projekty i dynamiczny adres zapisu',async({browser})=>{
  const one=await browser.newContext(),two=await browser.newContext();
  try{
    const p1=await one.newPage();await p1.goto(url);await p1.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
    await p1.getByLabel('Nazwa bieżącego projektu').fill('Stanowisko konstruktora');
    await expect(p1.locator('.muted').filter({hasText:'Projekty są zapisane'})).toContainText(url);
    const p2=await two.newPage();await p2.goto(url);await expect(p2.locator('.project-name')).toHaveText(/Zlecenie demonstracyjne/);
    await p1.getByRole('button',{name:'Zamknij',exact:true}).click();await expect(p1.locator('.project-name')).toHaveText(/Stanowisko konstruktora/);
  }finally{await one.close();await two.close();}
});
