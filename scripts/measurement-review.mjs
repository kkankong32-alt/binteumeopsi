import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const origin='https://kkankong32-alt.github.io';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const width of [1366,390]) {
  const page=await browser.newPage({viewport:{width,height:width===390?844:768}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:'/* Configuration test: no real analytics traffic */',contentType:'application/javascript'}));
  await page.route(origin+'/**',async r=>{
   const url=new URL(r.request().url());let rel=decodeURIComponent(url.pathname).replace(/^\/binteumeopsi\//,'');
   if(!rel||rel.endsWith('/'))rel+='index.html';
   const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2'};
   try{await r.fulfill({body:await readFile(path.join('dist',rel)),contentType:mime[path.extname(rel)]||'application/octet-stream'});}catch{await r.fulfill({status:404,body:''});}
  });
  await page.goto(origin+'/binteumeopsi/');
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.dataLayer?.some(x=>x[0]==='event'));
  const frame=page.frames().find(f=>f.url().endsWith('analytics.html'));
  const commands=await frame.evaluate(()=>dataLayer.map(x=>Array.from(x)));
  assert.deepEqual(commands.filter(x=>x[0]==='config').map(x=>x[1]),['G-DC7N6KQBG0','G-5YW0T2C109']);
  assert.equal(commands.filter(x=>x[0]==='event').length,1);
  assert.equal(await page.locator('.analytics-choice,.creator-signature').count(),0);
  assert.match(await page.locator('.launch-poster').getAttribute('alt'),/기획·제작: 쓰로인훈쌤 김종훈/);
  await mkdir('qa/measurement',{recursive:true});
  await page.screenshot({path:`qa/measurement/home-${width}.png`});
  await page.getByRole('button',{name:'패턴 만들기',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.dataLayer?.filter(x=>x[0]==='event').length===2);
  assert.equal(page.frames().filter(f=>f.url().endsWith('analytics.html')).length,1);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${width}: two IDs, home/studio views, stable isolated frame, no banners/errors, cover attribution`);
  await page.close();
 }
}finally{await browser.close();}
