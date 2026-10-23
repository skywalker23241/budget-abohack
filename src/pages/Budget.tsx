/**
 * 预算管理页面：按月设置分类预算，展示使用进度、超支高亮，支持复制上月预算。
 */
import { useMemo, useState } from 'react';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { Budget, BudgetWithUsage } from '@/types';
import { useStore } from '@/store/useStore';
import { budgetsWithUsage, budgetSummary } from '@/lib/calculations';
import { currentMonth, formatCurrency, formatPercent, prevMonth, formatMonthLabel } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { AppSummaryCard } from '@/components/AppSummaryCard';
import { MonthPicker } from '@/components/MonthPicker';
import { Card, ProgressBar, EmptyState, Button } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { AmountText } from '@/components/AmountText';
import { IconPlus, IconWallet, IconEdit, IconTrash, IconDownload } from '@/components/Icons';

const STATUS_META = {
  normal: { tone: 'emerald' as const, label: '正常', bar: 'emerald' as const },
  warning: { tone: 'amber' as const, label: '接近超支', bar: 'amber' as const },
  exceeded: { tone: 'rose' as const, label: '已超支', bar: 'rose' as const },
};

export function BudgetPage() {
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [budgetView, setBudgetView] = useState<'all' | 'watch'>('all');

  const budgets = useStore((s) => s.budgets);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const deleteBudget = useStore((s) => s.deleteBudget);
  const copyBudgetFromPrevMonth = useStore((s) => s.copyBudgetFromPrevMonth);
  const cur = settings.currency;
  const warnRate = settings.budgetWarnThreshold / 100;
  const confirm = useConfirm();
  const toast = useToast();

  const list = useMemo(
    () => budgetsWithUsage(budgets, transactions, month, warnRate),
    [budgets, transactions, month, warnRate]
  );
  const summary = useMemo(
    () => budgetSummary(budgets, transactions, month, warnRate),
    [budgets, transactions, month, warnRate]
  );
  const sorted = useMemo(
    () => [...list].sort((a, b) => b.usageRate - a.usageRate),
    [list]
  );
  const existingCategories = list.map((b) => b.category);
  const watchCount = sorted.filter((b) => b.status !== 'normal').length;
  const summaryAccent =
    summary.usageRate >= 1
      ? 'danger'
      : summary.usageRate >= warnRate
        ? 'warning'
        : summary.total > 0
          ? 'success'
          : 'default';

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(b: BudgetWithUsage) {
    setEditing(b);
    setShowForm(true);
  }
  async function handleDelete(b: BudgetWithUsage) {
    const ok = await confirm({
      title: '删除预算',
      message: `确定删除「${b.category}」的预算吗？`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteBudget(b.id);
      toast.success('预算已删除');
    }
  }
  function handleCopy() {
    const n = copyBudgetFromPrevMonth(month);
    if (n > 0) toast.success(`已从 ${formatMonthLabel(prevMonth(month))} 复制 ${n} 项预算`);
    else toast.info('上月没有可复制的新预算项');
  }

  return (
    <>
      <PageHeader
        title="预算管理"
        actions={
            <Button data-tour="budget-add" onClick={openAdd}>
              <IconPlus className="h-4 w-4" />
              新增预算
            </Button>
        }
      />
      <div className="mb-4 flex justify-end">
        <div role="group" aria-label="预算月份与复制" className="glass-button inline-flex items-center rounded-2xl border-primary/30 bg-primary/10 p-1">
          <MonthPicker
            month={month}
            onChange={setMonth}
            className="rounded-xl border-transparent bg-transparent bg-none shadow-none hover:border-transparent hover:bg-primary/20 data-[state=open]:border-transparent data-[state=open]:bg-primary/20"
          />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-primary/30" />
          <Button variant="ghost" className="h-11 rounded-xl px-3 text-xs text-accent-foreground hover:bg-primary/20" onClick={handleCopy} title="复制上月预算到所选月份"><IconDownload />复制上月</Button>
        </div>
      </div>

      <AppSummaryCard
        title={
          summary.total === 0
            ? '分类预算'
            : summary.remaining >= 0
              ? '预算剩余'
              : '预算已超支'
        }
        value={
          summary.total === 0
            ? '未设置'
            : formatCurrency(Math.abs(summary.remaining), cur)
        }
        accent={summaryAccent}
        meta={[
          { label: '总预算', value: formatCurrency(summary.total, cur) },
          { label: '已使用', value: formatCurrency(summary.used, cur) },
          { label: '使用率', value: formatPercent(summary.usageRate) },
        ]}
      >
        {summary.total > 0 && <ProgressBar value={summary.usageRate} tone={summary.usageRate >= 1 ? 'rose' : summary.usageRate >= warnRate ? 'amber' : 'brand'} className="h-1.5" />}
      </AppSummaryCard>

      {/* 预算列表 */}
      <div className="mt-4">
        {sorted.length > 0 && <div role="group" aria-label="预算分类筛选" className="mb-3 flex gap-1 rounded-2xl bg-muted/50 p-1 lg:hidden">
          {([['all', `全部分类 ${sorted.length}`], ['watch', `需关注 ${watchCount}`]] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={budgetView===value} onClick={()=>setBudgetView(value)} className="app-segment min-h-11 flex-1 rounded-xl px-2 text-sm font-medium">{label}</button>)}
        </div>}
        {sorted.length>0 && budgetView==='watch' && watchCount===0 && <p className="rounded-2xl border border-dashed p-5 text-center text-sm text-muted-foreground lg:hidden">当前没有需要关注的分类</p>}
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconWallet className="h-6 w-6" />}
            title={`${formatMonthLabel(month)} 还没有预算`}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy}>
                  复制上月
                </Button>
                <Button onClick={openAdd}>
                  <IconPlus className="h-4 w-4" />
                  新增预算
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {sorted.map((b) => {
              const meta = STATUS_META[b.status];
              return (
                <Card
                  key={b.id}
                  className={cn(
                    'p-4 sm:p-5',
                    b.status === 'exceeded' && 'border-destructive/25',
                    budgetView === 'watch' && b.status === 'normal' && 'hidden lg:block',
                  )}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground">
                        <CategoryIcon category={b.category} className="h-4 w-4" />
                      </span>
                      <h2 className="min-w-0 break-words text-sm font-semibold text-foreground">{b.category}</h2>
                    </div>
                    <div className="-mr-2 flex shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="app-press flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`编辑${b.category}预算`}
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="app-press flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`删除${b.category}预算`}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 items-end gap-4">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs text-muted-foreground">已用</p>
                      <AmountText value={formatCurrency(b.used, cur)} maxSize={26} />
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="mb-1 text-xs text-muted-foreground">预算</p>
                      <AmountText className="text-muted-foreground" value={formatCurrency(b.amount, cur)} maxSize={18} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={b.usageRate} tone={meta.bar} className="h-1.5" />
                    <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                      <div
                        className={cn('flex min-w-0 flex-1 items-center gap-1.5', b.remaining < 0 ? 'text-destructive' : 'text-muted-foreground')}
                      >
                        <span className="shrink-0">{b.remaining >= 0 ? '剩余' : '超支'}</span>
                        <AmountText className="min-w-0 flex-1" value={formatCurrency(Math.abs(b.remaining), cur)} maxSize={13} />
                      </div>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{formatPercent(b.usageRate)}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑预算' : '新增预算'}
        maxWidth="max-w-xl"
      >
        <BudgetForm
          initial={editing ?? undefined}
          month={month}
          existingCategories={existingCategories}
          onClose={() => setShowForm(false)}
        />
      </Modal>
    </>
  );
}
