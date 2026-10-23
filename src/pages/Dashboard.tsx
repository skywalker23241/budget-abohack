/**
 * 首页仪表盘：核心财务数据、图表、最近记录、提醒、健康评分。
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useStore } from '@/store/useStore';
import {
  totalIncome,
  totalExpense,
  savingsRate as calcSavingsRate,
  expenseByCategory,
  budgetSummary,
  totalRemainingPrincipal,
  loanToIncomeRatio,
  findLargeExpenses,
  budgetsWithUsage,
  healthScore,
  transactionsInMonth,
  goalProgress,
} from '@/lib/calculations';
import { generateReminders } from '@/lib/reminders';
import {
  formatCurrency,
  formatPercent,
  currentMonth,
  lastNDays,
  monthOf,
  todayStr,
  formatMonthLabel,
  toDateStr,
} from '@/lib/format';
import { MonthPicker } from '@/components/MonthPicker';
import { Card, SectionTitle, Button, ProgressBar } from '@/components/ui';
import { CategoryDonut, IncomeExpenseTrend } from '@/components/charts';
import { ReminderList } from '@/components/ReminderList';
import { QuickTransactionModal } from '@/components/QuickTransactionModal';
import { cn } from '@/lib/utils';
import {
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconWallet,
  IconBank,
  IconTarget,
  IconReceipt,
  IconChevronRight,
} from '@/components/Icons';

/** 健康评分环形图 */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color =
    score >= 85 ? '#10b981' : score >= 70 ? '#6366f1' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" className="stroke-muted" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground" aria-label={`${score} 分，满分 100`}>{score}</span>
      </div>
    </div>
  );
}

function MetricRing({
  value,
  label,
  tone = 'success',
}: {
  value: number;
  label: string;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(1, Math.max(0, value));
  const toneClass = {
    success: 'stroke-emerald-400',
    warning: 'stroke-amber-400',
    danger: 'stroke-rose-400',
  }[tone];

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" className="stroke-white/10" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - normalized)}
          className={cn('transition-all duration-700', toneClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-semibold text-foreground">{Math.round(value * 100)}%</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function OverviewMetric({
  label,
  value,
  tone = 'default',
  icon,
  wide = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'income' | 'expense';
  icon: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn('group min-w-0 rounded-2xl border border-border/50 bg-card/45 p-3 transition-colors hover:bg-accent/50 md:p-3.5', wide && 'col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:block')}>
      <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <div className={cn('min-w-0 [container-type:inline-size]', wide ? 'w-3/5 md:w-full' : 'mt-2 w-full')}>
      <p
        data-dashboard-money
        title={value}
        style={{ fontSize: `min(1.25rem, ${150 / value.length}cqw)` }}
        className={cn(
          'whitespace-nowrap text-right text-sm font-semibold tabular-nums tracking-tight md:text-left',
          !wide && 'text-left',
          wide && 'md:mt-2',
          tone === 'income' && 'text-success',
          tone === 'expense' && 'text-destructive',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </p>
      </div>
    </div>
  );
}

function DashboardSectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-2 sm:mb-4 sm:items-end">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [showAdd, setShowAdd] = useState(false);

  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const loans = useStore((s) => s.loans);
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);

  const cur = settings.currency;
  const warnRate = settings.budgetWarnThreshold / 100;

  const data = useMemo(() => {
    const income = totalIncome(transactions, month);
    const expense = totalExpense(transactions, month);
    const balance = income - expense;
    const rate = calcSavingsRate(transactions, month);
    const bSummary = budgetSummary(budgets, transactions, month, warnRate);
    const bList = budgetsWithUsage(budgets, transactions, month, warnRate);
    const overBudget = bList.filter((b) => b.status === 'exceeded');
    const budgetWatch = bList
      .filter((b) => b.status !== 'normal')
      .sort((a, b) => b.usageRate - a.usageRate)
      .slice(0, 3);
    const loanRemaining = totalRemainingPrincipal(loans);
    const monthRepayment = transactionsInMonth(transactions, month)
      .filter((t) => t.type === 'loan_repayment')
      .reduce((s, t) => s + t.amount, 0);
    const loanRatio = loanToIncomeRatio(loans.filter((loan) => loan.remainingPrincipal > 0), income);
    const large = findLargeExpenses(transactions, month, settings.largeExpenseThreshold);
    const goalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const goalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const goalRate =
      goalTarget > 0
        ? Math.min(1, goalSaved / goalTarget)
        : goals.length > 0
          ? goals.reduce((sum, goal) => sum + goalProgress(goal), 0) / goals.length
          : 0;

    const pieData = expenseByCategory(transactions, month).map((e) => ({
      name: e.category,
      value: e.amount,
    }));

    // 最近 7 天趋势
    const [year, selectedMonth] = month.split('-').map(Number);
    const lastDay = new Date(year, selectedMonth, 0).getDate();
    const days = month === currentMonth() ? lastNDays(7) : Array.from({ length: 7 }, (_, index) => toDateStr(new Date(year, selectedMonth - 1, lastDay - 6 + index)));
    const trend = days.map((d) => {
      const dayTxs = transactions.filter((t) => t.date === d);
      return {
        label: d.slice(5),
        income: dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTxs
          .filter((t) => t.type === 'expense' || t.type === 'loan_repayment')
          .reduce((s, t) => s + t.amount, 0),
      };
    });

    const recent = [...transactionsInMonth(transactions, month)]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
      .slice(0, 10);

    const health = healthScore({
      income,
      expense,
      savingsRateValue: rate,
      savingsTarget: settings.savingsRateTarget / 100,
      overBudgetCount: overBudget.length,
      loanRatio,
      largeExpenseCount: large.length,
    });

    const reminders = generateReminders({
      transactions,
      budgets,
      loans,
      goals,
      settings,
      month,
    });

    return {
      income,
      expense,
      balance,
      rate,
      bSummary,
      budgetWatch,
      loanRemaining,
      monthRepayment,
      goalTarget,
      goalSaved,
      goalRate,
      pieData,
      trend,
      recent,
      health,
      budgetReminders: reminders.filter((r) => r.category === 'budget'),
      loanReminders: reminders.filter((r) => r.category === 'loan'),
    };
  }, [transactions, budgets, loans, goals, settings, month, warnRate]);

  const isCurrentMonth = month === monthOf(todayStr());
  const primaryAmount =
    data.bSummary.total > 0 ? Math.abs(data.bSummary.remaining) : data.balance;
  const primaryText = formatCurrency(primaryAmount, cur);
  const budgetTone =
    data.bSummary.usageRate >= 1
      ? 'danger'
      : data.bSummary.usageRate >= warnRate
        ? 'warning'
        : 'success';
  const savingsOnTrack = data.rate >= settings.savingsRateTarget / 100;

  return (
    <div className="flex min-w-0 flex-col">
      <header className="order-1 mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 md:mb-7">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-3xl">财务总览</h1>
        <div className="flex min-w-0 items-center gap-2">
            <MonthPicker month={month} onChange={setMonth} />
            <Button
              data-tour="quick-add"
              className="hidden shadow-sm md:inline-flex"
              onClick={() => setShowAdd(true)}
            >
              <IconPlus className="h-4 w-4" />
              记一笔
            </Button>
        </div>
      </header>

      {/* 第一层：核心财务结论 */}
      <section data-dashboard-summary className="glass-card relative isolate order-2 overflow-hidden rounded-[1.5rem] p-4 text-foreground [--dashboard-primary-size:2.5rem] sm:p-6 lg:p-8 lg:[--dashboard-primary-size:3.75rem]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 12% 0%, hsl(var(--primary) / .16), transparent 32%), radial-gradient(circle at 92% 100%, var(--ambient-blue), transparent 35%)',
          }}
        />

        <div className="mb-1 flex min-w-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{data.bSummary.total > 0 ? data.bSummary.remaining < 0 ? '预算已超支' : '预算剩余' : '收支结余'}</span>
          </div>
          <Link to="/app/budget" data-dashboard-budget-action className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-accent-foreground">{data.bSummary.total > 0 ? '管理预算' : '设置预算'}<IconChevronRight className="h-3 w-3" /></Link>
        </div>

        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)] xl:items-end">
          <div className="min-w-0 [container-type:inline-size]">
            <p data-dashboard-money data-dashboard-primary title={primaryText} style={{ fontSize: `min(var(--dashboard-primary-size), ${150 / primaryText.length}cqw)` }} className={cn('mt-2 whitespace-nowrap text-[2.65rem] font-semibold leading-tight tracking-[-0.045em]', data.bSummary.total > 0 && data.bSummary.remaining < 0 || data.bSummary.total <= 0 && data.balance < 0 ? 'text-destructive' : 'text-foreground')}>
              {primaryText}
            </p>

            {data.bSummary.total > 0 && <div className="mt-4 lg:hidden">
                <div className="mb-2 text-xs text-muted-foreground">预算已用 {formatPercent(data.bSummary.usageRate)}</div>
                <ProgressBar value={data.bSummary.usageRate} tone={budgetTone === 'danger' ? 'rose' : budgetTone === 'warning' ? 'amber' : 'brand'} className="h-1.5" />
            </div>}

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:mt-8 lg:gap-2.5">
              <OverviewMetric
                label="收入"
                value={formatCurrency(data.income, cur)}
                tone="income"
                icon={<IconArrowUp className="h-3.5 w-3.5" />}
              />
              <OverviewMetric
                label="支出"
                value={formatCurrency(data.expense, cur)}
                tone="expense"
                icon={<IconArrowDown className="h-3.5 w-3.5" />}
              />
              <OverviewMetric
                label="收支结余"
                wide
                value={formatCurrency(data.balance, cur)}
                tone={data.balance < 0 ? 'expense' : 'default'}
                icon={<IconWallet className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          <div className="hidden rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm lg:block">
            <div className="flex items-center gap-5">
              <MetricRing
                value={data.bSummary.usageRate}
                label="预算使用"
                tone={budgetTone}
              />
              <div className="min-w-0">
                <dl className="space-y-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">已使用</dt><dd className="mt-1 font-semibold">{formatCurrency(data.bSummary.used, cur)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">总预算</dt><dd className="mt-1 font-semibold">{formatCurrency(data.bSummary.total, cur)}</dd></div>
                </dl>
              </div>
            </div>

            <div className="mt-5 border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">储蓄率</span>
                <span className={savingsOnTrack ? 'text-success' : 'text-warning'}>
                  {formatPercent(data.rate)} / 目标 {settings.savingsRateTarget}%
                </span>
              </div>
              <ProgressBar
                value={
                  settings.savingsRateTarget > 0
                    ? data.rate / (settings.savingsRateTarget / 100)
                    : data.rate
                }
                tone={savingsOnTrack ? 'emerald' : 'amber'}
                className="h-1.5 bg-muted/60"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 第二层：现金流与支出结构 */}
      <section className="order-5 mt-9 hidden lg:order-3 lg:block">
        <DashboardSectionHeading
          title="现金流与支出结构"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/reports">
                查看完整报表
                <IconChevronRight />
              </Link>
            </Button>
          }
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-12">
          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-8">
            <SectionTitle
              title={isCurrentMonth ? '最近 7 天收支趋势' : '月末 7 天收支趋势'}
            />
            <IncomeExpenseTrend data={data.trend} currency={cur} height={286} />
          </Card>

          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-4">
            <SectionTitle
              title="支出结构"
            />
            <CategoryDonut data={data.pieData} currency={cur} height={230} />
            {data.pieData.length > 0 && (
              <div className="mt-2 space-y-3 border-t pt-4">
                {data.pieData.slice(0, 3).map((item) => {
                  const ratio = data.expense > 0 ? item.value / data.expense : 0;
                  return (
                    <div key={item.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-muted-foreground">{item.name}</span>
                        <span className="shrink-0 font-medium text-foreground">
                          {formatPercent(ratio)}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/65"
                          style={{ width: `${Math.min(100, ratio * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* 第三层：预算、贷款、目标专题 */}
      <section className="order-6 mt-9 hidden lg:order-4 lg:block">
        <DashboardSectionHeading
          title="预算、贷款与目标"
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-12">
          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-5">
            <SectionTitle
              title="预算概览"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/app/budget">管理预算</Link>
                </Button>
              }
            />
            <div className="rounded-xl bg-muted/55 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">剩余预算</p>
                  <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere]">
                    {formatCurrency(data.bSummary.remaining, cur)}
                  </p>
                </div>
              </div>
              <ProgressBar
                value={data.bSummary.usageRate}
                tone={budgetTone === 'danger' ? 'rose' : budgetTone === 'warning' ? 'amber' : 'emerald'}
                className="mt-4 h-1.5"
              />
            </div>

            <div className="mt-4 space-y-2">
              {data.budgetWatch.length > 0 ? (
                data.budgetWatch.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.category}</p>
                      <p className="text-xs text-muted-foreground">
                        已用 {formatCurrency(item.used, cur)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-warning">
                      {formatPercent(item.usageRate)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                  当前没有超支或预警分类
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info">
                <IconBank className="h-5 w-5" weight="duotone" />
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/loans">详情</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">贷款待还总额</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere]">
              {formatCurrency(data.loanRemaining, cur)}
            </p>
            <div className="mt-5 space-y-3 border-t pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">本月已还</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(data.monthRepayment, cur)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">还款收入比</span>
                <span className={data.income > 0 && data.monthRepayment / data.income > 0.35 ? 'font-medium text-warning' : 'font-medium text-foreground'}>
                  {data.income > 0 ? formatPercent(data.monthRepayment / data.income) : '待记录收入'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-4">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <IconTarget className="h-5 w-5" weight="duotone" />
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/goals">管理目标</Link>
              </Button>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">目标累计进度</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {formatPercent(data.goalRate)}
                </p>
              </div>
            </div>
            <ProgressBar value={data.goalRate} tone="emerald" className="mt-4 h-1.5" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/55 p-3">
                <p className="text-xs text-muted-foreground">已积累</p>
                <p className="mt-1 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                  {formatCurrency(data.goalSaved, cur)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/55 p-3">
                <p className="text-xs text-muted-foreground">目标总额</p>
                <p className="mt-1 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                  {formatCurrency(data.goalTarget, cur)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 财务健康与提醒作为一个整体，而非三张同质卡片 */}
      <section className="order-7 mt-4 hidden overflow-hidden rounded-2xl border border-border/70 bg-muted/25 lg:order-5 lg:block">
        <div className="grid lg:grid-cols-[0.8fr_1.1fr_1.1fr]">
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <ScoreRing score={data.health.score} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                财务健康
              </p>
            </div>
          </div>
          <div className="border-t border-border/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <SectionTitle title="预算提醒" />
            <ReminderList
              reminders={data.budgetReminders}
              emptyText="暂无预算预警"
              max={3}
            />
          </div>
          <div className="border-t border-border/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <SectionTitle title="还款提醒" />
            <ReminderList
              reminders={data.loanReminders}
              emptyText="暂无还款提醒"
              max={3}
            />
          </div>
        </div>
      </section>

      {/* 第四层：最近动态 */}
      <section data-dashboard-recent className="order-4 mt-5 lg:order-6 lg:mt-9">
        <DashboardSectionHeading
          title={isCurrentMonth ? '最近记录' : `${formatMonthLabel(month)}的记录`}
          action={
            <Button variant="ghost" size="sm" className="h-11 px-2" asChild>
              <Link to="/app/transactions">
                全部账单
                <IconChevronRight />
              </Link>
            </Button>
          }
        />

        <Card padding={false} className="overflow-hidden rounded-2xl border-border/70">
          {data.recent.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <IconReceipt className="h-6 w-6" weight="duotone" />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground">还没有收支记录</p>
              {isCurrentMonth && <Button className="mt-4 h-11 rounded-xl" onClick={() => setShowAdd(true)}><IconPlus />记第一笔</Button>}
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {data.recent.map((t, index) => {
                const isIncome = t.type === 'income';
                return (
                  <li
                    key={t.id}
                    data-transaction-date={t.date}
                    className={cn(
                      'group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45 sm:px-5',
                      index >= 4 && 'hidden lg:flex',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        isIncome
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground group-hover:bg-destructive/10 group-hover:text-destructive',
                      )}
                    >
                      <CategoryIcon category={t.category} type={t.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="max-w-full truncate text-sm font-medium text-foreground">
                          {t.category}
                          {t.note && <span className="text-muted-foreground"> · {t.note}</span>}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {t.date === todayStr() ? '今天' : t.date} · {t.paymentMethod}
                      </p>
                    </div>
                    <div className="w-[44%] min-w-0 max-w-[10rem] shrink-0 text-right [container-type:inline-size]">
                      <p
                        data-dashboard-money
                        title={`${isIncome ? '+' : t.type === 'transfer' ? '' : '-'}${formatCurrency(t.amount, cur)}`}
                        style={{ fontSize: `min(1rem, ${150 / (formatCurrency(t.amount, cur).length + 1)}cqw)` }}
                        className={cn(
                          'whitespace-nowrap text-sm font-semibold tabular-nums',
                          isIncome ? 'text-success' : 'text-foreground',
                        )}
                      >
                        {isIncome ? '+' : t.type === 'transfer' ? '' : '-'}
                        {formatCurrency(t.amount, cur)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      {isCurrentMonth && data.loanReminders.length > 0 && (
        <Link to="/app/loans" className="order-3 mt-3 flex min-w-0 items-center gap-3 rounded-2xl border border-warning/20 bg-warning/5 px-4 py-3 lg:hidden">
          <IconBank className="h-5 w-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">{data.loanReminders[0].title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{data.loanReminders[0].description}</p>
          </div>
          <IconChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <section data-dashboard-spending className="order-5 mt-5 lg:hidden">
        <DashboardSectionHeading
          title="支出分类"
          action={<Button variant="ghost" size="sm" className="h-11 px-2" asChild><Link to="/app/reports">查看报表<IconChevronRight /></Link></Button>}
        />
        <Card className="rounded-2xl p-4">
          {data.pieData.length ? (
            <div className="space-y-4">
              {data.pieData.slice(0, 3).map((item) => {
                const share = data.expense > 0 ? item.value / data.expense : 0;
                const amount = formatCurrency(item.value, cur);
                return (
                  <div key={item.name} className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"><CategoryIcon category={item.name} type="expense" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate">{item.name}</span>
                        <span className="shrink-0 text-muted-foreground">{formatPercent(share)}</span>
                      </div>
                      <ProgressBar value={share} className="mt-2 h-1" />
                    </div>
                    <div className="w-[38%] min-w-0 shrink-0 text-right [container-type:inline-size]">
                      <p data-dashboard-money title={amount} style={{ fontSize: `min(0.875rem, ${150 / amount.length}cqw)` }} className="whitespace-nowrap text-xs font-medium tabular-nums">{amount}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="py-4 text-center text-sm text-muted-foreground">本月暂无支出</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs">
            <span className="text-muted-foreground">储蓄率 · 目标 {settings.savingsRateTarget}%</span>
            <span className={data.income > 0 ? savingsOnTrack ? 'font-medium text-success' : 'font-medium text-warning' : 'text-muted-foreground'}>{data.income > 0 ? formatPercent(data.rate) : '暂无收入记录'}</span>
          </div>
        </Card>
      </section>

      <section className="order-6 mt-5 lg:hidden">
        <DashboardSectionHeading title="财务进度" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/app/loans', label: '贷款待还', value: formatCurrency(data.loanRemaining, cur), Icon: IconBank },
            { to: '/app/goals', label: '目标已积累', value: formatCurrency(data.goalSaved, cur), Icon: IconTarget },
          ].map(({ to, label, value, Icon }) => (
            <Link key={to} to={to} className="glass-card min-w-0 rounded-2xl p-3.5 [container-type:inline-size]">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}<IconChevronRight className="ml-auto h-3 w-3" /></div>
              <p data-dashboard-money title={value} style={{ fontSize: `min(1.125rem, ${150 / value.length}cqw)` }} className="mt-3 whitespace-nowrap text-sm font-semibold tabular-nums">{value}</p>
            </Link>
          ))}
        </div>
      </section>

      <QuickTransactionModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
