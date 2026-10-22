const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const [name, width, height, colorScheme, reducedMotion] of [
      ['mobile',390,844,'light','no-preference'], ['small',320,640,'light','reduce'],
      ['dark',430,932,'dark','no-preference'], ['landscape',780,480,'light','reduce'],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion });
      await context.addInitScript(() => localStorage.setItem('budget-app:onboarding-version', '3'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/app');
      const more = page.getByRole('button', { name: '更多功能', exact: true });
      const primary = page.getByRole('navigation', { name: '主要导航', exact: true });
      const sheet = page.getByRole('dialog', { name: '更多功能', exact: true });
      const header = page.locator('header').first();
      const settingsTrigger = header.getByRole('button', { name: '设置', exact: true });
      const guideTrigger = header.getByRole('button', { name: '使用向导', exact: true });
      const openMore = async () => { await more.click(); await sheet.waitFor(); await page.waitForTimeout(250); };
      assert.equal(await page.getByRole('button', { name: '打开菜单', exact: true }).count(), 0);
      assert.deepEqual(await primary.getByRole('link').allTextContents(), ['首页', '账单', '预算']);
      assert.equal(await primary.getByRole('button', { name: '设置', exact: true }).count(), 0);
      await page.screenshot({ path: path.join(__dirname, `${name}-home.png`) });
      await openMore();
      assert.equal(await sheet.getByRole('button', { name: '设置', exact: true }).count(), 0);
      assert.equal(await sheet.getByRole('button', { name: '使用向导', exact: true }).count(), 0);
      assert.deepEqual(await sheet.getByRole('link').allTextContents(), ['贷款月供与还款进度', '收入收入来源与到账', '报表收支与消费趋势', '目标储蓄计划与进度']);
      const bounds = await sheet.boundingBox();
      assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1, JSON.stringify(bounds));
      assert(await sheet.evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.screenshot({ path: path.join(__dirname, `${name}-more.png`) });
      for (let i = 0; i < 9; i++) {
        await page.keyboard.press('Tab');
        assert(await sheet.evaluate(el => el.contains(document.activeElement)), 'Focus must stay within More');
      }
      await page.keyboard.press('Escape');
      await sheet.waitFor({ state: 'hidden' });
      await page.waitForTimeout(50);
      assert(await more.evaluate(el => el === document.activeElement), 'Esc must restore focus');
      await openMore();
      await page.mouse.click(10, 5);
      await sheet.waitFor({ state: 'hidden' });

      for (const [label, route] of [['贷款', 'loans'], ['收入', 'income'], ['报表', 'reports'], ['目标', 'goals']]) {
        await openMore();
        await sheet.getByRole('link').filter({ hasText: label }).click();
        await page.waitForURL(`**/app/${route}`);
        await sheet.waitFor({ state: 'hidden' });
        assert.equal(await more.getAttribute('data-active'), 'true');
      }
      await settingsTrigger.click();
      const settings = page.getByRole('dialog', { name: '设置', exact: true });
      await settings.waitFor();
      await sheet.waitFor({ state: 'hidden' });
      assert(await settings.evaluate(el => el.contains(document.activeElement)), 'Settings must receive focus after More closes');
      await page.keyboard.press('Escape');
      await settings.waitFor({ state: 'hidden' });
      await page.waitForTimeout(50);
      assert(await settingsTrigger.evaluate(el => el === document.activeElement), 'Closing Settings must restore focus to its header button');
      await guideTrigger.click();
      const guide = page.locator('[data-onboarding-ui]');
      await guide.waitFor();
      await sheet.waitFor({ state: 'hidden' });
      await guide.getByRole('button', { name: '开始导览', exact: true }).click();
      for (let step = 1; step <= 5; step++) {
        await page.waitForFunction(n => document.querySelector('[data-onboarding-ui] [role="progressbar"]')?.getAttribute('aria-valuenow') === String(n) && document.querySelector('[data-onboarding-ui]')?.dataset.switching === 'false', step);
        if (step < 5) await guide.getByRole('button', { name: '下一步', exact: true }).click();
      }
      assert((await guide.textContent()).includes('点页眉右上角的设置'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(__dirname, `${name}-guide.png`) });
      await settingsTrigger.click();
      await guide.waitFor({ state: 'hidden' });
      await settings.waitFor();
      await page.keyboard.press('Escape');
      await settings.waitFor({ state: 'hidden' });
      await openMore();
      await page.setViewportSize({ width: 1440, height: 900 });
      await sheet.waitFor({ state: 'hidden' });
      await page.getByRole('link', { name: '仪表盘', exact: true }).click();
      await page.waitForURL('**/app');
      assert.equal(errors.length, 0, errors.join('\n'));
      results.push({ name, headerSettingsAndGuide: true, noDuplicateNavigation: true, sheetInBounds: true, keyboardFocus: true, escapeAndOverlay: true, allFourDestinations: true, settingsHandoff: true, onboardingHandoff: true, mobileTourTarget: true, desktopResize: true, errors });
      fs.writeFileSync(path.join(__dirname,'results.json'), JSON.stringify(results,null,2));
      console.log(`PASS ${name}: distinct destinations, bounds, focus, dismiss, routes, settings, guide, responsive switch`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
