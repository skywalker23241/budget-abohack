const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const out = __dirname;
const results = [];
const targets = ['quick-add', 'budget-add', 'report-balance', 'goal-add', 'settings-trigger'];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name, width, height, colorScheme] of [
      ['desktop', 1440, 900, 'light'], ['mobile', 390, 844, 'light'],
      ['small', 320, 640, 'light'], ['landscape', 780, 480, 'light'],
      ['dark', 1440, 900, 'dark'],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/app');
      const guide = page.locator('[data-onboarding-ui]');
      await guide.waitFor();
      await page.waitForTimeout(700);
      const ledger = await page.evaluate(() => localStorage.getItem('personal-budget-app:v1'));
      await page.screenshot({ path: path.join(out, `${name}-welcome.png`) });
      const run = { name, width, height, errors, steps: [] };
      await guide.getByRole('button', { name: '开始导览' }).click();
      for (let step = 1; step <= 5; step++) {
        await page.waitForFunction(n => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === String(n) && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false', step);
        await page.waitForTimeout(450);
        const data = await page.evaluate(targetName => {
          const card = document.querySelector('[data-onboarding-ui]');
          const rect = card.getBoundingClientRect();
          const target = [...document.querySelectorAll(`[data-tour="${targetName}"]`)].find(el => { const r = el.getBoundingClientRect(); return r.width && r.height && r.top < innerHeight && r.bottom > 0; });
          const targetRect = (target?.querySelector('[data-tour-focus]') ?? target)?.getBoundingClientRect();
          const hit = targetRect ? document.elementFromPoint(targetRect.x + targetRect.width / 2, targetRect.y + targetRect.height / 2) : null;
          return { title: card.querySelector('h2').textContent, route: location.pathname, card: rect.toJSON(), target: targetRect?.toJSON(), targetClickable: !!hit?.closest(`[data-tour="${targetName}"]`), overflow: card.scrollWidth > card.clientWidth, cardScroll: card.scrollHeight > card.clientHeight, inBounds: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1, overlap: targetRect ? Math.max(0, Math.min(rect.right, targetRect.right) - Math.max(rect.left, targetRect.left)) * Math.max(0, Math.min(rect.bottom, targetRect.bottom) - Math.max(rect.top, targetRect.top)) : null };
        }, targets[step - 1]);
        run.steps.push(data);
        await page.screenshot({ path: path.join(out, `${name}-${step}.png`) });
        if (step === 2) {
          await guide.getByRole('button', { name: '上一步', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === '1' && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false');
          await guide.getByRole('button', { name: '下一步', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === '2' && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false');
          run.backPassed = true;
        }
        await guide.getByRole('button', { name: step === 5 ? '完成向导' : '下一步', exact: true }).click();
      }
      await guide.waitFor({ state: 'hidden' });
      run.completion = await page.evaluate(() => ({ route: location.pathname, version: localStorage.getItem('budget-app:onboarding-version') }));
      run.ledgerUnchanged = ledger === await page.evaluate(() => localStorage.getItem('personal-budget-app:v1'));
      await page.reload();
      await page.waitForTimeout(700);
      run.staysClosedAfterReload = await guide.count() === 0;
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('budget-app:onboarding:open')));
      await guide.waitFor();
      await page.keyboard.press('Escape');
      await guide.waitFor({ state: 'hidden' });
      run.escapePassed = true;
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('budget-app:onboarding:open')));
      await guide.getByRole('button', { name: '开始导览' }).click();
      await page.locator('[data-onboarding-ui][data-switching="false"]').waitFor();
      await page.waitForTimeout(300);
      run.keyboardFocus = [];
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        run.keyboardFocus.push(await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), label: document.activeElement.getAttribute('aria-label'), tour: document.activeElement.closest('[data-tour]')?.getAttribute('data-tour') })));
      }
      await page.locator('[data-tour="quick-add"]:visible').first().click();
      const modal = page.getByRole('dialog', { name: '快速记账', exact: true });
      await modal.waitFor();
      run.quickEntrySuspends = await guide.count() === 0;
      await page.screenshot({ path: path.join(out, `${name}-quick-entry.png`) });
      await modal.getByRole('button', { name: '取消', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === '2' && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false');
      run.quickEntryResumes = true;
      await guide.getByRole('button', { name: '退出向导' }).click();
      run.cancelLedgerUnchanged = ledger === await page.evaluate(() => localStorage.getItem('personal-budget-app:v1'));
      await page.goto('http://127.0.0.1:5173/tests/onboarding.browser.html');
      await page.locator('#result[data-status]').waitFor();
      run.fixture = await page.locator('#result').textContent();
      results.push(run);
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
      console.log(JSON.stringify(run));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
