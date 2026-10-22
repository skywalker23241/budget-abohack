const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name,width,height,colorScheme] of [['small',320,690,'light'],['mobile',390,844,'light'],['wide',430,932,'light'],['dark',390,844,'dark'],['desktop',1440,900,'light']]) {
      const context = await browser.newContext({ viewport: { width,height }, colorScheme });
      await context.addInitScript(() => localStorage.setItem('budget-app:onboarding-version','3'));
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173/app');
      await page.getByRole('heading',{name:'财务总览',exact:true}).waitFor();
      await page.waitForTimeout(600);
      await page.screenshot({path:path.join(__dirname,`${process.argv[2]||'after'}-${name}.png`)});
      if (name==='mobile' && process.argv[2]==='after') {
        await page.locator('[data-dashboard-spending]').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(__dirname,'after-mobile-details.png')});
      }
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
