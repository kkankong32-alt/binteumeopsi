import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const phase=process.argv[2]||'before',url=process.argv[3]||'http://127.0.0.1:5193/';
const out=`qa/ui-final/${phase}`;await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const records=[];
for(const [width,height] of [[1920,1080],[1366,768],[820,1180],[390,844],[360,800]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 await context.addInitScript(()=>localStorage.setItem('binteumeopsi-guide','1'));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function snap(name){await page.screenshot({path:`${out}/${width}-${name}.png`,fullPage:true});records.push({width,height,name,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors:[...errors]});}
 await page.goto(url);await expect(page.locator('.launch-poster')).toHaveCSS('opacity','1');await snap('home');
 await page.getByRole('button',{name:/나만의 새|나만의 맞물림 타일/}).click();await page.locator('.artboard').waitFor();await snap('tile');
 await page.getByRole('button',{name:'디자인 쇼룸',exact:true}).click();await page.getByLabel('재질',{exact:true}).waitFor();await page.waitForTimeout(1600);await snap('showroom');
 await page.getByRole('button',{name:'틈새 챌린지',exact:true}).click();await snap('puzzle');
 await page.getByRole('button',{name:'수학 탐구',exact:true}).click();await snap('learn');
 await page.getByRole('button',{name:'나의 작품',exact:true}).click();await snap('gallery');
 await context.close();console.log(phase,width);
}
await browser.close();await fs.writeFile(`${out}/results.json`,JSON.stringify(records,null,2));

