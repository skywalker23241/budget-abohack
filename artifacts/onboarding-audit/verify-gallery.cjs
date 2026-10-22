const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto('http://127.0.0.1:5173/artifacts/onboarding-audit/index.html');
    await page.locator('[data-name="mobile"]').click();
    assert.equal(await page.locator('.run:visible').getAttribute('data-run'), 'mobile');
    await page.locator('[data-run="mobile"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-run="mobile"] img')].every(img => img.complete && img.naturalWidth));
    await page.screenshot({ path: path.join(__dirname, 'gallery-preview.png') });
    await page.setViewportSize({ width: 1680, height: 650 });
    await page.setContent('<body style="margin:0;display:flex;align-items:start;background:#e4eae4">' + ['welcome',1,2,3,4,5,'quick-entry'].map(step => `<img style="width:240px" src="http://127.0.0.1:5173/artifacts/onboarding-audit/mobile-${step}.png">`).join(''));
    await page.waitForFunction(() => [...document.images].every(img => img.complete && img.naturalWidth));
    await page.screenshot({ path: path.join(__dirname, 'mobile-contact-sheet.png') });
    console.log('PASS: gallery filter, visible screenshot loading, contact sheet');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
