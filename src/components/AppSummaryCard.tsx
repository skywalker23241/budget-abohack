import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AmountText } from './AmountText';

type SummaryMeta = {
  label: string;
  value: ReactNode;
};

type AccentTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const accentTone: Record<AccentTone, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
};

export function AppSummaryCard({
  title,
  value,
  meta = [],
  accent = 'default',
  action,
  className,
  children,
}: {
  title: string;
  value: ReactNode;
  meta?: SummaryMeta[];
  accent?: AccentTone;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'glass-card app-pop app-card-motion relative isolate overflow-hidden rounded-3xl p-4 text-foreground sm:p-6',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 5% 0%, hsl(var(--primary) / .12), transparent 30%), radial-gradient(circle at 100% 100%, var(--ambient-blue), transparent 34%)',
        }}
      />
      <div
        className={cn(
          'absolute left-6 top-0 h-1 w-16 rounded-b-full transition-[width,opacity] duration-300',
          accentTone[accent],
        )}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-2 min-w-0 text-3xl font-semibold tracking-[-0.035em] [container-type:inline-size] sm:text-4xl">
            {typeof value === 'string' ? <AmountText value={value} maxSize={36} /> : value}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {meta.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/40 sm:grid-cols-3">
          {meta.map((item, index) => (
            <div
              key={item.label}
              className={cn('min-w-0 bg-card/50 px-3 py-2.5', meta.length % 2 === 1 && index === meta.length - 1 && 'col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:block')}
            >
              <p className="truncate text-xs text-muted-foreground">{item.label}</p>
              <div className={cn('mt-1 min-w-0 text-sm font-semibold text-foreground', meta.length % 2 === 1 && index === meta.length - 1 && 'w-1/2 text-right sm:w-full sm:text-left')}>
                {typeof item.value === 'string' ? <AmountText value={item.value} maxSize={16} /> : item.value}
              </div>
            </div>
          ))}
        </div>
      )}
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
