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
import { StatCard, Card, ProgressBar, Badge, EmptyState, Button } from '@/components/ui';
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
  const riskiestBudget = sorted[0];
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <MonthPicker month={month} onChange={setMonth} compact />
        <Button variant="ghost" className="h-11 rounded-xl px-2 text-xs" onClick={handleCopy} title="复制上月预算到所选月份"><IconDownload />复制上月</Button>
      </div>

      <AppSummaryCard
        eyebrow={formatMonthLabel(month)}
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
        subtitle={
          summary.total === 0
            ? undefined
            : riskiestBudget
              ? `${riskiestBudget.category} · 已用 ${formatPercent(
                  riskiestBudget.usageRate,
                )}`
              : undefined
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

      {/* 总览 */}
      <div className="mt-4 hidden grid-cols-2 gap-3 sm:gap-4 lg:grid lg:grid-cols-4">
        <StatCard
          label="本月总预算"
          value={formatCurrency(summary.total, cur)}
          icon={<IconWallet className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="本月已使用"
          value={formatCurrency(summary.used, cur)}
          tone="expense"
        />
        <StatCard
          label="本月剩余"
          value={formatCurrency(summary.remaining, cur)}
          tone={summary.remaining >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          label="预算使用率"
          value={formatPercent(summary.usageRate)}
          tone={
            summary.usageRate >= 1
              ? 'expense'
              : summary.usageRate >= warnRate
                ? 'warning'
                : 'default'
          }
        />
      </div>

      {/* 总进度 */}
      {summary.total > 0 && (
        <Card className="mt-4 hidden lg:block">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-foreground">总预算执行进度</span>
            <span className="break-words text-muted-foreground [overflow-wrap:anywhere]">
              {formatCurrency(summary.used, cur)} / {formatCurrency(summary.total, cur)}
            </span>
          </div>
          <ProgressBar
            value={summary.usageRate}
            tone={
              summary.usageRate >= 1
                ? 'rose'
                : summary.usageRate >= warnRate
                  ? 'amber'
                  : 'emerald'
            }
          />
        </Card>
      )}

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
            description="新增预算，或复制上月预算"
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
                    b.status === 'exceeded' && 'ring-1 ring-destructive/30',
                    budgetView === 'watch' && b.status === 'normal' && 'hidden lg:block',
                  )}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CategoryIcon category={b.category} className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 break-words font-medium text-foreground">
                          {b.category}
                        </span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <button
                        onClick={() => openEdit(b)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                    <div className="min-w-0"><p className="mb-1 text-muted-foreground">已使用</p><AmountText value={formatCurrency(b.used,cur)} maxSize={18}/></div>
                    <div className="min-w-0"><p className="mb-1 text-muted-foreground">分类预算</p><AmountText value={formatCurrency(b.amount,cur)} maxSize={18}/></div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={b.usageRate} tone={meta.bar} />
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span
                        className={
                          b.status === 'exceeded' ? 'text-destructive' : 'text-muted-foreground'
                        }
                      >
                        {formatPercent(b.usageRate)}
                      </span>
                      <span
                        className={cn('flex w-[65%] min-w-0 items-center justify-end gap-2',
                          b.remaining < 0
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        )}
                      >
                        <span className="shrink-0">{b.remaining >= 0 ? '剩余' : '超支'}</span><AmountText className="min-w-0 flex-1 text-right" value={formatCurrency(Math.abs(b.remaining),cur)} maxSize={14}/>
                      </span>
                    </div>
                  </div>
                  <details className="mt-1 text-xs text-muted-foreground"><summary className="flex min-h-11 cursor-pointer items-center">管理此分类</summary><Button type="button" variant="ghost" className="h-11 w-full text-destructive" onClick={()=>handleDelete(b)}><IconTrash/>删除预算</Button></details>
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
