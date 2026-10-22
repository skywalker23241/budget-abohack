import { cn } from '@/lib/utils';

/** Keep formatted amounts complete and on one line, even in narrow cards. */
export function AmountText({ value, maxSize = 20, className }: {
  value: string;
  maxSize?: number;
  className?: string;
}) {
  return (
    <span title={value} className={cn('block min-w-0 [container-type:inline-size]', className)}>
      <span data-amount className="block whitespace-nowrap font-semibold tabular-nums tracking-tight" style={{ fontSize: `min(${maxSize}px, ${150 / Math.max(1, value.length)}cqw)` }}>{value}</span>
    </span>
  );
}
