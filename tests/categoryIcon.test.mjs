import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { CategoryIcon, getCategoryIcon } = await server.ssrLoadModule('/src/components/CategoryIcon.tsx');
  const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = await server.ssrLoadModule('/src/lib/constants.ts');
  const icons = await server.ssrLoadModule('/src/components/Icons.tsx');
  for (const category of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) {
    const html = renderToStaticMarkup(createElement(CategoryIcon, { category }));
    assert.match(html, /<svg/);
    assert.match(html, /aria-hidden="true"/);
  }
  assert.equal(getCategoryIcon('餐饮'), icons.ForkKnife);
  assert.equal(getCategoryIcon('工资', 'income'), icons.Briefcase);
  assert.equal(getCategoryIcon('副业', 'income'), getCategoryIcon('副业收入', 'income'));
  assert.equal(getCategoryIcon('自定义收入', 'income'), icons.IconCoins);
  assert.equal(getCategoryIcon('自定义支出', 'expense'), icons.IconReceipt);
  assert.equal(getCategoryIcon('__proto__'), icons.IconReceipt);
  assert.equal(getCategoryIcon('餐饮', 'transfer'), icons.ArrowsLeftRight);
  assert.equal(getCategoryIcon('自定义还款', 'loan_repayment'), icons.IconBank);
  console.log('PASS：21 个内置收支分类、Phosphor SVG 渲染、收入别名、转账和自定义分类兜底。');
} finally {
  await server.close();
}
