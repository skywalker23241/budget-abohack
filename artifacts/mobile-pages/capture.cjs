const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const [name,width,height,colorScheme] of [['small',320,690,'light'],['mobile',390,844,'light'],['dark',390,844,'dark']]){
 const context=await browser.newContext({viewport:{width,height},colorScheme,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('budget-app:onboarding-version','3'));
 const page=await context.newPage();
 for(const route of ['transactions','budget','income','reports','goals']){
  await page.goto(`http://127.0.0.1:5173/app/${route}`);await page.locator('main h1').waitFor();await page.waitForTimeout(350);
  await page.screenshot({path:path.join(__dirname,`${process.argv[2]||'after'}-${route}-${name}.png`)});
 }
 await context.close();
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
