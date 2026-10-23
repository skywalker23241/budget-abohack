/**
 * 预算表单：为某分类设置 / 修改预算金额。
 */
import { useState } from 'react';
import type { Budget } from '@/types';
import { getExpenseCategories, newBudgetCategoryError } from '@/lib/categories';
import { safeNumber, formatMonthLabel } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useToast } from '../Toast';
import { Button, Input } from '@/components/ui';
import { Field } from './fields';
import { AmountField, IconChoices } from './EntryFields';
import { IconPlus } from '@/components/Icons';

interface Props {
  initial?: Budget;
  month: string;
  /** 当月已存在预算的分类（新增时用于过滤，避免重复） */
  existingCategories: string[];
  onClose: () => void;
}

export function BudgetForm({ initial, month, existingCategories, onClose }: Props) {
  const addBudget = useStore((s) => s.addBudget);
  const updateBudget = useStore((s) => s.updateBudget);
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const toast = useToast();
  const isEdit = !!initial;

  const available = getExpenseCategories(budgets, transactions).filter(
    (c) => isEdit || !existingCategories.includes(c)
  );
  const [category, setCategory] = useState(
    initial ? `category:${initial.category}` : available.length ? `category:${available[0]}` : 'custom'
  );
  const [customName, setCustomName] = useState('');
  const isCustom = category === 'custom';
  const resolvedCategory = isCustom ? customName.trim() : category.slice('category:'.length);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    const categoryError = isEdit ? (!resolvedCategory ? '请选择分类' : '') : newBudgetCategoryError(resolvedCategory, existingCategories);
    if (categoryError) e.category = categoryError;
    if (!amount.trim()) e.amount = '请输入预算金额';
    else if (safeNumber(amount) <= 0) e.amount = '预算金额必须大于 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    if (isEdit && initial) {
      updateBudget(initial.id, { category: resolvedCategory, amount: safeNumber(amount) });
      toast.success('预算已更新');
    } else {
      addBudget({ month, category: resolvedCategory, amount: safeNumber(amount) });
      toast.success('预算已添加');
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AmountField label={`${formatMonthLabel(month)}预算金额`} value={amount} onChange={setAmount} error={errors.amount} autoFocus />
      <Field label="支出分类" required error={!isCustom ? errors.category : undefined}>
        <IconChoices
          label="支出分类"
          value={category}
          onChange={(value) => { setCategory(value); setErrors({}); }}
          options={[
            ...(isEdit && initial ? [initial.category] : available).map((name) => ({ value: `category:${name}`, label: name })),
            ...(!isEdit ? [{ value: 'custom', label: '自定义', icon: IconPlus }] : []),
          ]}
          className={isEdit ? 'grid-cols-1' : 'sm:grid-cols-5'}
          disabled={isEdit}
        />
      </Field>
      {isCustom && (
        <Field id="budget-custom-category" label="分类名称" required error={errors.category}>
          <Input id="budget-custom-category" value={customName} maxLength={30} placeholder="例如：健身、咖啡、数码"
            onChange={(event) => { setCustomName(event.target.value); setErrors({}); }} aria-invalid={!!errors.category} />
        </Field>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="submit">{isEdit ? '保存修改' : '添加预算'}</Button>
      </div>
    </form>
  );
}
