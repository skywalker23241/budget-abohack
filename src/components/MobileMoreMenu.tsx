import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NavLink, useLocation } from 'react-router-dom';
import {
  IconBank,
  IconChart,
  IconClose,
  IconCoins,
  IconDashboard,
  IconTarget,
} from '@/components/Icons';
import { cn } from '@/lib/utils';

const MORE_ITEMS = [
  { to: '/app/loans', label: '贷款', description: '月供与还款进度', icon: IconBank },
  { to: '/app/income', label: '收入', description: '收入来源与到账', icon: IconCoins },
  { to: '/app/reports', label: '报表', description: '收支与消费趋势', icon: IconChart },
  { to: '/app/goals', label: '目标', description: '储蓄计划与进度', icon: IconTarget },
];

export function MobileMoreMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const active = MORE_ITEMS.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`));

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    const closeForGuide = () => setOpen(false);
    desktop.addEventListener('change', closeOnDesktop);
    window.addEventListener('budget-app:onboarding:open', closeForGuide);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('budget-app:onboarding:open', closeForGuide);
    };
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          data-tour="more-trigger"
          data-active={active}
          aria-label="更多功能"
          className={cn(
            'app-press flex min-h-11 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium',
            active || open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <IconDashboard className={cn('h-5 w-5 transition-transform duration-200', (active || open) && '-translate-y-0.5 scale-110')} weight={active || open ? 'fill' : 'regular'} />
          <span>更多</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:fade-out-0 motion-safe:duration-200" />
        <Dialog.Content
          className="glass-popup app-scroll-region fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-y-auto rounded-t-[2rem] border border-b-0 p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-2xl focus:outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:slide-out-to-bottom motion-safe:duration-200"
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="py-1">
              <Dialog.Title className="text-lg font-semibold tracking-tight">更多功能</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">规划收支，慢慢实现你的目标</Dialog.Description>
            </div>
            <Dialog.Close className="app-press -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="关闭更多功能">
              <IconClose className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <nav aria-label="更多财务功能" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2">
            {MORE_ITEMS.map(({ to, label, description, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'app-press min-w-0 rounded-2xl border p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'border-primary/35 bg-primary/10' : 'border-border/60 bg-card/50 hover:bg-accent',
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-accent-foreground"><Icon className="h-5 w-5" weight="duotone" /></span>
                <span className="mt-3 block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{description}</span>
              </NavLink>
            ))}
          </nav>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
