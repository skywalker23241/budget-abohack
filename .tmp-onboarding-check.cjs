const assert = require('node:assert/strict');
const { chromium } = require('D:/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name, width, height, colorScheme] of [['desktop',1440,1000,'light'],['dark',1440,900,'dark'],['mobile',390,844,'light'],['small',320,640,'light'],['short',780,480,'light']]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/app');
      const guide = page.locator('[data-onboarding-ui]');
      await guide.waitFor();
      const before = await page.evaluate(() => localStorage.getItem('personal-budget-app:v1'));
      async function checkCard(label) {
        await page.waitForTimeout(350);
        const rect = await guide.boundingBox();
        assert(rect.x >= -1 && rect.y >= -1 && rect.x+rect.width <= width+1 && rect.y+rect.height <= height+1, `${name} ${label}: ${JSON.stringify(rect)}`);
        assert(await guide.evaluate(el=>el.scrollWidth <= el.clientWidth), `${name} horizontal overflow`);
      }
      await checkCard('welcome');
      await page.screenshot({ path: `${process.env.TEMP}/pennypeek-tour-${name}-welcome.png` });
      await guide.getByRole('button', { name: '开始导览' }).click();
      for (let step=1; step<=5; step++) {
        await guide.getByRole('progressbar').filter({ has: undefined }).waitFor();
        await page.waitForFunction(expected => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === String(expected), step);
        await checkCard(`step ${step}`);
        if (step===1 || step===3) await page.screenshot({ path: `${process.env.TEMP}/pennypeek-tour-${name}-${step}.png` });
        if (step===2) {
          await guide.getByRole('button',{name:'上一步',exact:true}).click();
          await page.waitForFunction(()=>document.querySelector('[role="progressbar"][aria-label="导览进度"]')?.getAttribute('aria-valuenow')==='1');
          await guide.getByRole('button',{name:'下一步',exact:true}).click();
        }
        await guide.getByRole('button', { name: step===5 ? '完成向导' : '下一步', exact: true }).click();
      }
      await guide.waitFor({state:'hidden'});
      assert.equal(await page.evaluate(()=>localStorage.getItem('personal-budget-app:v1')),before,'Tour must not change ledger');
      assert.equal(await page.evaluate(()=>localStorage.getItem('budget-app:onboarding-version')),'3');
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('budget-app:onboarding:open')));
      await guide.waitFor();
      await page.keyboard.press('Escape');
      await guide.waitFor({state:'hidden'});
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('budget-app:onboarding:open')));
      await guide.waitFor();
      await guide.getByRole('button',{name:'开始导览'}).click();
      await page.waitForTimeout(500);
      const quick = page.locator('[data-tour="quick-add"]:visible').first();
      await quick.click();
      const modal = page.getByRole('dialog',{name:'快速记账',exact:true});
      await modal.waitFor();
      await guide.waitFor({state:'hidden'});
      await modal.getByRole('button',{name:'取消',exact:true}).click();
      await guide.waitFor();
      await page.waitForFunction(()=>document.querySelector('[role="progressbar"][aria-label="导览进度"]')?.getAttribute('aria-valuenow')==='2');
      await guide.getByRole('button',{name:'退出向导'}).click();
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(`PASS ${name}: welcome, five steps, back, complete, restart, Escape, optional quick-entry, no ledger writes`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
