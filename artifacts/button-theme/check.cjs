const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const{chromium}=require('playwright');
const results=[];
async function colors(locator){return locator.evaluate(el=>{
 const rgba=value=>{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)};
 const stack=[];for(let node=el;node;node=node.parentElement)stack.push(rgba(getComputedStyle(node).backgroundColor));
 let bg=[255,255,255];for(const color of stack.reverse())bg=bg.map((v,i)=>color[i]*color[3]+v*(1-color[3]));
 const style=getComputedStyle(el);const fg=rgba(style.color);const luminance=color=>color.map(v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
 const light=luminance(fg.slice(0,3)),dark=luminance(bg);return {background:style.backgroundColor,image:style.backgroundImage,color:style.color,contrast:(Math.max(light,dark)+0.05)/(Math.min(light,dark)+0.05),border:style.borderColor};
});}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:theme,reducedMotion:'reduce'});
 await context.addInitScript(()=>{const map=new Map([['budget-app:onboarding-version','3']]);Object.defineProperty(window,'localStorage',{value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}})});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/artifacts/button-theme/preview.html');await page.locator('#default').waitFor();
 const states={};for(const id of ['default','outline','secondary','ghost','link','destructive','selected','unselected','choice-selected','choice-unselected']){
  states[id]=await colors(page.locator('#'+id));assert(states[id].contrast>=4.5,`${theme} ${id}: ${JSON.stringify(states[id])}`);
  assert.equal(states[id].image,'none',`${id} should not have a glass highlight over its background`);
 }
 assert.notEqual(states.selected.background,states.unselected.background);assert.notEqual(states['choice-selected'].background,states['choice-unselected'].background);
 const normal=states.default.background;await page.locator('#default').hover();assert.notEqual((await colors(page.locator('#default'))).background,normal,'Hover should change the primary background');
 await page.mouse.move(0,0);await page.locator('h1').click();await page.keyboard.press('Tab');
 assert(await page.locator('#default').evaluate(el=>el.matches(':focus-visible')),'Keyboard focus must be visible');
 assert(await page.locator('#disabled').isDisabled());
 await page.locator('h1').click();await page.screenshot({path:path.join(__dirname,`palette-${theme}.png`)});
 for(const [route,groupName] of [['budget','预算分类筛选'],['reports','报表视图'],['loans','贷款状态筛选'],['transactions','收支类型']]){
  await page.goto('http://127.0.0.1:5173/app/'+route);const group=page.getByRole('group',{name:groupName,exact:true});await group.waitFor();
  const selected=group.locator('[aria-pressed="true"]');assert.equal((await colors(selected)).background,states.selected.background,`${route}: inconsistent selected background`);
  await group.getByRole('button').last().click();assert.equal(await group.getByRole('button').last().getAttribute('aria-pressed'),'true');
 }
 const before=await page.evaluate(()=>localStorage.getItem('personal-budget-app:v1'));
 await page.getByRole('navigation',{name:'主要导航',exact:true}).getByRole('button',{name:'快速记账',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'快速记账',exact:true});await modal.waitFor();
 await modal.getByRole('button',{name:'收入',exact:true}).click();assert.equal(await modal.getByRole('button',{name:'收入',exact:true}).getAttribute('aria-pressed'),'true');
 const choices=modal.getByRole('group',{name:'分类',exact:true});await choices.getByRole('button').nth(1).click();assert.equal(await choices.getByRole('button').nth(1).getAttribute('aria-pressed'),'true');
 assert((await colors(modal.getByRole('button',{name:'保存',exact:true}))).contrast>=4.5);
 await modal.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('personal-budget-app:v1')),before);
 await page.goto('http://127.0.0.1:5173/app/budget');await page.locator('summary').first().click();await page.getByRole('button',{name:'删除预算',exact:true}).first().click();
 const confirm=page.getByRole('alertdialog');const danger=await colors(confirm.getByRole('button',{name:'删除',exact:true}));assert(danger.contrast>=4.5,JSON.stringify(danger));
 await confirm.getByRole('button',{name:'取消',exact:true}).click();assert.equal(errors.length,0,errors.join('\n'));
 results.push({theme,states,dangerConfirm:danger,consistentPageSelection:true,quickEntrySelection:true,cancelPreservesData:true,keyboardFocus:true,hover:true});await context.close();
 console.log(`PASS ${theme}: 10 button states, contrast >= 4.5, page selections, form choices, hover, focus, danger confirmation`);
}
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
