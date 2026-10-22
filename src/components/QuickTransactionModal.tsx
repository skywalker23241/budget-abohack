import { useEffect, useMemo, useState } from 'react';
import type { PaymentMethod, TransactionType } from '@/types';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/lib/constants';
import { safeNumber, todayStr } from '@/lib/format';
import { getExpenseCategories } from '@/lib/categories';
import { useStore } from '@/store/useStore';
import { Modal } from '@/components/Modal';
import { Button, Input } from '@/components/ui';
import { SelectField } from '@/components/forms/fields';
import { InlineDisclosure } from '@/components/MobileCollapsibleSection';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/DatePicker';
import { AmountField, IconChoices } from '@/components/forms/EntryFields';

const QUICK_EXPENSE_CATEGORIES = [
  '餐饮',
  '超市/日用品',
  '交通',
  '娱乐',
  '订阅服务',
  '服装',
  '医疗',
  '学习',
  '旅行',
  '其他支出',
] as const;

function defaultCategory(type: TransactionType): string {
  return type === 'income' ? INCOME_CATEGORIES[0] : '餐饮';
}

export function QuickTransactionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addTransaction = useStore((s) => s.addTransaction);
  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const toast = useToast();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(defaultCategory('expense'));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('微信');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const categories = useMemo(() => type === 'income' ? INCOME_CATEGORIES : [
    ...QUICK_EXPENSE_CATEGORIES,
    ...getExpenseCategories(budgets, transactions).filter((name) => !EXPENSE_CATEGORIES.some((builtIn) => builtIn === name)),
  ], [type, budgets, transactions]);
  const isIncome = type === 'income';

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType);
    setCategory(defaultCategory(nextType));
    setError('');
  }

  function reset() {
    setType('expense');
    setAmount('');
    setCategory(defaultCategory('expense'));
    setPaymentMethod('微信');
    setDate(todayStr());
    setNote('');
    setError('');
  }

  function handleClose() {
    reset();
    onClose();
    window.dispatchEvent(new CustomEvent('budget-app:quick-entry:closed'));
  }

  useEffect(() => {
    const closeFromGuide = () => {
      if (open) handleClose();
    };
    window.addEventListener('budget-app:quick-entry:close', closeFromGuide);
    return () => window.removeEventListener('budget-app:quick-entry:close', closeFromGuide);
  }, [open]);

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const safeAmount = safeNumber(amount);
    if (safeAmount <= 0) {
      setError('请输入有效金额');
      return;
    }

    addTransaction({
      date,
      type,
      amount: safeAmount,
      category,
      paymentMethod,
      note: note.trim(),
      countInBudget: !isIncome,
      isFixed: false,
    });
    toast.success('已记一笔');
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="快速记账" maxWidth="max-w-xl">
      <form data-tour="quick-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
          {(['expense', 'income'] as TransactionType[]).map((item) => {
            const active = type === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleTypeChange(item)}
                className={cn(
                  'h-10 rounded-md text-sm font-semibold transition-colors',
                  'app-press',
                  active
                    ? item === 'income'
                      ? 'glass-button bg-success text-success-foreground'
                      : 'glass-button bg-primary/80 text-primary-foreground'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {item === 'income' ? '收入' : '支出'}
              </button>
            );
          })}
        </div>

        <AmountField label="金额" value={amount} onChange={(value) => { setAmount(value); setError(''); }} error={error} autoFocus />

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">分类</p>
          <IconChoices label="分类" value={category} options={categories} onChange={setCategory} type={type} className="sm:grid-cols-5" />
        </div>

        <InlineDisclosure title="更多选项">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">支付方式</p>
              <SelectField
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                options={PAYMENT_METHODS}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">日期</p>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-sm font-medium text-foreground">备注</p>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选"
              maxLength={100}
            />
          </div>
        </InlineDisclosure>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Modal>
  );
}
