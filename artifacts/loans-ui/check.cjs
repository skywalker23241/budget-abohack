// All interaction checks use fabricated loans and an in-memory Storage replacement
// in fresh, non-persistent browser contexts. No existing ledger is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const day = new Date().getDate();
const base = { type: '消费贷', platform: '银行', principal: 12000, remainingPrincipal: 12000, annualRate: 0, monthlyPayment: 1000, repaymentDay: day, startDate: '2026-01-01', termMonths: 12, paidPeriods: 0, remindEnabled: true, note: '仅用于自动化验证的虚构贷款' };
const loans = [
  { ...base, id: 'later', name: '下一笔贷款', repaymentDay: day === 31 ? 1 : day + 1, monthlyPayment: 2000 },
  { ...base, id: 'today', name: '今天还款的测试贷款' },
  { ...base, id: 'settled', name: '已结清的测试贷款', remainingPrincipal: 0, monthlyPayment: 9900, paidPeriods: 12 },
];
async function memoryContext(browser, viewport, scenarioLoans = loans) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  await context.addInitScript(({ scenarioLoans }) => {
    const storage = new Map([
      ['budget-app:onboarding-version', '3'],
      ['personal-budget-app:v1', JSON.stringify({ version: 1, state: { loans: scenarioLoans, loanPayments: [], transactions: [{ id: 'income', type: 'income', date: new Date().toLocaleDateString('en-CA'), amount: 10000, category: '工资', note: '', paymentMethod: '银行卡', countInBudget: false, isFixed: true, createdAt: new Date().toISOString() }] } })],
    ]);
    Object.defineProperty(window, 'localStorage', { value: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key), key: index => [...storage.keys()][index] ?? null, get length() { return storage.size; } } });
  }, { scenarioLoans });
  return context;
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const [width, height] of [[320,640],[390,844],[780,480],[1440,900]]) {
      const context = await memoryContext(browser, { width, height });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/app/loans');
      await page.getByRole('heading', { name: '贷款管理', exact: true }).waitFor();
      assert.equal((await page.locator('[data-loan-monthly]').textContent()).replace(/\s/g,''), '¥3,000.00', 'Settled loans must not contribute to monthly repayments');
      assert.equal(await page.locator('[data-loan-card]').count(), 2);
      const card = page.getByRole('article', { name: '今天还款的测试贷款', exact: true });
      assert.equal(await page.locator('[data-loan-card] h2').first().textContent(), '今天还款的测试贷款', 'Closest repayment should appear first');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page must not overflow horizontally');
      assert(await card.getByRole('button', { name: '记录本期还款' }).evaluate(el => el.getBoundingClientRect().height >= 44));
      await page.screenshot({ path: path.join(__dirname, `fixture-${width}.png`), fullPage: true });
      await card.locator('summary').click();
      await card.getByText('初始本金', { exact: true }).waitFor();
      await card.getByRole('button', { name: '删除贷款', exact: true }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '取消', exact: true }).click();
      assert.equal(await page.locator('[data-loan-card]').count(), 2, 'Cancel deletion must preserve loans');
      await card.getByRole('button', { name: '编辑今天还款的测试贷款', exact: true }).click();
      const form = page.getByRole('dialog', { name: '编辑贷款', exact: true });
      await form.waitFor();
      assert.equal(await form.locator('#loan-name').inputValue(), '今天还款的测试贷款');
      await form.getByRole('button', { name: '取消', exact: true }).click();
      await card.getByRole('button', { name: '记录本期还款' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '取消', exact: true }).click();
      const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('personal-budget-app:v1')).state);
      assert.equal((await read()).loans.find(l => l.id === 'today').paidPeriods, 0);
      await card.getByRole('button', { name: '记录本期还款' }).click();
      await page.getByRole('alertdialog').getByRole('button', { name: '确认还款', exact: true }).click();
      const state = await read();
      assert.equal(state.loans.find(l => l.id === 'today').remainingPrincipal, 11000);
      assert.equal(state.loans.find(l => l.id === 'today').paidPeriods, 1);
      assert(state.transactions.some(t => t.type === 'loan_repayment' && t.loanId === 'today' && t.amount === 1000));
      await page.getByRole('button', { name: '已结清 1', exact: true }).click();
      assert.equal(await page.locator('[data-loan-card]').count(), 1);
      assert.equal(await page.getByRole('button', { name: '记录本期还款' }).count(), 0);
      await page.getByRole('button', { name: '新增贷款', exact: true }).click();
      await page.getByRole('dialog', { name: '新增贷款', exact: true }).waitFor();
      await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
      assert.equal(errors.length, 0, errors.join('\n'));
      results.push({ width, height, summaryExcludesSettled: true, nearestFirst: true, noOverflow: true, details: true, editCancel: true, deleteCancel: true, repaymentCancel: true, repaymentAndTransaction: true, settledFilter: true, addForm: true });
      await context.close();
    }
    for (const [scenario, scenarioLoans] of [['empty', []], ['all-settled', [loans[2]]], ['periods-exhausted', [{ ...loans[1], termMonths: 1, paidPeriods: 1 }]], ['long-name', [{ ...loans[1], name: '测试超长贷款名称'.repeat(8), remainingPrincipal: 123456789.99, monthlyPayment: 1234567.89 }]]]) {
      const context = await memoryContext(browser, { width: 320, height: 640 }, scenarioLoans);
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173/app/loans');
      await page.getByRole('heading', { name: '贷款管理', exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scenario}: horizontal overflow`);
      if (scenario === 'empty') await page.getByText('还没有贷款记录', { exact: true }).waitFor();
      if (scenario === 'all-settled') { await page.getByText('当前没有待还贷款', { exact: true }).waitFor(); assert.equal(await page.locator('[data-loan-monthly]').textContent(), '¥0.00'); }
      if (scenario === 'periods-exhausted') { assert.equal(await page.locator('[data-loan-card]').count(), 1); await page.locator('summary').click(); await page.getByText('请核对剩余本金', { exact: true }).waitFor(); }
      await page.screenshot({ path: path.join(__dirname, `${scenario}.png`), fullPage: true });
      results.push({ scenario, passed: true });
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
