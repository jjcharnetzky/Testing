import {chromium} from '@playwright/test';
import {mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
// Run after npm run build, with node server.mjs running on localhost:4173.
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
try {
  const page=await browser.newPage();await page.goto('http://localhost:4173');
  await page.getByRole('button',{name:'Eksportuj do druku'}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.project-actions .primary').disabled);
  await mkdir('przyklady',{recursive:true});
  await page.locator('.project-actions').getByRole('button',{name:'Projekty',exact:true}).click();
  const projectPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz projekt',exact:true}).click();
  await (await projectPromise).saveAs('przyklady/projekt-demonstracyjny.etykiety.json');
  await page.getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.getByRole('button',{name:'Eksportuj do druku'}).click();
  const controlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Plik kontrolny 1:1',exact:true}).click();
  await (await controlPromise).saveAs('przyklady/kontrola-skali-50x30-100mm.pdf');
  const pdfPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Pobierz wektorowy PDF'}).click();
  await (await pdfPromise).saveAs('przyklady/demo-140-etykiet.pdf');
  console.log('Zapisano kompletny projekt demonstracyjny, PDF 140 etykiet i plik kontrolny.');
} finally {await browser.close();}
