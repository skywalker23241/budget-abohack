/**
 * 应用布局：桌面端固定侧边栏，移动端抽屉式导航。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  IconDashboard,
  IconReceipt,
  IconWallet,
  IconBank,
  IconCoins,
  IconChart,
  IconTarget,
  IconSettings,
  IconMenu,
  IconClose,
  IconHelp,
  IconPlus,
} from './Icons';
import { ThemeToggle } from './ThemeToggle';
import { QuickTransactionModal } from './QuickTransactionModal';
import { OnboardingGuide, openOnboardingGuide } from './OnboardingGuide';
import { SettingsDialog, openSettingsDialog } from './SettingsDialog';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { to: string; label: string; icon: (p: any) => ReactNode }[] = [
  { to: '/app', label: '仪表盘', icon: IconDashboard },
  { to: '/app/transactions', label: '记账', icon: IconReceipt },
  { to: '/app/budget', label: '预算', icon: IconWallet },
  { to: '/app/loans', label: '贷款', icon: IconBank },
  { to: '/app/income', label: '收入', icon: IconCoins },
  { to: '/app/reports', label: '报表', icon: IconChart },
  { to: '/app/goals', label: '目标', icon: IconTarget },
];

const MOBILE_NAV_ITEMS: { to: string; label: string; icon: (p: any) => ReactNode }[] = [
  { to: '/app', label: '首页', icon: IconDashboard },
  { to: '/app/transactions', label: '账单', icon: IconReceipt },
  { to: '/app/budget', label: '预算', icon: IconWallet },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        财务工作区
      </p>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          data-tour={to === '/app' ? 'nav-dashboard' : `nav-${to.split('/').pop()}`}
          end={to === '/app'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'app-press group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
              isActive
                ? 'glass-nav-active [&_svg]:scale-105'
                : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground',
            )
          }
        >
          <Icon className="h-[1.1rem] w-[1.1rem] transition-transform" />
          {label}
        </NavLink>
      ))}
      <button
        type="button"
        data-tour="settings-trigger"
        onClick={() => {
          onNavigate?.();
          openSettingsDialog();
        }}
        className="app-press mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground"
      >
        <IconSettings className="h-5 w-5" />
        设置
      </button>
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] shadow-sm">
        <img
          src="/logo.svg"
          alt=""
          className="h-full w-full"
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">PennyPeek</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">个人预算记账助手</p>
      </div>
    </div>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh min-w-0">
      {/* 桌面侧边栏 */}
      <aside className="glass-panel fixed bottom-5 left-5 top-5 z-30 hidden w-[13.75rem] flex-col rounded-3xl lg:flex">
        <Brand />
        <NavItems />
        <div className="mt-auto border-t border-border/70 px-3 py-3">
          <button
            type="button"
            onClick={openOnboardingGuide}
            className="app-press flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <IconHelp className="h-4 w-4" />
            使用向导
          </button>
          <div className="mt-1 flex items-center justify-between rounded-xl bg-muted/55 px-3 py-2">
            <span className="text-[10px] leading-4 text-muted-foreground">本地加密存储</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* 移动端顶栏 */}
      <header className="glass-panel sticky top-0 z-20 flex items-center justify-between px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/logo.svg"
            alt=""
            className="h-8 w-8 shrink-0 rounded-lg shadow-sm"
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold text-foreground">
            PennyPeek
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="app-press rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="打开菜单"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm app-enter"
            onClick={() => setMobileOpen(false)}
          />
          <div className="glass-popup app-scroll-region absolute inset-y-0 left-0 flex max-h-dvh w-64 flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)] shadow-xl app-enter">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="app-press mr-3 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="关闭菜单"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openOnboardingGuide();
              }}
              className="app-press mx-3 mt-3 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <IconHelp className="h-5 w-5" />
              使用向导
            </button>
          </div>
        </div>
      )}

      <nav className="glass-panel fixed inset-x-2 bottom-2 z-20 rounded-3xl px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {MOBILE_NAV_ITEMS.slice(0, 2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              className={({ isActive }) =>
                cn(
                  'app-press flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium',
                  isActive
                    ? 'text-foreground [&_svg]:-translate-y-0.5 [&_svg]:scale-110'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5 transition-transform duration-200" />
              <span>{label}</span>
            </NavLink>
          ))}

          <button
            type="button"
            data-tour="quick-add"
            onClick={() => setQuickOpen(true)}
            className="app-press -mt-6 flex flex-col items-center gap-1 text-[11px] font-medium text-foreground"
            aria-label="快速记账"
          >
            <span className="glass-button flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
              <IconPlus className="h-6 w-6" />
            </span>
            <span>记账</span>
          </button>

          {MOBILE_NAV_ITEMS.slice(2).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'app-press flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium',
                  isActive
                    ? 'text-foreground [&_svg]:-translate-y-0.5 [&_svg]:scale-110'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5 transition-transform duration-200" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            data-tour="settings-trigger"
            onClick={openSettingsDialog}
            className="app-press flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <IconSettings className="h-5 w-5" />
            <span>设置</span>
          </button>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60">
        <div
          key={location.pathname}
          className="app-page-enter mx-auto min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </div>
      </main>

      <QuickTransactionModal open={quickOpen} onClose={() => setQuickOpen(false)} />
      <SettingsDialog />
      <OnboardingGuide />
    </div>
  );
}
