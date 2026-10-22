const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const [width, height, colorScheme] of [[320,640,'light'], [390,844,'light'], [430,932,'dark']]) {
      const page = await browser.newPage({ viewport: { width, height }, colorScheme, reducedMotion: 'reduce' });
      await page.goto('http://127.0.0.1:5173/app');
      const guide = page.locator('[data-onboarding-ui]');
      await guide.waitFor();
      const welcome = await guide.boundingBox();
      assert(welcome.y >= 11 && welcome.y + welcome.height <= height - 11, 'Welcome must respect viewport margins');
      await guide.getByRole('button', { name: '开始导览' }).click();
      const settle = n => page.waitForFunction(n => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === String(n) && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false', n);
      await settle(1);
      const trial = guide.getByRole('button', { name: '试记一笔', exact: true });
      await trial.focus();
      await page.keyboard.press('Enter');
      const modal = page.getByRole('dialog', { name: '快速记账', exact: true });
      await modal.waitFor();
      await modal.getByRole('button', { name: '取消', exact: true }).click();
      await settle(2);
      const steps = [];
      for (let step = 2; step <= 5; step++) {
        await settle(step);
        await page.waitForTimeout(350);
        const geometry = await guide.evaluate(el => {
          const card = el.getBoundingClientRect();
          const rects = [...el.querySelectorAll('button')].map(b => b.getBoundingClientRect());
          const body = el.querySelector('[aria-live]');
          return { inBounds: card.top >= 12 && card.bottom <= innerHeight - 11, touchTargets: rects.every(r => r.height >= 44 && r.width >= 44), buttonsVisible: rects.every(r => r.top >= card.top && r.bottom <= card.bottom), contentScroll: body.scrollHeight > body.clientHeight };
        });
        assert(geometry.inBounds && geometry.touchTargets && geometry.buttonsVisible, JSON.stringify({ width, step, geometry }));
        if (width === 320 && step === 3) {
          const card = await guide.boundingBox();
          const target = await page.locator('[data-tour="report-balance"]').boundingBox();
          const gap = card.y >= target.y + target.height ? card.y - target.y - target.height : target.y - card.y - card.height;
          assert(gap >= 15, `Report target gap: ${gap}`);
          geometry.targetGap = gap;
        }
        steps.push({ step, ...geometry });
        await guide.getByRole('button', { name: step === 5 ? '完成向导' : '下一步', exact: true }).click();
      }
      results.push({ width, height, colorScheme, keyboardTrialPassed: true, steps });
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'mobile-ui-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
