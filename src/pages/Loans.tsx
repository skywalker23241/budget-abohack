/**
 * 贷款管理页面：贷款列表、还款进度、记录还款（同步记账）、预计还清日期。
 */
import { useMemo, useState } from 'react';
import type { Loan } from '@/types';
import { useStore } from '@/store/useStore';
import {
  totalRemainingPrincipal,
  totalMonthlyRepayment,
  loanToIncomeRatio,
  remainingPeriods,
  loanProgress,
  payoffMonth,
  totalIncome,
} from '@/lib/calculations';
import {
  currentMonth,
  formatCurrency,
  formatPercent,
  formatMonthLabel,
  daysUntilRepaymentDay,
} from '@/lib/format';
import { Card, ProgressBar, EmptyState, Button } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { LoanForm } from '@/components/forms/LoanForm';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import {
  IconPlus,
  IconBank,
  IconEdit,
  IconTrash,
  IconCheck,
  IconCalendar,
  IconCheckCircle,
  House,
  Car,
  IconWallet,
  ChevronDown,
} from '@/components/Icons';

export function Loans() {
  const loans = useStore((s) => s.loans);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const deleteLoan = useStore((s) => s.deleteLoan);
  const recordLoanPayment = useStore((s) => s.recordLoanPayment);
  const cur = settings.currency;
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [view, setView] = useState<'active' | 'settled'>('active');

  const monthIncome = useMemo(
    () => totalIncome(transactions, currentMonth()),
    [transactions]
  );
  const activeLoans = loans.filter((l) => l.remainingPrincipal > 0);
  const settledLoans = loans.filter((l) => l.remainingPrincipal <= 0);
  const totalRemaining = totalRemainingPrincipal(activeLoans);
  const totalMonthly = totalMonthlyRepayment(activeLoans);
  const ratio = loanToIncomeRatio(activeLoans, monthIncome);
  const visibleLoans = view === 'active'
    ? [...activeLoans].sort((a, b) => daysUntilRepaymentDay(a.repaymentDay) - daysUntilRepaymentDay(b.repaymentDay))
    : settledLoans;
  const nextRepayment = activeLoans
    .map((loan) => ({ loan, days: daysUntilRepaymentDay(loan.repaymentDay) }))
    .sort((a, b) => a.days - b.days)[0];

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(l: Loan) {
    setEditing(l);
    setShowForm(true);
  }
  async function handleDelete(l: Loan) {
    const ok = await confirm({
      title: '删除贷款',
      message: `确定删除「${l.name}」吗？已生成的还款记账不会被删除。`,
      danger: true,
      confirmText: '删除',
    });
    if (ok) {
      deleteLoan(l.id);
      toast.success('贷款已删除');
    }
  }
  async function handleRepay(l: Loan) {
    if (l.remainingPrincipal <= 0) {
      toast.info('该贷款已结清');
      return;
    }
    const ok = await confirm({
      title: '记录一次还款',
      message: `将为「${l.name}」记录一期还款 ${formatCurrency(
        l.monthlyPayment,
        cur
      )}，自动减少剩余本金并同步到记账。确认继续？`,
      confirmText: '确认还款',
    });
    if (ok) {
      recordLoanPayment(l.id);
      toast.success('已记录还款并同步到记账');
    }
  }

  return (
    <>
      <header className="mb-5 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">贷款管理</h1>
        </div>
          <Button onClick={openAdd} className="h-11 shrink-0 rounded-2xl px-3 sm:px-4">
            <IconPlus className="h-4 w-4" />
            新增贷款
          </Button>
      </header>

      <Card className="relative overflow-hidden rounded-3xl border-primary/15 bg-primary/[0.04]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/[0.07]" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><IconCalendar className="h-4 w-4" />每月计划还款</p>
          <span className="text-[11px] text-muted-foreground">{formatMonthLabel(currentMonth())}</span>
        </div>
        <p data-loan-monthly className="relative mt-2 break-words text-[32px] font-semibold leading-tight tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-4xl">{formatCurrency(totalMonthly, cur)}</p>
        <div className="relative mt-5 grid grid-cols-2 gap-4">
          <div className="min-w-0 border-r border-border/60 pr-3">
            <p className="text-xs text-muted-foreground">待还本金</p>
            <p className="mt-1 break-words text-sm font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-base">{formatCurrency(totalRemaining, cur)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">月供 / 本月收入</p>
            <p className={`mt-1 text-sm font-semibold sm:text-base ${monthIncome > 0 && ratio > 0.4 ? 'text-destructive' : 'text-foreground'}`}>{monthIncome > 0 ? formatPercent(ratio) : '暂无收入记录'}</p>
          </div>
        </div>
        {nextRepayment && <div className="relative mt-4 flex min-w-0 items-center gap-2 border-t border-border/60 pt-3 text-xs">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${nextRepayment.days <= 3 ? 'bg-warning' : 'bg-primary'}`} />
            <span className="shrink-0 text-muted-foreground">最近还款日</span>
            <span className="min-w-0 flex-1 truncate font-medium">{nextRepayment.loan.name}</span>
            <span className={`shrink-0 font-medium ${nextRepayment.days <= 3 ? 'text-warning' : 'text-accent-foreground'}`}>{nextRepayment.days === 0 ? '今天' : `${nextRepayment.days} 天后`}</span>
        </div>}
      </Card>

      <div className="mt-4">
        {loans.length === 0 ? (
          <EmptyState
            icon={<IconBank className="h-6 w-6" />}
            title="还没有贷款记录"
            action={
              <Button onClick={openAdd}>
                <IconPlus className="h-4 w-4" />
                新增贷款
              </Button>
            }
          />
        ) : (
          <>
          <div className="mb-4 flex rounded-2xl bg-muted/60 p-1" role="group" aria-label="贷款状态筛选">
            {([['active', '还款中', activeLoans.length], ['settled', '已结清', settledLoans.length]] as const).map(([value, label, count]) => (
              <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className="app-segment app-press flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium">
                {label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${view === value ? 'bg-primary/10 text-accent-foreground' : 'bg-background/60'}`}>{count}</span>
              </button>
            ))}
          </div>
          {visibleLoans.length === 0 ? <EmptyState icon={<IconCheckCircle className="h-6 w-6" />} title={view === 'active' ? '当前没有待还贷款' : '还没有已结清的贷款'} /> : <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {visibleLoans.map((l) => {
              const progress = loanProgress(l);
              const remPeriods = remainingPeriods(l);
              const days = daysUntilRepaymentDay(l.repaymentDay);
              const paidOff = l.remainingPrincipal <= 0;
              const dueSoon = l.remindEnabled && !paidOff && days <= 3;
              const LoanIcon = l.type === '房贷' ? House : l.type === '车贷' ? Car : l.type === '消费贷' || l.type === '信用卡分期' ? IconWallet : IconBank;
              return (
                <article key={l.id} aria-label={l.name} data-loan-card>
                <Card className={`rounded-3xl ${dueSoon ? 'ring-1 ring-warning/30' : ''}`}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${paidOff ? 'bg-success/10 text-success' : 'bg-primary/10 text-accent-foreground'}`}><LoanIcon className="h-5 w-5" weight="duotone" /></span>
                      <div className="min-w-0">
                        <h2 className="break-words text-base font-semibold text-foreground [overflow-wrap:anywhere]">{l.name}</h2>
                      </div>
                    </div>
                      <button
                        type="button"
                        onClick={() => openEdit(l)}
                        className="app-press -mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`编辑${l.name}`}
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-muted/35 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">剩余本金</p>
                      <p className="mt-1 break-words text-sm font-semibold tabular-nums text-foreground [overflow-wrap:anywhere] sm:text-base">
                        {formatCurrency(l.remainingPrincipal, cur)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{paidOff ? '贷款状态' : '每月月供'}</p>
                      <p className={`mt-1 break-words text-sm font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-base ${paidOff ? 'text-success' : 'text-foreground'}`}>
                        {paidOff ? '已结清' : formatCurrency(l.monthlyPayment, cur)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        已还 {l.paidPeriods} / {l.termMonths} 期
                      </span>
                    </div>
                    <ProgressBar value={paidOff ? 1 : progress} tone={paidOff ? 'emerald' : 'brand'} className="h-1.5" />
                  </div>

                  <details className="group mt-2">
                    <summary className="app-press flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-1.5"><IconCalendar className="h-3.5 w-3.5 shrink-0" />{paidOff ? '查看贷款详情' : `每月 ${l.repaymentDay} 日 · 剩余 ${remPeriods} 期`}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                    </summary>
                    <div className="space-y-3 border-t border-border/50 pb-3 pt-3 text-xs">
                      <dl className="grid grid-cols-2 gap-3">
                        {l.platform && <div><dt className="text-muted-foreground">平台</dt><dd className="mt-1 font-medium">{l.platform}</dd></div>}
                        <div><dt className="text-muted-foreground">还款计算</dt><dd className="mt-1 font-medium">等额本息估算</dd></div>
                        <div className="min-w-0"><dt className="text-muted-foreground">初始本金</dt><dd className="mt-1 break-words font-medium [overflow-wrap:anywhere]">{formatCurrency(l.principal, cur)}</dd></div>
                        <div><dt className="text-muted-foreground">年利率</dt><dd className="mt-1 font-medium">{l.annualRate}%</dd></div>
                        <div><dt className="text-muted-foreground">开始日期</dt><dd className="mt-1 font-medium">{l.startDate}</dd></div>
                        <div><dt className="text-muted-foreground">预计还清</dt><dd className="mt-1 font-medium">{paidOff ? '已结清' : remPeriods > 0 ? formatMonthLabel(payoffMonth(l)) : '请核对剩余本金'}</dd></div>
                      </dl>
                      {l.note && <p className="break-words leading-5 text-muted-foreground [overflow-wrap:anywhere]">备注：{l.note}</p>}
                      <Button type="button" variant="ghost" className="h-11 w-full rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(l)}><IconTrash className="h-4 w-4" />删除贷款</Button>
                    </div>
                  </details>

                  {!paidOff && (
                    <Button
                      variant={dueSoon ? 'default' : 'outline'}
                      className="mt-1 h-11 w-full rounded-2xl"
                      onClick={() => handleRepay(l)}
                    >
                      <IconCheck className="h-4 w-4" />
                      记录本期还款
                    </Button>
                  )}
                </Card>
                </article>
              );
            })}
          </div>}
          </>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '编辑贷款' : '新增贷款'}
        maxWidth="max-w-xl"
      >
        <LoanForm initial={editing ?? undefined} onClose={() => setShowForm(false)} />
      </Modal>

    </>
  );
}
