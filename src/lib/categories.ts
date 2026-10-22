import { EXPENSE_CATEGORIES } from './constants';
import type { Budget, Transaction } from '@/types';

/** 分类保存在预算 / 账单中，跨月份复用，无需另存一份分类配置。 */
export function getExpenseCategories(
  budgets: readonly Pick<Budget, 'category'>[],
  transactions: readonly Pick<Transaction, 'type' | 'category'>[],
): string[] {
  return [...new Set<string>([
    ...EXPENSE_CATEGORIES,
    ...budgets.map((budget) => budget.category),
    ...transactions.filter((transaction) => transaction.type === 'expense' || transaction.type === 'loan_repayment').map((transaction) => transaction.category),
  ].filter((category) => category.trim()))];
}

export function newBudgetCategoryError(name: string, existingCategories: readonly string[]): string {
  const category = name.trim();
  if (!category) return '请输入分类名称';
  if (category.length > 30) return '分类名称最多 30 个字符';
  if (existingCategories.some((existing) => existing.trim().toLocaleLowerCase() === category.toLocaleLowerCase())) {
    return '本月已有该分类预算';
  }
  return '';
}
