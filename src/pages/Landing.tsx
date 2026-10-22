import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NumberFlow from '@number-flow/react';
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp';
import { Command } from 'cmdk';
import { Virtuoso } from 'react-virtuoso';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/components/Toast';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  ArrowRight,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDollarSign,
  Command as CommandIcon,
  GripVertical,
  LockKeyhole,
  ReceiptText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  GithubLogo,
  TelegramLogo,
  IconMenu,
  X,
} from '@/components/Icons';
import { Button, Switch } from '@/components/ui';
import { IncomeExpenseTrend } from '@/components/charts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

type BudgetCard = {
  id: string;
  label: string;
  amount: number;
  spent: number;
  tone: string;
};

type LedgerItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  method: string;
  time: string;
  type: 'income' | 'expense';
};

const cnyFormat = {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
} satisfies Intl.NumberFormatOptions;

const commandItems = [
  { label: '记录日常收支', detail: '打开账本，记下新的一笔', to: '/app/transactions', icon: ReceiptText },
  { label: '查看本月预算', detail: '看看各分类还剩多少额度', to: '/app/budget', icon: WalletCards },
  { label: '管理备份与同步', detail: '在设置中连接自己的 WebDAV 服务', to: '/app/settings', icon: ShieldCheck },
  { label: '查看收支报表', detail: '回顾趋势，了解钱花在了哪里', to: '/app/reports', icon: ChartNoAxesCombined },
  { label: '检查贷款计划', detail: '查看待还金额和还款记录', to: '/app/loans', icon: CircleDollarSign },
];

const initialBudgets: BudgetCard[] = [
  { id: 'food', label: '餐饮', amount: 2200, spent: 1460, tone: 'bg-emerald-500' },
  { id: 'rent', label: '房租/房贷', amount: 4500, spent: 4500, tone: 'bg-blue-500' },
  { id: 'traffic', label: '交通', amount: 700, spent: 320, tone: 'bg-amber-500' },
  { id: 'fun', label: '娱乐', amount: 500, spent: 380, tone: 'bg-rose-500' },
];

function AnimatedCurrency({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <NumberFlow
      className={className}
      value={value}
      locales="zh-CN"
      format={cnyFormat}
      willChange
    />
  );
}

function AnimatedPercent({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <NumberFlow
      className={className}
      value={value}
      locales="zh-CN"
      suffix="%"
      format={{ maximumFractionDigits: 0 }}
      willChange
    />
  );
}

const landingLinks = [
  { href: '#overview', label: '收支总览' },
  { href: '#workflow', label: '预算管理' },
  { href: '#performance', label: '更多功能' },
  { href: '#privacy', label: '隐私说明' },
];

const repositoryUrl = 'https://github.com/skywalker23241/pennypeek-abohack';
const telegramGroupUrl = 'https://t.me/+nsrOxDXQMeNkODBh';

function TelegramGroupLink({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const label = telegramGroupUrl ? '加入 Telegram 群组' : 'Telegram 群组 · 即将开放';
  const content = <><TelegramLogo className="h-4 w-4 shrink-0" /><span className={iconOnly ? 'sr-only' : undefined}>{label}</span></>;

  return telegramGroupUrl ? (
    <a href={telegramGroupUrl} target="_blank" rel="noreferrer" className={className} title={label}>{content}</a>
  ) : (
    <span aria-disabled="true" className={cn('cursor-default', className)} title={label}>{content}</span>
  );
}

function LandingHeader({ onCommandOpen }: { onCommandOpen: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="landing-header sticky top-0 z-40"
      data-scrolled={scrolled || menuOpen}
      onKeyDown={(event) => { if (event.key === 'Escape') setMenuOpen(false); }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="PennyPeek 首页">
          <img src="/logo.svg" alt="" className="h-9 w-9 shadow-sm sm:h-10 sm:w-10" />
          <span className="text-sm font-semibold tracking-tight min-[380px]:text-base sm:text-lg">PennyPeek</span>
        </Link>

        <nav aria-label="首页导航" className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
          {landingLinks.map(({ href, label }) => (
            <a key={href} className="rounded-lg px-3 py-2 transition-colors hover:bg-primary/10 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={onCommandOpen} aria-label="打开命令中心" className="hidden sm:inline-flex">
            <Search className="h-4 w-4" />
          </Button>
          <ThemeToggle className="hidden min-[380px]:inline-flex" />
          <TelegramGroupLink iconOnly className="hidden h-10 w-10 items-center justify-center rounded-lg text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex" />
          <Button variant="ghost" size="icon" asChild className="hidden xl:inline-flex">
            <a href={repositoryUrl} target="_blank" rel="noreferrer" aria-label="在 GitHub 查看源码">
              <GithubLogo />
            </a>
          </Button>
          <Button asChild className="px-3 sm:px-4">
            <Link to="/app">开始记账<ArrowRight className="hidden sm:block" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? '收起导航' : '展开导航'} aria-expanded={menuOpen} aria-controls="landing-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <IconMenu />}
          </Button>
        </div>
      </div>
      {menuOpen && (
        <nav id="landing-mobile-nav" aria-label="移动端首页导航" className="grid gap-1 px-4 pb-4 lg:hidden">
          {landingLinks.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {label}
            </a>
          ))}
          <TelegramGroupLink className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <button type="button" onClick={() => { setMenuOpen(false); onCommandOpen(); }} className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Search className="h-4 w-4" />搜索记账操作
          </button>
        </nav>
      )}
    </header>
  );
}

function LandingFooter() {
  const linkClass = 'w-fit rounded-sm text-sm text-[#f5eddf]/80 transition-colors hover:text-[#b8ddc8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ddc8]';
  return (
    <footer className="overflow-hidden bg-[#221e1a] text-[#f5eddf]">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 pb-14 sm:grid-cols-3 lg:grid-cols-[1.7fr_repeat(3,minmax(0,0.65fr))] lg:gap-12 lg:pb-20">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ddc8]">
              <img src="/logo.svg" alt="" className="h-10 w-10" />
              <div>
                <p className="font-[Georgia,serif] text-xl font-semibold tracking-tight">PennyPeek</p>
                <p className="mt-1 text-xs text-white/50">把每一笔，安排明白。</p>
              </div>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/65">记录日常收支，安排月度预算，照顾好眼前的生活，也慢慢靠近想要的未来。</p>
            <a href={repositoryUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ddc8]">
              <GithubLogo className="h-4 w-4" />在 GitHub 查看
            </a>
          </div>
          <nav aria-label="页脚产品介绍" className="flex flex-col gap-3">
            <h2 className="mb-2 text-xs font-medium text-white/60">了解产品</h2>
            {landingLinks.map(({ href, label }) => <a key={href} href={href} className={linkClass}>{label}</a>)}
          </nav>
          <nav aria-label="页脚应用入口" className="flex flex-col gap-3">
            <h2 className="mb-2 text-xs font-medium text-white/60">开始使用</h2>
            <Link to="/app" className={linkClass}>打开账本</Link>
            <Link to="/app/budget" className={linkClass}>设置预算</Link>
            <Link to="/app/goals" className={linkClass}>储蓄目标</Link>
            <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer" className={linkClass}>反馈问题 ↗</a>
          </nav>
          <nav aria-label="Abo 的其他站点" className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <h2 className="mb-2 text-xs font-medium text-white/60">关于</h2>
            <TelegramGroupLink className={cn(linkClass, 'inline-flex items-center gap-2 leading-6')} />
            <a href="https://restcal.abohack.com/" target="_blank" rel="noreferrer" className={linkClass}>休历 · 安排休息 ↗</a>
            <a href="https://blog.abohack.com/blog/" target="_blank" rel="noreferrer" className={linkClass}>博客 · 记录生活 ↗</a>
            <a href="https://abohack.com/" target="_blank" rel="noreferrer" className={linkClass}>Abo 的主页 ↗</a>
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs leading-6 text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>PennyPeek © {new Date().getFullYear()} Abo Le</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0" />本地存储 · 自选 WebDAV</span><a href="#privacy" className="rounded-sm text-white/70 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8ddc8]">隐私与 Cookie 说明</a></p>
        </div>
        <div aria-hidden="true" className="select-none pt-5 font-[Georgia,serif] text-[clamp(3.3rem,12.5vw,10rem)] font-semibold leading-[0.85] tracking-[-0.055em] text-[#f5eddf]/[0.09] sm:pt-8">PennyPeek</div>
      </div>
    </footer>
  );
}

function DashboardPreview() {
  return (
    <div className="glass-card overflow-hidden p-5 shadow-[0_24px_80px_-32px_hsl(var(--primary)/0.3)] sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2"><img src="/logo.svg" alt="" className="h-7 w-7" /><span className="text-sm font-semibold">财务总览</span></div>
        <span className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">示例账本</span>
      </div>
      <div className="py-6">
        <p className="text-sm text-muted-foreground">本月还可支配</p>
        <AnimatedCurrency value={2320} className="mt-2 block text-4xl font-semibold tracking-tight" />
        <p className="mt-2 text-xs leading-6 text-muted-foreground">总预算 ¥16,000，已经使用 ¥13,680</p>
      </div>
      <div className="grid grid-cols-3 gap-2 border-y border-border/40 py-4">
        {[
          { label: '本月收入', value: 20500, tone: 'text-success' },
          { label: '本月支出', value: 13680, tone: 'text-destructive' },
          { label: '本月结余', value: 6820, tone: 'text-foreground' },
        ].map(({ label, value, tone }) => (
          <div key={label} className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <AnimatedCurrency value={value} className={cn('mt-2 block text-base font-semibold sm:text-lg', tone)} />
          </div>
        ))}
      </div>
      <div className="pt-5">
        <div className="mb-3 flex items-center justify-between text-xs"><span className="font-medium">分类预算</span><span className="text-muted-foreground">已用 / 预算</span></div>
        <div className="space-y-4">
          {initialBudgets.slice(0, 3).map((item) => (
            <div key={item.id}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span>{item.label}</span><span className="text-muted-foreground">¥{item.spent.toLocaleString('zh-CN')} / ¥{item.amount.toLocaleString('zh-CN')}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', item.tone)} style={{ width: item.spent / item.amount * 100 + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 border-t border-border/40 pt-3 text-[11px] leading-5 text-muted-foreground">预算、收支、分类进度，打开应用就能查看。</p>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-20 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <p className="mb-5 text-sm font-medium text-accent-foreground">PennyPeek · 你的日常预算账本</p>
          <h1 className="text-[2.5rem] font-semibold leading-[1.2] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
            把钱花明白，<br />才能存住钱。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            不止记账，更是算好每一笔，每一个Penny都值得Peek！
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/app">
              打开我的账本
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <a href="#overview">先看看怎么用<ChevronRight className="h-4 w-4" /></a>
            </Button>
          </div>

          <a href="#privacy" className="mt-5 inline-flex items-center gap-2 rounded-sm text-xs leading-6 text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ShieldCheck className="h-4 w-4 shrink-0" />账本保存在浏览器本地，备份由你掌管</a>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 sm:mt-12">
            <div>
              <p className="text-[11px] text-muted-foreground sm:text-xs">示例月结余</p>
              <AnimatedCurrency value={6820} className="mt-1 block text-xl font-semibold sm:text-2xl" />
            </div>
            <div className="border-l border-border/60 pl-4">
              <p className="text-[11px] text-muted-foreground sm:text-xs">示例储蓄率</p>
              <AnimatedPercent value={33} className="mt-1 block text-xl font-semibold sm:text-2xl" />
            </div>
            <div className="border-l border-border/60 pl-4">
              <p className="text-[11px] text-muted-foreground sm:text-xs">示例到期提醒</p>
              <NumberFlow value={3} className="mt-1 block text-xl font-semibold sm:text-2xl" willChange />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl lg:max-w-none">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function OverviewSection() {
  const monthlyData = [
    { label: '5月', income: 18000, expense: 12600 },
    { label: '6月', income: 19500, expense: 14200 },
    { label: '7月', income: 18000, expense: 11800 },
    { label: '8月', income: 21000, expense: 15300 },
    { label: '9月', income: 19000, expense: 12100 },
    { label: '10月', income: 20500, expense: 13680 },
  ];
  return (
    <section id="overview" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">收支的变化，一眼看清。</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">从每天的一笔记录，到每月的收支复盘。仪表盘和报表会帮你整理这些变化。</p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="glass-card min-w-0 p-5 sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div><h3 className="text-base font-semibold">近 6 个月收支趋势</h3><p className="mt-1 text-xs leading-6 text-muted-foreground">与应用报表相同的图表 · 示例数据</p></div>
              <span className="shrink-0 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">报表预览</span>
            </div>
            <IncomeExpenseTrend data={monthlyData} currency="CNY" height={280} />
          </div>
          <div className="grid gap-4">
            {[
              { label: '本月收入', value: 20500, copy: '工资、副业和其他收入，汇总在一起。', tone: 'text-success' },
              { label: '本月支出', value: 13680, copy: '按分类回看，了解钱花在了哪里。', tone: 'text-destructive' },
              { label: '本月结余', value: 6820, copy: '本月收入减去支出，看看留下了多少。', tone: 'text-foreground' },
            ].map(({ label, value, copy, tone }) => (
              <div key={label} className="glass-card p-5">
                <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{label}</p><AnimatedCurrency value={value} className={cn('text-2xl font-semibold', tone)} /></div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OtpSlot(props: SlotProps) {
  return (
    <div
      className={cn(
        'relative flex h-11 w-8 items-center justify-center border-y border-r text-lg font-semibold transition-colors first:rounded-l-md first:border-l last:rounded-r-md sm:h-12 sm:w-10 sm:text-xl',
        props.isActive
          ? 'border-foreground bg-background shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]'
          : 'border-border bg-muted/40',
      )}
    >
      <span className="text-foreground">{props.char ?? props.placeholderChar}</span>
      {props.hasFakeCaret && (
        <span className="otp-caret absolute h-6 w-px rounded-full bg-foreground" />
      )}
    </div>
  );
}

function SecurityPanel() {
  const toast = useToast();
  const [otp, setOtp] = useState('48');
  return (
    <div className="glass-card grid items-center gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:gap-12">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-accent-foreground"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">自己的账本，自己保管</h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">数据默认留在浏览器。需要多设备备份时，可以连接自己的 WebDAV；覆盖数据前再确认一次。</p>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />这里是确认码交互演示，不会连接云端。</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="mb-3 text-xs text-muted-foreground">试着输入六位数字</p>
        <OTPInput maxLength={6} value={otp} onChange={setOtp} pattern={REGEXP_ONLY_DIGITS} containerClassName="group flex items-center" aria-label="备份确认码演示"
          onComplete={() => toast.success('确认码已输入完整。这是演示，你的账本没有发生变化。')}
          render={({ slots }) => (
            <>
              <div className="flex">{slots.slice(0, 3).map((slot, index) => <OtpSlot key={index} {...slot} />)}</div>
              <span className="px-2 text-muted-foreground">—</span>
              <div className="flex">{slots.slice(3).map((slot, index) => <OtpSlot key={index} {...slot} />)}</div>
            </>
          )}
        />
      </div>
    </div>
  );
}

function BudgetStrategyPanel() {
  const [spendingCap, setSpendingCap] = useState(9800);
  const [savingsTarget, setSavingsTarget] = useState(26);
  const [alertLevel, setAlertLevel] = useState(82);
  const [lockFixedBills, setLockFixedBills] = useState(true);
  const daily = spendingCap / 30;
  const projectedSavings = 20500 - spendingCap;
  const savingsGoal = 20500 * savingsTarget / 100;
  const onTrack = projectedSavings >= savingsGoal;
  const sliders = [
    { id: 'spending-cap', label: '月支出上限', value: spendingCap, min: 6000, max: 16000, step: 100, update: setSpendingCap, display: new Intl.NumberFormat('zh-CN', cnyFormat).format(spendingCap), ends: ['¥6,000', '¥16,000'] },
    { id: 'savings-target', label: '储蓄目标', value: savingsTarget, min: 5, max: 50, step: 1, update: setSavingsTarget, display: savingsTarget + '%', ends: ['5%', '50%'] },
    { id: 'alert-level', label: '预算预警线', value: alertLevel, min: 50, max: 95, step: 1, update: setAlertLevel, display: alertLevel + '%', ends: ['50%', '95%'] },
  ];

  return (
    <div className="glass-card min-w-0 p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">找到舒服的预算节奏</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">以月收入 ¥20,500 为例，看看调整后的变化。</p>
        </div>
        <SlidersHorizontal className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
      <div className="space-y-5">
        {sliders.map((slider) => (
          <div key={slider.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor={slider.id} className="text-sm text-muted-foreground">{slider.label}</label>
              <output htmlFor={slider.id} className="text-sm font-semibold tabular-nums">{slider.display}</output>
            </div>
            <input id={slider.id} type="range" min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={(event) => slider.update(Number(event.target.value))} className="landing-slider" style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${(slider.value - slider.min) / (slider.max - slider.min) * 100}%, hsl(var(--muted)) 0%)` }} />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">{slider.ends.map((end) => <span key={end}>{end}</span>)}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
        <div>
          <label htmlFor="lock-fixed-bills" className="text-sm font-medium">预留固定支出</label>
          <p className="mt-1 text-xs text-muted-foreground">先留出房租和贷款，再看每日可花。</p>
        </div>
        <Switch id="lock-fixed-bills" checked={lockFixedBills} onCheckedChange={setLockFixedBills} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-primary/15 bg-primary/[0.07] p-4">
        <div>
          <p className="text-xs text-muted-foreground">{lockFixedBills ? '扣除固定支出后 / 日' : '每日支出额度'}</p>
          <AnimatedCurrency value={lockFixedBills ? Math.max(0, spendingCap - 4500) / 30 : daily} className="mt-2 block text-2xl font-semibold" />
        </div>
        <div className="border-l border-primary/15 pl-4">
          <p className="text-xs text-muted-foreground">预计月结余</p>
          <AnimatedCurrency value={projectedSavings} className="mt-2 block text-2xl font-semibold" />
        </div>
        <p className={cn('col-span-2 border-t border-primary/15 pt-3 text-xs leading-5', onTrack ? 'text-success' : 'text-warning')}>
          {onTrack ? '按这个计划，能够达到储蓄目标。' : '再调低一些支出，就更接近储蓄目标了。'}
          {lockFixedBills && ' 已预留 ¥4,500 固定支出。'}
        </p>
      </div>
    </div>
  );
}

function SortableBudgetCard({ item }: { item: BudgetCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const usage = Math.min(100, (item.spent / item.amount) * 100);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'rounded-2xl border border-border/50 bg-card/40 p-3.5',
        isDragging && 'relative z-10 shadow-lg ring-2 ring-ring',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`调整 ${item.label} 优先级`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-foreground">{item.label}</p>
            <span className="text-sm text-muted-foreground">
              {Math.round(usage)}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', item.tone)} style={{ width: `${usage}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span className="shrink-0">
              已用 <AnimatedCurrency value={item.spent} />
            </span>
            <span>
              预算 <AnimatedCurrency value={item.amount} />
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function BudgetPriorityList() {
  const toast = useToast();
  const [items, setItems] = useState(initialBudgets);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
    toast.info('预算优先级已更新');
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">预算优先级</p>
          <p className="mt-1 text-sm text-muted-foreground">
            拖动分类，试试自己习惯的排列。
          </p>
        </div>
        <WalletCards className="h-5 w-5 text-muted-foreground" />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {items.map((item) => (
              <SortableBudgetCard key={item.id} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
            给每一笔钱，留好位置。
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">安排分类预算，试试适合自己的消费节奏。下面的演示可以直接调整。</p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <BudgetPriorityList />
          <BudgetStrategyPanel />
        </div>
        <div className="mt-5"><SecurityPanel /></div>
      </div>
    </section>
  );
}

function createLedgerItems(): LedgerItem[] {
  const titles = ['午餐', '地铁充值', '主职工资', '超市采购', '视频会员', '房贷还款', '咖啡', '副业收入'];
  const categories = ['餐饮', '交通', '收入', '日用品', '订阅', '贷款', '餐饮', '收入'];
  const methods = ['微信', '支付宝', '银行卡', '信用卡'];

  return Array.from({ length: 860 }, (_, index) => {
    const template = index % titles.length;
    const isIncome = categories[template] === '收入';
    return {
      id: `ledger-${index}`,
      title: titles[template],
      category: categories[template],
      amount: isIncome ? 1200 + (index % 9) * 300 : 18 + (index % 17) * 24,
      method: methods[index % methods.length],
      time: `07-${String((index % 28) + 1).padStart(2, '0')} ${String(8 + (index % 12)).padStart(2, '0')}:30`,
      type: isIncome ? 'income' : 'expense',
    };
  });
}

function LedgerVirtualList() {
  const data = useMemo(() => createLedgerItems(), []);

  return (
    <div className="glass-card min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">每一笔，都有迹可循</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">860 条示例账单，向下滚动试试看。</p>
        </div>
        <ReceiptText className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="h-[20.625rem] overflow-hidden rounded-2xl border border-border/50 bg-card/35">
        <Virtuoso
          style={{ height: '100%' }}
          data={data}
          fixedItemHeight={66}
          itemContent={(_, item) => (
            <div className="flex h-[66px] items-center gap-3 border-b border-border/40 px-3 sm:px-4">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  item.type === 'income'
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive',
                )}
              >
                <CategoryIcon category={item.category} type={item.type} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.time} · {item.category} · {item.method}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-sm font-semibold',
                  item.type === 'income' ? 'text-success' : 'text-foreground',
                )}
              >
                {item.type === 'income' ? '+' : '-'}
                <AnimatedCurrency value={item.amount} />
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function PerformanceSection({ onCommandOpen }: { onCommandOpen: () => void }) {
  return (
    <section id="performance" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">日常记录，随手就好。</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">一笔午餐，一次发薪。让零散的收支，慢慢变成清楚的生活记录。</p>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="glass-card p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">想做什么，直接找到</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">从这里打开账本、预算或报表。</p>
              </div>
              <CommandIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
            <button type="button" onClick={onCommandOpen} className="glass-button flex w-full items-center gap-3 rounded-xl bg-card/40 px-4 py-3.5 text-left text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Search className="h-4 w-4 shrink-0" />搜索常用操作
              <kbd className="ml-auto hidden rounded-md border border-border/60 px-1.5 py-0.5 text-[11px] sm:inline">Ctrl K</kbd>
            </button>
            <div className="mt-4 divide-y divide-border/40">
              {commandItems.slice(0, 3).map(({ label, detail, to, icon: Icon }) => (
                <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl px-2 py-4 transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0"><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <p className="mt-3 border-t border-border/40 pt-4 text-xs leading-6 text-muted-foreground">用键盘也顺手：Ctrl / ⌘ K 唤起搜索，回车打开。</p>
          </div>
          <LedgerVirtualList />
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section id="privacy" aria-labelledby="privacy-heading" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <ShieldCheck className="mb-5 h-8 w-8 text-accent-foreground" />
            <h2 id="privacy-heading" className="text-3xl font-semibold leading-tight sm:text-4xl">你的账本，<br />由你自己保管。</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">收支、预算、贷款和储蓄目标默认保存在当前设备的浏览器中。你可以导出本地备份，也可以选择自己的 WebDAV 服务保存副本。</p>
            <Button asChild variant="ghost" className="mt-5 px-0 hover:bg-transparent">
              <Link to="/app/settings">管理数据与备份<ChevronRight /></Link>
            </Button>
          </div>
          <div className="divide-y divide-border/50">
            <div className="pb-5">
              <h3 className="text-sm font-semibold">浏览器存储与本地备份</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">账本、外观偏好和 WebDAV 配置保存在当前浏览器的本地存储（localStorage）中。导出的 JSON 备份保存到你选择的位置；更换浏览器、清除网站数据或结束无痕会话可能使本地记录丢失，请定期备份。</p>
            </div>
            <div className="py-5">
              <h3 className="text-sm font-semibold">WebDAV 由你选择</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">配置服务后，应用会在你测试连接或执行同步时连接指定的 WebDAV，例如坚果云、NAS 或 Nextcloud。备份文件存放在该服务中；连接时，账号、密码及同步传输的数据会经过本站代理转发，代理代码不持久保存这些内容。建议使用 HTTPS 和专用应用密码。</p>
            </div>
            <div className="py-5">
              <h3 className="text-sm font-semibold">Cookie 与访问统计</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">应用使用浏览器本地存储保存账本和偏好，不使用 Cookie 保存账本，也未集成广告 Cookie、行为追踪或第三方统计脚本。站点托管与安全服务可能使用必要的 Cookie 或保留访问日志，这与账本存储是不同的用途。</p>
            </div>
            <div className="pt-5">
              <h3 className="text-sm font-semibold">你可以管理与删除数据</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">在设置中可以导出备份、清空账本或清除 WebDAV 配置。清除浏览器数据不会删除已经导出的备份或 WebDAV 文件，这些副本需要你在对应位置自行管理。跳转到 GitHub、Telegram 等外部网站后，适用对方的隐私规则。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass-card border-primary/20 bg-primary/10 p-6 sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm text-muted-foreground">今天就把账本重新放回你手里</p>
              <h2 className="mt-2 text-3xl font-semibold">从一笔支出开始，建立可持续的预算节奏。</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                先用示例数据熟悉流程，再替换成自己的收入、预算和贷款计划。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild variant="secondary" size="lg">
                <Link to="/app">
                  打开应用
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/app/budget">先安排本月预算</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="命令中心" loop>
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <div><p className="text-base font-semibold">想从哪一笔开始？</p><p className="mt-1 text-xs text-muted-foreground">搜索并打开 PennyPeek 的常用功能</p></div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="关闭命令中心"><X /></Button>
      </div>
      <div className="mx-4 mt-2 flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Command.Input autoFocus placeholder="搜索账本、预算、报表…" />
      </div>
      <Command.List>
        <Command.Empty>没有匹配的动作</Command.Empty>
        <Command.Group heading="常用动作">
          {commandItems.map((item) => (
            <Command.Item
              key={item.label}
              value={`${item.label} ${item.detail}`}
              onSelect={() => {
                onOpenChange(false);
                navigate(item.to);
              }}
            >
              <div className="command-item-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
      <div className="flex items-center justify-between gap-3 border-t border-border/40 px-5 py-3 text-[11px] text-muted-foreground"><span>↑ ↓ 选择 · Enter 打开</span><span>Esc 关闭</span></div>
    </Command.Dialog>
  );
}

export function Landing() {
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="landing-page relative isolate min-h-dvh bg-background text-foreground">
      <LandingHeader onCommandOpen={() => setCommandOpen(true)} />
      <main>
        <HeroSection />
        <OverviewSection />
        <WorkflowSection />
        <PerformanceSection onCommandOpen={() => setCommandOpen(true)} />
        <PrivacySection />
        <ClosingCta />
      </main>
      <LandingFooter />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
