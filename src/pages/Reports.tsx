/**
 * 报表分析页面：月度收支汇总、分类分析、衣食住行、消费趋势、异常消费。
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useStore } from '@/store/useStore';
import {
  totalIncome,
  totalExpense,
  savingsRate,
  fixedVsVariable,
  expenseByCategory,
  categorySpikes,
  lifeGroupBreakdown,
  findLargeExpenses,
  transactionsInMonth,
} from '@/lib/calculations';
import { generateReminders } from '@/lib/reminders';
import {
  currentMonth,
  prevMonth,
  addMonths,
  formatCurrency,
  formatPercent,
  formatMonthLabel,
} from '@/lib/format';
import { CHART_COLORS } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { AppSummaryCard } from '@/components/AppSummaryCard';
import { MobileCollapsibleSection } from '@/components/MobileCollapsibleSection';
import { MonthPicker } from '@/components/MonthPicker';
import {
  Card,
  SectionTitle,
  ProgressBar,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { CategoryBars, MonthlyTrendLine, CategoryDonut, useChartTheme } from '@/components/charts';
import { ReminderList } from '@/components/ReminderList';
import { AmountText } from '@/components/AmountText';
import { CategoryIcon } from '@/components/CategoryIcon';
import { cn } from '@/lib/utils';
import { IconChart, IconTrendingUp } from '@/components/Icons';

type Granularity = 'day' | 'week' | 'month';

export function Reports() {
  const [month, setMonth] = useState(currentMonth());
  const [gran, setGran] = useState<Granularity>('day');
  const [mobileTab, setMobileTab] = useState<'category'|'trend'|'alerts'>('category');

  const transactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const loans = useStore((s) => s.loans);
  const goals = useStore((s) => s.goals);
  const settings = useStore((s) => s.settings);
  const cur = settings.currency;
  const chart = useChartTheme();

  const r = useMemo(() => {
    const income = totalIncome(transactions, month);
    const expense = totalExpense(transactions, month);
    const balance = income - expense;
    const rate = savingsRate(transactions, month);
    const { fixed, variable } = fixedVsVariable(transactions, month);
    const fvTotal = fixed + variable;

    const byCat = expenseByCategory(transactions, month);
    const catTotal = byCat.reduce((s, c) => s + c.amount, 0);
    const maxCat = byCat[0];
    const spikes = categorySpikes(transactions, month, prevMonth(month));
    const fastest = spikes[0];

    const life = lifeGroupBreakdown(transactions, month);
    const lifeTotal = life.reduce((s, g) => s + g.amount, 0);

    // 月度趋势（近 6 个月）
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const mm = addMonths(month, -i);
      const inc = totalIncome(transactions, mm);
      const exp = totalExpense(transactions, mm);
      monthly.push({
        label: formatMonthLabel(mm).replace(/^\d+年/, ''),
        income: inc,
        expense: exp,
        balance: inc - exp,
      });
    }

    // 异常消费
    const large = findLargeExpenses(transactions, month, settings.largeExpenseThreshold);
    const reminders = generateReminders({
      transactions,
      budgets,
      loans,
      goals,
      settings,
      month,
    }).filter((x) => x.category === 'spending' || x.category === 'budget');

    return {
      income,
      expense,
      balance,
      rate,
      fixed,
      variable,
      fixedRatio: fvTotal > 0 ? fixed / fvTotal : 0,
      variableRatio: fvTotal > 0 ? variable / fvTotal : 0,
      byCat,
      catTotal,
      maxCat,
      fastest,
      life,
      lifeTotal,
      monthly,
      large,
      reminders,
    };
  }, [transactions, budgets, loans, goals, settings, month]);

  // 趋势图数据：按日 / 周 / 月
  const trendData = useMemo(() => {
    if (gran === 'month') {
      return r.monthly.map((m) => ({ label: m.label, value: m.expense }));
    }
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthTxs = transactionsInMonth(transactions, month).filter(
      (t) => t.type === 'expense' || t.type === 'loan_repayment'
    );
    if (gran === 'day') {
      const arr = Array.from({ length: daysInMonth }, (_, i) => ({
        label: String(i + 1),
        value: 0,
      }));
      for (const t of monthTxs) {
        const d = Number(t.date.slice(8, 10));
        if (d >= 1 && d <= daysInMonth) arr[d - 1].value += t.amount;
      }
      return arr;
    }
    // 周
    const weeks = [
      { label: '第1周', value: 0 },
      { label: '第2周', value: 0 },
      { label: '第3周', value: 0 },
      { label: '第4周', value: 0 },
      { label: '第5周', value: 0 },
    ];
    for (const t of monthTxs) {
      const d = Number(t.date.slice(8, 10));
      const w = Math.min(4, Math.floor((d - 1) / 7));
      weeks[w].value += t.amount;
    }
    return weeks.filter((_, i) => i < Math.ceil(daysInMonth / 7));
  }, [gran, month, transactions, r.monthly]);

  return (
    <>
      <PageHeader
        title="报表分析"
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      <div data-tour="report-summary">
        <AppSummaryCard
          title={r.balance >= 0 ? '收支结余' : '收支缺口'}
          value={<span data-tour="report-balance" className="inline-block max-w-full whitespace-nowrap [font-size:min(2.25rem,7vw)]" style={{fontSize:`min(2.25rem, ${150/formatCurrency(Math.abs(r.balance),cur).length}cqw)`}}>{formatCurrency(Math.abs(r.balance), cur)}</span>}
          accent={
            r.balance < 0
              ? 'danger'
              : r.rate >= settings.savingsRateTarget / 100
                ? 'success'
                : 'warning'
          }
          meta={[
            { label: '收入', value: formatCurrency(r.income, cur) },
            { label: '支出', value: formatCurrency(r.expense, cur) },
            { label: '储蓄率', value: r.income > 0 ? formatPercent(r.rate) : '暂无收入' },
          ]}
        />
      </div>

      <div role="group" aria-label="报表视图" className="mt-4 flex gap-1 rounded-2xl bg-muted/60 p-1 md:hidden">
        {([['category','分类'],['trend','趋势'],['alerts','提醒']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={mobileTab===value} onClick={()=>setMobileTab(value)} className="app-segment min-h-11 flex-1 rounded-xl text-sm font-medium">{label}</button>)}
      </div>

      <MobileCollapsibleSection
        className="mt-4 hidden md:block"
        title="收支明细"
      >

        {/* 固定 vs 可变 进度 */}
        {r.fixed + r.variable > 0 && (
          <Card className="mt-4">
            <SectionTitle title="固定 / 可变支出结构" />
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>固定支出</span>
                  <span>
                    {formatCurrency(r.fixed, cur)}（{formatPercent(r.fixedRatio)}）
                  </span>
                </div>
                <ProgressBar value={r.fixedRatio} tone="brand" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>可变支出</span>
                  <span>
                    {formatCurrency(r.variable, cur)}（{formatPercent(r.variableRatio)}）
                  </span>
                </div>
                <ProgressBar value={r.variableRatio} tone="amber" />
              </div>
            </div>
          </Card>
        )}
      </MobileCollapsibleSection>

      {/* 2. 分类支出分析 */}
      <MobileCollapsibleSection
        className={cn('mt-4',mobileTab!=='category'&&'hidden md:block')}
        title="分类分析"
        alwaysOpen
      >
        <Card className="md:hidden">
          <SectionTitle title="支出分类" />
          {r.byCat.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">本月暂无支出</p>}
          <div className="space-y-4">{r.byCat.map(item=><div key={item.category} className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"><CategoryIcon category={item.category} type="expense"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.category}</p><p className="mt-1 text-xs text-muted-foreground">{formatPercent(r.catTotal>0?item.amount/r.catTotal:0)}</p></div><AmountText className="w-[44%] shrink-0 text-right" value={formatCurrency(item.amount,cur)} maxSize={16}/></div>)}</div>
          {r.catTotal>0 && <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-3 text-xs"><div className="min-w-0"><p className="mb-1 text-muted-foreground">固定支出 · {formatPercent(r.fixedRatio)}</p><AmountText value={formatCurrency(r.fixed,cur)} maxSize={16}/></div><div className="min-w-0"><p className="mb-1 text-muted-foreground">可变支出 · {formatPercent(r.variableRatio)}</p><AmountText value={formatCurrency(r.variable,cur)} maxSize={16}/></div></div>}
        </Card>
        <div className="hidden grid-cols-1 gap-4 md:grid lg:grid-cols-2">
          <Card>
            <SectionTitle title="分类支出排行" />
            <CategoryBars
              data={r.byCat.slice(0, 10).map((c) => ({ name: c.category, value: c.amount }))}
              currency={cur}
            />
          </Card>
          <Card>
            <SectionTitle title="分类支出占比" />
            <CategoryDonut
              data={r.byCat.map((c) => ({ name: c.category, value: c.amount }))}
              currency={cur}
            />
          </Card>
        </div>

        {/* 最大支出 / 增长最快 */}
        <div className="mt-4 hidden grid-cols-1 gap-4 md:grid md:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <IconChart className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">最大支出分类</p>
                {r.maxCat ? (
                  <p className="text-lg font-semibold text-foreground">
                    {r.maxCat.category}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {formatCurrency(r.maxCat.amount, cur)}（
                      {formatPercent(r.catTotal > 0 ? r.maxCat.amount / r.catTotal : 0)}）
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">本月暂无支出</p>
                )}
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <IconTrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">增长最快分类（环比上月）</p>
                {r.fastest ? (
                  <p className="text-lg font-semibold text-foreground">
                    {r.fastest.category}
                    <span className="ml-2 text-sm font-normal text-warning">
                      +{formatPercent(r.fastest.growth)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">无明显增长</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* 3. 衣食住行分析 */}
        <Card className="mt-4">
          <SectionTitle title="衣食住行分析" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {r.life.map((g) => (
              <div
                key={g.key}
                className="min-w-0 rounded-xl border p-3 text-center"
              >
                <div
                  className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: g.color }}
                >
                  {g.label}
                </div>
                <AmountText value={formatCurrency(g.amount,cur)} maxSize={18}/>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(r.lifeTotal > 0 ? g.amount / r.lifeTotal : 0)}
                </p>
                <div className="mt-2">
                  <ProgressBar
                    value={r.lifeTotal > 0 ? g.amount / r.lifeTotal : 0}
                    tone="slate"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </MobileCollapsibleSection>

      {/* 4. 消费趋势 */}
      <MobileCollapsibleSection
        className={cn('mt-4',mobileTab!=='trend'&&'hidden md:block')}
        title="消费趋势"
        alwaysOpen
      >
        <Card>
          <SectionTitle
            title="消费趋势"
            action={
              <Tabs value={gran} onValueChange={(v) => setGran(v as Granularity)}>
                <TabsList className="h-12">
                  <TabsTrigger className="h-11 px-3" value="day">日</TabsTrigger>
                  <TabsTrigger className="h-11 px-3" value="week">周</TabsTrigger>
                  <TabsTrigger className="h-11 px-3" value="month">月</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />
          {trendData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={chart.tooltip}
                  cursor={{ fill: chart.cursor }}
                  formatter={(v: number) => [formatCurrency(v, cur), '支出']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {trendData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              该时间范围暂无支出
            </div>
          )}
        </Card>

        {/* 月度收支趋势线 */}
        <Card className="mt-4">
          <SectionTitle title="月度收支趋势（近 6 个月）" />
          <MonthlyTrendLine data={r.monthly} currency={cur} />
        </Card>
      </MobileCollapsibleSection>

      {/* 5. 异常消费提醒 */}
      <MobileCollapsibleSection
        className={cn('mt-4',mobileTab!=='alerts'&&'hidden md:block')}
        title="异常消费提醒"
        alwaysOpen
        defaultOpen={r.large.length > 0 || r.reminders.length > 0}
      >
        <Card>
          <SectionTitle title="异常消费提醒" />
          <ReminderList
            reminders={r.reminders}
            emptyText="暂无异常消费"
          />
        </Card>
      </MobileCollapsibleSection>
    </>
  );
}
