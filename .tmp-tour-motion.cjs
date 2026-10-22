const assert = require('node:assert/strict');
const { chromium } = require('D:/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 786 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto('http://127.0.0.1:5173/app');
      const guide = page.locator('[data-onboarding-ui]');
      await guide.getByRole('button', { name: '开始导览' }).click();
      for (let step=1; step<=5; step++) {
        await page.waitForFunction(expected => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === String(expected),step);
        await page.locator('[data-onboarding-ui][data-switching="false"]').waitFor();
        await page.waitForTimeout(200);
        const targetBounds = await page.evaluate(index => {
          const selectors = ['quick-add','budget-add','report-balance','goal-add','settings-trigger'];
          const target = [...document.querySelectorAll(`[data-tour="${selectors[index-1]}"]`)].find(el => {const r=el.getBoundingClientRect(); return r.width && r.height && r.top<innerHeight && r.bottom>0;});
          const rect = (target.querySelector('[data-tour-focus]') ?? target).getBoundingClientRect();
          return {width:rect.width,height:rect.height};
        },step);
        assert(targetBounds.width<=300 && targetBounds.height<=65,JSON.stringify(targetBounds));
        if(step===1 || step===3) await page.screenshot({path:`${process.env.TEMP}/pennypeek-tour-refined-${viewport.width}-${step}.png`});
        if (step<5) {
          await guide.getByRole('button',{name:'下一步',exact:true}).click();
          assert.equal(await guide.getAttribute('data-switching'),'true');
          await page.waitForTimeout(100);
          assert(await guide.evaluate(el=>Number(getComputedStyle(el).opacity))<0.5,'Old card must fade out before navigation');
        } else await guide.getByRole('button',{name:'完成向导',exact:true}).click();
      }
      await page.goto('http://127.0.0.1:5173/tests/onboarding.browser.html');
      await page.locator('#result[data-status="passed"]').waitFor();
      console.log(`PASS normal motion ${viewport.width}: fade before navigation, compact targets, fixture`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
