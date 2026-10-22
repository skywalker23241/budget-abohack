/**
 * 基于 Recharts 的可复用图表组件。
 * 统一处理空数据、配色、金额格式化的 tooltip。配色随浅/深色主题切换。
 */
import type { CSSProperties } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import { colorForCategory, CHART_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { useTheme } from './theme-provider';

export interface ChartTheme {
  income: string;
  expense: string;
  balance: string;
  grid: string;
  axis: string;
  axisStrong: string;
  cursor: string;
  tooltip: CSSProperties;
}

/** 图表配色，随当前主题（浅/深）返回合适的网格、坐标、tooltip 与序列色。 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return {
    income: dark ? '#5dd1a0' : '#318c68',
    expense: dark ? '#f07b82' : '#d75d66',
    balance: dark ? '#d2be98' : '#568c70',
    grid: dark ? '#343a37' : '#e5e5e0',
    axis: dark ? '#a0a0a0' : '#666666',
    axisStrong: dark ? '#e8e8e8' : '#444444',
    cursor: dark ? 'rgba(210,190,152,0.06)' : 'rgba(143,207,176,0.08)',
    tooltip: {
      borderRadius: 16,
      border: '1px solid var(--glass-border)',
      backgroundColor: 'var(--glass-popover)',
      backdropFilter: 'blur(18px)',
      color: 'hsl(var(--foreground))',
      fontSize: 12,
      boxShadow: 'inset 0 1px 0 var(--glass-highlight), var(--glass-shadow)',
    },
  };
}

function EmptyChart({ text = '暂无数据' }: { text?: string }) {
  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

// ---------------- 分类饼图（环形） ----------------
export function CategoryDonut({
  data,
  currency,
  height = 260,
}: {
  data: { name: string; value: number }[];
  currency: string;
  height?: number;
}) {
  const chart = useChartTheme();
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <EmptyChart text="本月暂无支出" />;
  const total = filtered.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={3}
            cornerRadius={5}
          >
            {filtered.map((d) => (
              <Cell key={d.name} fill={colorForCategory(d.name)} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={chart.tooltip}
            formatter={(v: number) => formatCurrency(v, currency)}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute left-1/2 top-[45%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <span className="text-[10px] text-muted-foreground">总支出</span>
        <span className="mt-0.5 max-w-[5.5rem] truncate text-xs font-semibold text-foreground">
          {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}

// ---------------- 收支趋势（面积图） ----------------
export function IncomeExpenseTrend({
  data,
  currency,
  height = 260,
}: {
  data: { label: string; income: number; expense: number }[];
  currency: string;
  height?: number;
}) {
  const chart = useChartTheme();
  const hasData = data.some((d) => d.income > 0 || d.expense > 0);
  if (!hasData) return <EmptyChart text="暂无收支记录" />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chart.income} stopOpacity={0.22} />
            <stop offset="95%" stopColor={chart.income} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chart.expense} stopOpacity={0.18} />
            <stop offset="95%" stopColor={chart.expense} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: chart.axis }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: chart.axis }} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={chart.tooltip}
          formatter={(v: number, name) => [formatCurrency(v, currency), name === 'income' ? '收入' : '支出']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => (v === 'income' ? '收入' : '支出')}
        />
        <Area type="monotone" dataKey="income" stroke={chart.income} strokeWidth={2.25} fill="url(#gIncome)" />
        <Area type="monotone" dataKey="expense" stroke={chart.expense} strokeWidth={2.25} fill="url(#gExpense)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------- 分类柱状图 ----------------
export function CategoryBars({
  data,
  currency,
  height = 280,
}: {
  data: { name: string; value: number }[];
  currency: string;
  height?: number;
}) {
  const chart = useChartTheme();
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={filtered}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: chart.axis }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: chart.axisStrong }}
          tickLine={false}
          axisLine={false}
          width={72}
        />
        <Tooltip
          contentStyle={chart.tooltip}
          cursor={{ fill: chart.cursor }}
          formatter={(v: number) => formatCurrency(v, currency)}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {filtered.map((d, i) => (
            <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------- 月度趋势折线 ----------------
export function MonthlyTrendLine({
  data,
  currency,
  height = 280,
}: {
  data: { label: string; income: number; expense: number; balance: number }[];
  currency: string;
  height?: number;
}) {
  const chart = useChartTheme();
  const hasData = data.some((d) => d.income || d.expense);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: chart.axis }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: chart.axis }} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={chart.tooltip}
          formatter={(v: number, name) => [
            formatCurrency(v, currency),
            name === 'income' ? '收入' : name === 'expense' ? '支出' : '结余',
          ]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => (v === 'income' ? '收入' : v === 'expense' ? '支出' : '结余')}
        />
        <Line type="monotone" dataKey="income" stroke={chart.income} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="expense" stroke={chart.expense} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="balance" stroke={chart.balance} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
