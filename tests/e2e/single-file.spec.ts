import {test,expect,chromium} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {unzipSync,strFromU8} from 'fflate';
import http from 'node:http';
const directFile=process.env.SINGLE_FILE_FILE_URL==='1';
const fileUrl=directFile?pathToFileURL(path.resolve('release/Generator-etykiet.html')).href:'http://localhost:4176/';
let host:http.Server;
test.beforeAll(async()=>{if(directFile)return;const html=readFileSync('release/Generator-etykiet.html');host=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);});await new Promise<void>(resolve=>host.listen(4176,'127.0.0.1',resolve));});
test.afterAll(async()=>{if(host)await new Promise<void>((resolve,reject)=>host.close(e=>e?reject(e):resolve()));});
const launchOptions={headless:true,executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']};

test('jeden HTML: komplet zasobów, własny font, eksport/import projektu, PDF i DXF',async({page,context},testInfo)=>{
  const errors:string[]=[],remote:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==fileUrl)remote.push(r.url());});
  // HTTP is only a test harness; the single HTML contains every runtime asset.
  if(directFile)await context.setOffline(true);
  await page.goto(fileUrl);
  await context.setOffline(true);
  await expect(page.locator('.offline-pill')).toContainText('Bez instalacji · offline');
  await expect(page.locator('.label-svg path').first()).toBeAttached();
  await expect(page.locator('.project-meta')).toContainText('Zapisano lokalnie');
  await page.getByLabel('Nazwa elementu na etykiecie').fill('Zażółć gęślą jaźń');
  await page.locator('.layers button').filter({hasText:'{nr_seryjny}'}).click();
  await page.getByRole('button',{name:'Importuj font TTF / OTF'}).click();
  await page.locator('input[type=file]').nth(1).setInputFiles('public/fonts/LiberationMono-Regular.ttf');
  await expect(page.getByRole('status')).toContainText('Font zapisany lokalnie');
  await page.getByRole('button',{name:'Dodaj grafikę PNG'}).click();await page.locator('input[type=file]').nth(2).setInputFiles('tests/fixtures/logo-alpha.png');await expect(page.locator('.label-svg image')).toHaveCount(1);
  await page.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
  await page.getByLabel('Nazwa bieżącego projektu').fill('Bez instalacji — próba');
  const backupPending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz projekt',exact:true}).click();
  const backup=await backupPending,data=JSON.parse(readFileSync((await backup.path())!,'utf8'));
  expect(data.fonts.some((f:any)=>f.id.startsWith('import-'))).toBe(true);
  expect(data.fonts.every((f:any)=>f.data.length>1000)).toBe(true);
  await page.getByRole('button',{name:'Nowy projekt',exact:true}).click();
  await page.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
  await page.locator('input[type=file]').first().setInputFiles({name:'etykiety.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.locator('.project-name')).toContainText('Bez instalacji — próba');
  await page.getByRole('button',{name:'Eksportuj do druku'}).click();
  await expect(page.locator('.success-box')).toBeVisible();
  const pdfPending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz wektorowy PDF'}).click();
  const pdf=await pdfPending,bytes=readFileSync((await pdf.path())!);
  const doc=await PDFDocument.load(bytes);
  expect(doc.getPages()[0].getWidth()*25.4/72).toBeCloseTo(1400,5);
  expect(doc.getPages()[0].getHeight()*25.4/72).toBeCloseTo(150,5);
  const packagePending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz pakiet PDF + DXF',exact:true}).click();
  const files=unzipSync(readFileSync((await (await packagePending).path())!));expect(files['arkusz-001.pdf']).toBeDefined();expect(strFromU8(files['arkusz-001.dxf'])).toContain('HATCH');expect(files['obrazy/grafika-001.png']).toEqual(new Uint8Array(readFileSync('tests/fixtures/logo-alpha.png')));
  await page.getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.getByRole('button',{name:'Instrukcja',exact:true}).first().click();
  await expect(page.getByText('Otwieranie bez instalacji',{exact:true})).toBeVisible();
  await page.getByText('Licencje fontów i dołączonych bibliotek',{exact:true}).click();
  await expect(page.locator('.embedded-licenses pre')).toContainText('SIL OPEN FONT LICENSE');
  await page.getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.screenshot({path:testInfo.outputPath('pojedynczy-plik.png'),fullPage:true});
  expect(remote).toEqual([]);expect(errors).toEqual([]);
});

test('jeden HTML: IndexedDB zachowuje projekt po zamknięciu i ponownym uruchomieniu przeglądarki offline',async()=>{
  const profile=await mkdtemp(path.join(tmpdir(),'etykiety-file-profile-'));
  let context;
  try{
    context=await chromium.launchPersistentContext(profile,launchOptions);if(directFile)await context.setOffline(true);
    let page=await context.newPage();await page.goto(fileUrl);await context.setOffline(true);
    await expect(page.locator('.label-svg path').first()).toBeAttached();
    await page.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
    await page.getByLabel('Nazwa bieżącego projektu').fill('Projekt zachowany po restarcie');
    await page.getByRole('button',{name:'Zamknij',exact:true}).click();
    await page.getByLabel('Nazwa elementu na etykiecie').fill('Trwały zapis Żółć');
    await expect(page.locator('.project-meta')).toContainText('Zapisano lokalnie');
    await context.close();context=undefined;
    context=await chromium.launchPersistentContext(profile,launchOptions);if(directFile)await context.setOffline(true);
    page=await context.newPage();await page.goto(fileUrl);await context.setOffline(true);
    await expect(page.locator('.project-name')).toContainText('Projekt zachowany po restarcie');
    await expect(page.getByLabel('Nazwa elementu na etykiecie')).toHaveValue('Trwały zapis Żółć');
    await page.getByRole('button',{name:'Eksportuj do druku'}).click();
    await expect(page.locator('.success-box')).toBeVisible();
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz wektorowy PDF'}).click();
    expect((await PDFDocument.load(readFileSync((await (await pending).path())!))).getPageCount()).toBe(1);
  }finally{if(context)await context.close();await rm(profile,{recursive:true,force:true});}
});

test('jeden HTML: blokada IndexedDB i localStorage pozwala pracować z jawnym zapisem plikowym',async({page,context})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Zapis zablokowany przez zasady','SecurityError');}});
    Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Zapis zablokowany przez zasady','SecurityError');}});
  });
  await page.goto(fileUrl);await context.setOffline(true);
  await expect(page.locator('.label-svg path').first()).toBeAttached();
  await expect(page.locator('.project-meta')).toContainText('W tej karcie · pobierz kopię');
  await expect(page.getByRole('status')).toContainText('Przeglądarka blokuje trwały zapis');
  await page.getByLabel('Nazwa elementu na etykiecie').fill('Zapis do pliku Żółć');
  await page.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz projekt',exact:true}).click();
  const data=JSON.parse(readFileSync((await (await pending).path())!,'utf8'));
  expect(data.types[0].elementName).toBe('Zapis do pliku Żółć');
  await page.getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.getByRole('button',{name:'Eksportuj do druku'}).click();
  await expect(page.locator('.success-box')).toBeVisible();
  const pdf=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz wektorowy PDF'}).click();
  expect((await PDFDocument.load(readFileSync((await (await pdf).path())!))).getPageCount()).toBe(1);
});
