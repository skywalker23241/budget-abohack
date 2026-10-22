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
} from '@/lib/format';
import { TRANSACTION_TYPE_LABELS } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { MonthPicker } from '@/components/MonthPicker';
import { Card, SectionTitle, Badge, Button, ProgressBar } from '@/components/ui';
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
        <span className="text-3xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">满分 100</span>
      </div>
    </div>
  );
}

function daysRemainingInMonth(month: string): number {
  const [year, monthIndex] = month.split('-').map(Number);
  const today = new Date();
  const isCurrent =
    today.getFullYear() === year && today.getMonth() + 1 === monthIndex;
  const totalDays = new Date(year, monthIndex, 0).getDate();
  if (!isCurrent) return totalDays;
  return Math.max(1, totalDays - today.getDate() + 1);
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
}: {
  label: string;
  value: string;
  tone?: 'default' | 'income' | 'expense';
  icon: ReactNode;
}) {
  return (
    <div className="group min-w-0 rounded-xl border border-border/50 bg-card/45 p-3.5 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <p
        className={cn(
          'mt-2 break-words text-lg font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-xl',
          tone === 'income' && 'text-success',
          tone === 'expense' && 'text-destructive',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </p>
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
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
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
    const dailyAvailable =
      bSummary.total > 0 ? Math.max(0, bSummary.remaining) / daysRemainingInMonth(month) : 0;
    const loanRemaining = totalRemainingPrincipal(loans);
    const monthRepayment = transactionsInMonth(transactions, month)
      .filter((t) => t.type === 'loan_repayment')
      .reduce((s, t) => s + t.amount, 0);
    const loanRatio = loanToIncomeRatio(loans, income);
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
    const days = lastNDays(7);
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

    const recent = [...transactions]
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
      dailyAvailable,
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
    data.bSummary.total > 0 ? Math.max(0, data.bSummary.remaining) : data.balance;
  const budgetTone =
    data.bSummary.usageRate >= 1
      ? 'danger'
      : data.bSummary.usageRate >= warnRate
        ? 'warning'
        : 'success';
  const savingsOnTrack = data.rate >= settings.savingsRateTarget / 100;
  const statusSummary =
    data.bSummary.total <= 0
      ? '预算未设置'
      : data.bSummary.remaining < 0
        ? '本月预算已超支'
        : data.budgetWatch.length > 0
          ? data.budgetWatch[0].status === 'exceeded'
            ? `${data.budgetWatch[0].category} 已超支`
            : `${data.budgetWatch[0].category} 接近上限`
          : savingsOnTrack
            ? '储蓄目标达成'
            : '储蓄率未达目标';

  return (
    <>
      <PageHeader
        title="财务总览"
        actions={
          <>
            <MonthPicker month={month} onChange={setMonth} />
            <Button
              data-tour="quick-add"
              className="shadow-sm"
              onClick={() => setShowAdd(true)}
            >
              <IconPlus className="h-4 w-4" />
              记一笔
            </Button>
          </>
        }
      />

      {/* 第一层：核心财务结论 */}
      <section className="glass-card relative isolate overflow-hidden rounded-[1.5rem] p-5 text-foreground sm:p-7 lg:p-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 12% 0%, hsl(var(--primary) / .16), transparent 32%), radial-gradient(circle at 92% 100%, var(--ambient-blue), transparent 35%)',
          }}
        />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.12)]" />
            {formatMonthLabel(month)}
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
              data.bSummary.remaining < 0 || data.budgetWatch.some((item) => item.status === 'exceeded')
                ? 'border-rose-400/25 bg-rose-400/10 text-destructive'
                : savingsOnTrack
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-success'
                  : 'border-amber-400/25 bg-amber-400/10 text-warning',
            )}
          >
            {data.bSummary.remaining < 0 || data.budgetWatch.some((item) => item.status === 'exceeded')
              ? '需要关注'
              : savingsOnTrack
                ? '财务状态良好'
                : '保持节奏'}
          </span>
        </div>

        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)] xl:items-end">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {data.bSummary.total > 0 ? '本月还可支配' : '本月结余'}
            </p>
            <p className="mt-2 break-words text-[2.65rem] font-semibold leading-none tracking-[-0.045em] text-foreground [overflow-wrap:anywhere] sm:text-6xl">
              {formatCurrency(primaryAmount, cur)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm text-muted-foreground">{statusSummary}</span>
              {data.bSummary.total > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-muted-foreground">
                  日均可花 {formatCurrency(data.dailyAvailable, cur)}
                </span>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
              <OverviewMetric
                label="本月收入"
                value={formatCurrency(data.income, cur)}
                tone="income"
                icon={<IconArrowUp className="h-3.5 w-3.5" />}
              />
              <OverviewMetric
                label="本月支出"
                value={formatCurrency(data.expense, cur)}
                tone="expense"
                icon={<IconArrowDown className="h-3.5 w-3.5" />}
              />
              <OverviewMetric
                label="本月结余"
                value={formatCurrency(data.balance, cur)}
                tone={data.balance < 0 ? 'expense' : 'default'}
                icon={<IconWallet className="h-3.5 w-3.5" />}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-5">
              <MetricRing
                value={data.bSummary.usageRate}
                label="预算使用"
                tone={budgetTone}
              />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground">
                  {data.bSummary.usageRate >= 1
                    ? '预算已经超额'
                    : data.bSummary.usageRate >= warnRate
                      ? '接近预算上限'
                      : '消费节奏健康'}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  已使用 {formatCurrency(data.bSummary.used, cur)}
                  <br />
                  总预算 {formatCurrency(data.bSummary.total, cur)}
                </p>
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
      <section className="mt-9">
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
              title="最近 7 天收支趋势"
            />
            <IncomeExpenseTrend data={data.trend} currency={cur} height={286} />
          </Card>

          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-4">
            <SectionTitle
              title="支出结构"
              subtitle={data.expense > 0 ? `本月支出 ${formatCurrency(data.expense, cur)}` : undefined}
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
      <section className="mt-9">
        <DashboardSectionHeading
          title="预算、贷款与目标"
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-12">
          <Card className="rounded-2xl border-border/70 p-5 sm:p-6 lg:col-span-5">
            <SectionTitle
              title="预算概览"
              subtitle={`${formatPercent(data.bSummary.usageRate)} 已使用`}
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
                <Badge tone={budgetTone === 'danger' ? 'rose' : budgetTone === 'warning' ? 'amber' : 'emerald'}>
                  {budgetTone === 'danger' ? '已超支' : budgetTone === 'warning' ? '需留意' : '节奏良好'}
                </Badge>
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
              <span className="shrink-0 text-xs text-muted-foreground">{goals.length} 个目标</span>
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
      <section className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-muted/25">
        <div className="grid lg:grid-cols-[0.8fr_1.1fr_1.1fr]">
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <ScoreRing score={data.health.score} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                财务健康
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">{data.health.grade}</p>
            </div>
          </div>
          <div className="border-t border-border/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <SectionTitle title="预算提醒" />
            <ReminderList
              reminders={data.budgetReminders}
              emptyText="预算执行良好，暂无超支"
              max={3}
            />
          </div>
          <div className="border-t border-border/70 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <SectionTitle title="还款提醒" />
            <ReminderList
              reminders={data.loanReminders}
              emptyText="近期没有待还款提醒"
              max={3}
            />
          </div>
        </div>
      </section>

      {/* 第四层：最近动态 */}
      <section className="mt-9">
        <DashboardSectionHeading
          title={isCurrentMonth ? '最近动态' : '最近动态（全部月份）'}
          action={
            <Button variant="outline" size="sm" asChild>
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
              <p className="mt-1 text-sm text-muted-foreground">点击右上角「记一笔」开始记录</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {data.recent.map((t, index) => {
                const isIncome = t.type === 'income';
                return (
                  <li
                    key={t.id}
                    className={cn(
                      'group flex min-w-0 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/45 sm:px-5',
                      index >= 6 && 'hidden md:flex',
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
                        <Badge tone="slate">{TRANSACTION_TYPE_LABELS[t.type]}</Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {t.date} · {t.paymentMethod}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums sm:text-base',
                          isIncome ? 'text-success' : 'text-foreground',
                        )}
                      >
                        {isIncome ? '+' : '-'}
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

      <QuickTransactionModal open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
