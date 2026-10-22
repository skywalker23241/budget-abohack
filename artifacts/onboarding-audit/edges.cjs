const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const result = {};
  const guide = page.locator('[data-onboarding-ui]');
  const settle = n => page.waitForFunction(n => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === String(n) && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false', n);
  try {
    await page.goto('http://127.0.0.1:5173/app');
    await guide.getByRole('button', { name: '稍后再看', exact: true }).click();
    await page.reload();
    await page.waitForTimeout(800);
    result.laterPersistsCompletion = await page.evaluate(() => localStorage.getItem('budget-app:onboarding-version'));
    await page.getByRole('button', { name: '打开菜单', exact: true }).click();
    await page.getByRole('button', { name: '使用向导', exact: true }).click();
    await guide.waitFor();
    result.menuRestart = true;
    await guide.getByRole('button', { name: '开始导览' }).click();
    await settle(1);
    await guide.getByRole('button', { name: '下一步', exact: true }).click();
    await settle(2);
    await page.goBack();
    await page.waitForTimeout(800);
    result.browserBack = await page.evaluate(() => ({ route: location.pathname, title: document.querySelector('[data-onboarding-ui] h2')?.textContent, progress: document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow'), budgetTarget: !!document.querySelector('[data-tour="budget-add"]') }));
    await page.screenshot({ path: path.join(__dirname, 'mobile-browser-back.png') });
    await guide.getByRole('button', { name: '退出向导' }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('budget-app:onboarding:open')));
    await guide.getByRole('button', { name: '开始导览' }).click();
    for (let step = 1; step <= 4; step++) {
      await settle(step);
      await guide.getByRole('button', { name: '下一步', exact: true }).click();
    }
    await settle(5);
    await page.locator('[data-tour="settings-trigger"]:visible').first().click();
    await page.getByRole('dialog').waitFor();
    result.settingsTargetOpens = true;
    result.guideClosedForSettings = await guide.count() === 0;
    await page.screenshot({ path: path.join(__dirname, 'mobile-settings.png') });
    await page.setViewportSize({ width: 780, height: 480 });
    await page.goto('http://127.0.0.1:5173/tests/onboarding.browser.html');
    await page.locator('#result[data-status]').waitFor();
    result.landscapeFixture = await page.locator('#result').textContent();
    result.fixtureGeometry = await guide.evaluate(el => ({ rect: el.getBoundingClientRect().toJSON(), style: el.getAttribute('style'), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, title: el.querySelector('h2').textContent })).catch(() => null);
    await page.screenshot({ path: path.join(__dirname, 'landscape-fixture.png') });
    fs.writeFileSync(path.join(__dirname, 'edges.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
