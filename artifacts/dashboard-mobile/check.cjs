const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const results = [];
async function checkAmounts(page) {
  const values = await page.locator('[data-dashboard-money]:visible').evaluateAll(elements => elements.map(el => ({ value: el.textContent.trim(), width: el.clientWidth, scroll: el.scrollWidth, font: getComputedStyle(el).fontSize, nowrap: getComputedStyle(el).whiteSpace === 'nowrap' })));
  assert(values.every(v => v.nowrap && v.scroll <= v.width + 1), JSON.stringify(values));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflows');
  return values.length;
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [width,height,colorScheme] of [[320,690,'light'],[390,844,'light'],[430,932,'light'],[768,1024,'light'],[390,844,'dark'],[1440,900,'light']]) {
      const context = await browser.newContext({viewport:{width,height},colorScheme,reducedMotion:'reduce'});
      await context.addInitScript(() => localStorage.setItem('budget-app:onboarding-version','3'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/app');
      await page.getByRole('heading',{name:'财务总览',exact:true}).waitFor();
      const ledger = await page.evaluate(()=>localStorage.getItem('personal-budget-app:v1'));
      const count = await checkAmounts(page);
      if (width < 1024) {
        assert(await page.locator('[data-dashboard-recent]').evaluate(el => el.getBoundingClientRect().top < document.querySelector('[data-dashboard-spending]').getBoundingClientRect().top));
        assert((await page.locator('[data-dashboard-recent] li:visible').count()) <= 4);
        const primary = page.getByRole('navigation',{name:'主要导航',exact:true});
        await primary.getByRole('button',{name:'快速记账',exact:true}).click();
      } else await page.getByRole('button',{name:'记一笔',exact:true}).click();
      const form = page.getByRole('dialog',{name:'快速记账',exact:true});
      await form.waitFor();
      await form.getByRole('button',{name:'取消',exact:true}).click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('personal-budget-app:v1')),ledger);
      await page.getByRole('button',{name:'上个月',exact:true}).click();
      const selected = await page.evaluate(()=>{const date=new Date();return `${date.getMonth()===0?date.getFullYear()-1:date.getFullYear()}-${String(date.getMonth()===0?12:date.getMonth()).padStart(2,'0')}`});
      const dates = await page.locator('[data-dashboard-recent] [data-transaction-date]').evaluateAll(els=>els.map(el=>el.dataset.transactionDate));
      assert(dates.every(date=>date.startsWith(selected)),JSON.stringify(dates));
      assert(!(await page.locator('[data-dashboard-summary]').textContent()).includes('日均参考'));
      await checkAmounts(page);
      if(width===390&&colorScheme==='light') await page.screenshot({path:path.join(__dirname,'selected-month.png')});
      assert.equal(errors.length,0,errors.join('\n'));
      results.push({width,height,colorScheme,singleLineAmounts:count,selectedMonthConsistent:true,quickEntryCancel:true,ledgerUnchanged:true,noRuntimeErrors:true});
      await context.close();
    }
    for (const scenario of ['normal','empty','overspent','no-income','large-HKD']) {
      const context = await browser.newContext({viewport:{width:320,height:690},reducedMotion:'reduce'});
      // A fresh browser context with in-memory storage and fabricated records.
      await context.addInitScript(({scenario})=>{
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
        const month = date.slice(0,7);
        const large = scenario === 'large-HKD';
        const tx = (id,type,amount) => ({id,type,amount,date,category:type==='income'?'工资':'餐饮',paymentMethod:'微信',note:'仅用于测试',countInBudget:type==='expense',isFixed:false,createdAt:now.toISOString()});
        const state = { transactions:scenario==='empty'?[]:[...(scenario==='no-income'?[]:[tx('income','income',large?123456789.12:2000)]),tx('expense','expense',large?1234567.89:scenario==='overspent'?1500:500)],budgets:scenario==='empty'?[]:[{id:'budget',month,category:'餐饮',amount:large?12345678.9:1000}],loans:[],loanPayments:[],incomeSources:[],goals:[],settings:{currency:large?'HKD':'CNY',savingsRateTarget:20,budgetWarnThreshold:80,largeExpenseThreshold:2000,monthStartDay:1}};
        const data = new Map([['budget-app:onboarding-version','3'],['personal-budget-app:v1',JSON.stringify({version:1,state})]]);
        Object.defineProperty(window,'localStorage',{value:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)}});
      },{scenario});
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173/app');
      await page.locator('[data-dashboard-primary]').waitFor();
      await checkAmounts(page);
      const primary = await page.locator('[data-dashboard-primary]').textContent();
      if(scenario==='normal'||scenario==='no-income') assert.equal(primary,'¥500.00');
      if(scenario==='overspent'){assert.equal(primary,'¥500.00');assert((await page.locator('[data-dashboard-summary]').textContent()).includes('预算已超支'));}
      if(scenario==='no-income') assert((await page.locator('[data-dashboard-spending]').textContent()).includes('暂无收入记录'));
      if(scenario==='empty') {
        assert((await page.locator('[data-dashboard-summary]').textContent()).includes('设置分类预算'));
        await page.getByRole('button',{name:'记第一笔',exact:true}).click();
        await page.getByRole('dialog',{name:'快速记账',exact:true}).getByRole('button',{name:'取消',exact:true}).click();
      }
      await page.screenshot({path:path.join(__dirname,`${scenario}.png`),fullPage:true});
      await page.locator('[data-dashboard-budget-action]').click();
      await page.waitForURL('**/app/budget');
      results.push({scenario,singleLineAmounts:true,budgetLink:true,expectedSummary:true});
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
