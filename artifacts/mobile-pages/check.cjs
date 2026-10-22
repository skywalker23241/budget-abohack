const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const routes=['transactions','budget','income','reports','goals'];
const results=[];
async function fit(page,label){
 const values=await page.locator('[data-amount]:visible').evaluateAll(els=>els.map(el=>({text:el.textContent,width:el.clientWidth,scroll:el.scrollWidth})));
 assert(values.every(v=>v.scroll<=v.width+1),`${label}: ${JSON.stringify(values)}`);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: page overflow`);
 return values.length;
}
async function data(page){return page.evaluate(async()=>{const {useStore}=await import('/src/store/useStore.ts');return useStore.getState().exportData();});}
async function memoryContext(browser,width,height,colorScheme='light'){
 const context=await browser.newContext({viewport:{width,height},colorScheme,reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  // Storage exists only in this non-persistent test browser context.
  const map=new Map([['budget-app:onboarding-version','3']]);
  Object.defineProperty(window,'localStorage',{value:{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}});
 });return context;
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const [width,height,colorScheme] of [[320,690,'light'],[390,844,'light'],[430,932,'dark'],[1440,900,'light']]){
  const context=await memoryContext(browser,width,height,colorScheme);const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   await page.goto(`http://127.0.0.1:5173/app/${route}`);await page.locator('main h1').waitFor();
   const count=await fit(page,`${width} ${route}`);const before=await data(page);
   if(route==='transactions'){
    await page.getByRole('textbox',{name:'搜索备注或分类',exact:true}).fill('不可能存在的记录000');
    await page.getByText('没有符合条件的记录',{exact:true}).waitFor();
    await page.getByRole('button',{name:'清空搜索',exact:true}).click();
    await page.getByRole('group',{name:'收支类型',exact:true}).getByRole('button',{name:'收入',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:/^编辑餐饮，/}).count(),0);
    await page.getByRole('group',{name:'收支类型',exact:true}).getByRole('button',{name:'全部',exact:true}).click();
    await page.getByRole('button',{name:'筛选与排序',exact:true}).click();
    const filters=page.getByRole('dialog',{name:'筛选与排序',exact:true});await filters.waitFor();
    await filters.getByRole('button',{name:/^查看 .* 笔记录$/}).click();
    await page.getByRole('button',{name:/^编辑.+，/}).first().click();
    const edit=page.getByRole('dialog',{name:'编辑记录',exact:true});await edit.waitFor();
    if(width<768){await edit.getByRole('button',{name:'删除这条记录',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'取消',exact:true}).click();}
    await edit.getByRole('button',{name:'取消',exact:true}).click();
   }else if(route==='budget'){
    if(width<1024){
     const group=page.getByRole('group',{name:'预算分类筛选',exact:true});
     const allCount=await page.getByRole('button',{name:'编辑',exact:true}).count();
     await group.getByRole('button',{name:/^需关注/}).click();
     const watchCount=await page.getByRole('button',{name:'编辑',exact:true}).count();
     assert(watchCount>0&&watchCount<allCount,'Watch filter should exclude ordinary categories');
     await group.getByRole('button',{name:/^全部分类/}).click();
    }
    await page.getByRole('button',{name:'编辑',exact:true}).first().click();
    await page.getByRole('dialog',{name:'编辑预算',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'新增预算',exact:true}).first().click();
    await page.getByRole('dialog',{name:'新增预算',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
    await page.locator('summary').first().click();
    await page.getByRole('button',{name:'删除预算',exact:true}).first().click();
    await page.getByRole('alertdialog').getByRole('button',{name:'取消',exact:true}).click();
   }else if(route==='income'){
    await page.getByRole('button',{name:'记录到账',exact:true}).first().click();
    await page.getByRole('alertdialog').getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'编辑',exact:true}).first().click();
    await page.getByRole('dialog',{name:'编辑收入来源',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'新增收入来源',exact:true}).first().click();
    await page.getByRole('dialog',{name:'新增收入来源',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
   }else if(route==='reports'){
    if(width<768){
     const tabs=page.getByRole('group',{name:'报表视图',exact:true});
     await tabs.getByRole('button',{name:'趋势',exact:true}).click();
     await page.getByRole('tab',{name:'周',exact:true}).click();
     await page.getByRole('tab',{name:'月',exact:true}).click();
     await tabs.getByRole('button',{name:'提醒',exact:true}).click();
     await page.getByRole('heading',{name:'异常消费提醒',exact:true}).waitFor();
     await tabs.getByRole('button',{name:'分类',exact:true}).click();
    }
    await page.getByRole('button',{name:'上个月',exact:true}).click();await fit(page,'historical reports');
   }else{
    await page.getByRole('button',{name:'更新进度',exact:true}).first().click();
    const modal=page.getByRole('dialog',{name:/^更新进度 ·/});await modal.waitFor();
    await modal.getByRole('button',{name:'增加',exact:true}).click();
    await modal.getByText('请输入大于 0 的金额',{exact:true}).waitFor();
    await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'编辑',exact:true}).first().click();
    await page.getByRole('dialog',{name:'编辑目标',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
    await page.getByRole('button',{name:'新增目标',exact:true}).first().click();
    await page.getByRole('dialog',{name:'新增目标',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
   }
   assert.deepEqual(await data(page),before,`${route}: cancellation should preserve ledger`);
   results.push({width,height,colorScheme,route,amountsFit:count,interactionsPassed:true,cancellationPreservesData:true});
  }
  assert.equal(errors.length,0,errors.join('\n'));await context.close();
  console.log(`PASS ${width} ${colorScheme}: five pages, layouts, filtering, dialogs, cancellation`);
 }
 const context=await memoryContext(browser,320,690);const page=await context.newPage();
 await page.goto('http://127.0.0.1:5173/app');
 await page.evaluate(async()=>{const{useStore}=await import('/src/store/useStore.ts');const s=useStore.getState();useStore.setState({settings:{...s.settings,currency:'HKD'},transactions:s.transactions.map(t=>({...t,amount:t.amount*1000000})),budgets:s.budgets.map(b=>({...b,amount:b.amount*1000000})),goals:s.goals.map(g=>({...g,targetAmount:g.targetAmount*1000000,currentAmount:g.currentAmount*1000000,monthlyPlan:g.monthlyPlan*1000000})),incomeSources:s.incomeSources.map(i=>({...i,amount:i.amount*1000000}))});});
 for(const route of routes){await page.goto(`http://127.0.0.1:5173/app/${route}`);await page.locator('main h1').waitFor();await fit(page,`large HKD ${route}`);await page.screenshot({path:path.join(__dirname,`large-${route}.png`)});results.push({route,largeHKD:true,amountsFit:true});}
 await context.close();fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
