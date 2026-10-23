import {test,expect} from '@playwright/test';
for(const consent of ['yes','no','unset'])test(`retired analytics ignores ${consent} and preserves other settings`,async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/google-analytics|googletagmanager|analytics\.(js|html)/.test(r.url()))requests.push(r.url());});
 await page.addInitScript(c=>{localStorage.setItem('binteumeopsi-analytics-consent-v1',c);localStorage.setItem('binteumeopsi-guide','1');localStorage.setItem('ui-preserved-setting','keep');},consent);
 await page.goto('/');await page.getByRole('button',{name:/나만의 맞물림 타일/}).click();
 for(const name of ['패턴 작업실','디자인 쇼룸','틈새 챌린지','수학 탐구','나의 작품']){
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.locator('.release-footer,.creator-signature,.analytics-choice,iframe')).toHaveCount(0);
  await expect(page.getByText(/기획·제작|방문통계 설정/)).toHaveCount(0);
 }
 await page.reload();await expect(page.getByRole('button',{name:/나만의 맞물림 타일/})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('binteumeopsi-analytics-consent-v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('ui-preserved-setting'))).toBe('keep');expect(requests).toEqual([]);
});
for(const [width,height] of [[1920,1080],[1366,768],[820,1180],[390,844],[360,800]])test(`tile onboarding and panel scrolling ${width}`,async({page,context})=>{
 await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('binteumeopsi-guide','1'));
 await page.goto('/');await page.getByRole('button',{name:/나만의 맞물림 타일/}).click();
 await expect(page.getByText('이 점을 움직여 보세요!',{exact:true})).toBeVisible();
 await expect(page.locator('.tile-point-halo')).toHaveCount(1);
 const art=await page.locator('.artboard').boundingBox(),hint=await page.locator('.tile-hint').boundingBox();expect(hint!.y+hint!.height).toBeLessThanOrEqual(art!.y+1);
 const point=page.getByRole('button',{name:'꼭짓점 1 · 방향키로 이동',exact:true});const cx=await point.getAttribute('cx');
 if(width<=390){
  await page.getByRole('button',{name:'한 조각 집중 편집',exact:true}).click();
  const box=(await point.boundingBox())!;const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+8,y:y+4,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.getByRole('button',{name:'전체 16:9 구도로 돌아가기',exact:true}).click();
 }else{await point.focus();await page.keyboard.press('ArrowRight');}
 await expect(point).not.toHaveAttribute('cx',cx!);await expect(page.locator('.tile-hint')).toHaveCount(0);
 if(width<=600)await page.getByRole('button',{name:'색 / 재질',exact:true}).click();else if(width<=1100)await page.getByTitle('스타일 패널 접기',{exact:true}).click();else await page.getByRole('button',{name:'색 / 무늬',exact:true}).click();
 await page.locator('.right-panel').evaluate(e=>e.scrollTop=e.scrollHeight);
 await page.screenshot({path:`qa/ui-final/details/${width}-style-bottom.png`});
 await page.getByRole('button',{name:'디자인 쇼룸',exact:true}).click();await page.getByLabel('재질',{exact:true}).waitFor();
 await page.locator('.room-controls').evaluate(e=>e.scrollTop=e.scrollHeight);
 await expect(page.getByRole('button',{name:'쇼룸 PNG 저장',exact:true})).toBeInViewport();
 await page.screenshot({path:`qa/ui-final/details/${width}-room-bottom.png`});
 await page.getByRole('button',{name:'내보내기',exact:true}).click();await page.screenshot({path:`qa/ui-final/details/${width}-export.png`});
 await expect(page.getByRole('button',{name:'편집 가능한 프로젝트 파일 저장',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('first pattern journey does not cover editable canvas',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');await page.getByRole('button',{name:'패턴 만들기',exact:true}).click();
 await expect(page.locator('.creation-journey')).toBeVisible();const g=await page.locator('.creation-journey').boundingBox(),a=await page.locator('.artboard').boundingBox();expect(g!.y+g!.height).toBeLessThanOrEqual(a!.y+1);
 await page.screenshot({path:'qa/ui-final/details/360-first-journey.png'});
});
