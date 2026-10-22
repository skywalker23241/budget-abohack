import assert from 'node:assert/strict';
import { createServer } from 'vite';

// 仅使用内存存储，不访问开发浏览器中的账本。
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.localStorage = localStorage;
globalThis.window = { localStorage };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { getExpenseCategories, newBudgetCategoryError } = await server.ssrLoadModule('/src/lib/categories.ts');
  const { EXPENSE_CATEGORIES, STORAGE_KEY } = await server.ssrLoadModule('/src/lib/constants.ts');
  const { budgetsWithUsage } = await server.ssrLoadModule('/src/lib/calculations.ts');
  const { useStore } = await server.ssrLoadModule('/src/store/useStore.ts');
  assert.equal(newBudgetCategoryError('   ', []), '请输入分类名称');
  assert.equal(newBudgetCategoryError('a'.repeat(31), []), '分类名称最多 30 个字符');
  assert.equal(newBudgetCategoryError(' 健身 ', ['健身']), '本月已有该分类预算');
  assert.equal(newBudgetCategoryError('gym', [' GYM ']), '本月已有该分类预算');
  assert.equal(newBudgetCategoryError('健身', [...EXPENSE_CATEGORIES]), '');
  assert.equal(newBudgetCategoryError('custom', []), '');
  const categories = getExpenseCategories([{ category: '健身' }, { category: '健身' }], [
    { category: '数码', type: 'expense' }, { category: '健身', type: 'expense' },
    { category: '自定义工资', type: 'income' }, { category: '账户互转', type: 'transfer' },
  ]);
  assert.deepEqual(categories, [...EXPENSE_CATEGORIES, '健身', '数码']);

  useStore.setState({ budgets: [], transactions: [] });
  useStore.getState().addBudget({ month: '2026-10', category: '健身', amount: 500 });
  useStore.getState().addTransaction({ date: '2026-10-22', type: 'expense', amount: 100,
    category: '健身', paymentMethod: '微信', note: '', countInBudget: true, isFixed: false });
  const state = useStore.getState();
  const [budget] = budgetsWithUsage(state.budgets, state.transactions, '2026-10', 0.8);
  assert.equal(budget.used, 100);
  assert.equal(budget.remaining, 400);
  assert.equal(budget.usageRate, 0.2);
  assert.ok(getExpenseCategories(state.budgets, state.transactions).includes('健身'));
  assert.equal(state.copyBudgetFromPrevMonth('2026-11'), 1);
  assert.equal(useStore.getState().budgets.find((item) => item.month === '2026-11').category, '健身');
  state.updateBudget(budget.id, { amount: 700 });
  assert.equal(useStore.getState().budgets.find((item) => item.id === budget.id).category, '健身');
  assert.match(storage.get(STORAGE_KEY), /健身/);
  console.log('PASS：自定义分类校验、内置分类用尽后新增、分类去重、支出关联、预算使用率、金额编辑、跨月复制与持久化。');
} finally {
  await server.close();
}
