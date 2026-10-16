import {it,expect} from 'vitest';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import https from 'node:https';
it('HTTPS: serwuje aplikację z pełną weryfikacją zaufanego certyfikatu',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'etykiety-tls-'));
  let server;
  try{
    const key=path.join(temp,'key.pem'),cert=path.join(temp,'certificate.pem');
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-keyout',key,'-out',cert,'-sha256','-days','1','-nodes','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
    server=spawn(process.execPath,['server.mjs'],{env:{...process.env,LABEL_HOST:'127.0.0.1',LABEL_PORT:'4175',LABEL_TLS_CERT:cert,LABEL_TLS_KEY:key},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Brak startu HTTPS')),10000);server.stdout.on('data',d=>{if(String(d).includes('https://localhost:4175')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(new Error('Błąd startu HTTPS'));});});
    const ca=await readFile(cert);
    const response=await new Promise((resolve,reject)=>{https.get('https://127.0.0.1:4175/',{ca},r=>{const verified=r.socket.authorized;let text='';r.setEncoding('utf8');r.on('data',d=>text+=d);r.on('end',()=>resolve({status:r.statusCode,text,verified}));}).on('error',reject);});
    expect(response.status).toBe(200);expect(response.text).toContain('Generator etykiet');expect(response.verified).toBe(true);
  }finally{if(server?.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});await rm(temp,{recursive:true,force:true});}
},15000);
it('HTTPS: brak klucza jest błędem, serwer nie przechodzi po cichu na HTTP',async()=>{
  const result=await new Promise(resolve=>{const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,LABEL_TLS_CERT:'nieistotny.pem',LABEL_TLS_KEY:''},stdio:['ignore','pipe','pipe']});let text='';child.stderr.on('data',d=>text+=d);child.on('exit',code=>resolve({code,text}));});
  expect(result.code).not.toBe(0);expect(result.text).toContain('HTTPS wymaga obu plików');
});
