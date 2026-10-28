import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const received=new Set(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{const u=new URL(r.url());if(u.hostname.endsWith('google-analytics.com')&&r.ok())received.add(u.searchParams.get('tid'));});
 await page.goto('https://kkankong32-alt.github.io/binteumeopsi/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.dataLayer?.some(x=>x[0]==='event'),{},{timeout:30000});
 await page.waitForTimeout(10000);
 await page.screenshot({path:'qa/measurement/live-mobile.png'});
 assert.equal(await page.locator('.analytics-choice,.creator-signature').count(),0);
 assert.equal(await page.locator('.launch-poster').isVisible(),true);
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'패턴 만들기',exact:true}).click();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({livePage:'PASS',mobileAndReload:'PASS',analyticsHTTPAccepted:[...received],dashboardRealtime:'NOT RUN - no account dashboard inspected'}));
 assert(received.has('G-DC7N6KQBG0')&&received.has('G-5YW0T2C109'),'Both measurement destinations must return successful HTTP responses');
} finally {await browser.close();}
