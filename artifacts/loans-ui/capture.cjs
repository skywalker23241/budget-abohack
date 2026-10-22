const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name, width, height, colorScheme] of [['mobile',390,844,'light'],['small',320,640,'light'],['desktop',1440,900,'light'],['dark',390,844,'dark']]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme });
      await context.addInitScript(() => localStorage.setItem('budget-app:onboarding-version', '3'));
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173/app/loans');
      await page.getByRole('heading', { name: '贷款管理', exact: true }).waitFor();
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(__dirname, `${process.argv[2] || 'after'}-${name}.png`), fullPage: true });
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
