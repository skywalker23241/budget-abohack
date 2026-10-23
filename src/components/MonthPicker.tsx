import { useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconCalendar } from './Icons';
import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatMonthLabel, currentMonth } from '@/lib/format';

export function MonthPicker({
  month,
  onChange,
  className,
}: {
  month: string;
  onChange: (month: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(month.slice(0, 4)));
  const selectedRef = useRef<HTMLButtonElement>(null);
  const current = currentMonth();
  const currentYear = Number(current.slice(0, 4));

  function chooseMonth(value: string) {
    if (value > current) return;
    onChange(value);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (value) setYear(Number(month.slice(0, 4)));
      setOpen(value);
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'glass-button h-11 w-11 shrink-0 rounded-2xl border-primary/40 bg-primary/25 text-accent-foreground shadow-[inset_0_1px_0_var(--glass-highlight),0_4px_12px_hsl(var(--primary)/0.18)] hover:border-primary/60 hover:bg-primary/30 hover:text-accent-foreground active:bg-primary/40 data-[state=open]:border-primary/60 data-[state=open]:bg-primary/40 [&_svg]:size-5',
            className,
          )}
          aria-label={`选择月份，当前为${formatMonthLabel(month)}`}
          title={formatMonthLabel(month)}
        >
          <IconCalendar weight="duotone" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-xs rounded-3xl border-primary/25 p-4 sm:p-5"
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          if (!selectedRef.current) return;
          event.preventDefault();
          selectedRef.current.focus();
        }}
      >
        <DialogTitle className="pr-6 text-base">选择月份</DialogTitle>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="上一年" disabled={year <= 1} onClick={() => setYear(year - 1)}>
            <IconChevronLeft />
          </Button>
          <span className="text-sm font-semibold tabular-nums" aria-live="polite">{year} 年</span>
          <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="下一年" disabled={year >= currentYear} onClick={() => setYear(year + 1)}>
            <IconChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={`${year} 年月份`}>
          {Array.from({ length: 12 }, (_, index) => {
            const value = `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`;
            const selected = value === month;
            return (
              <Button
                key={value}
                ref={selected ? selectedRef : undefined}
                variant={selected ? 'default' : 'ghost'}
                className={cn(
                  'h-11 rounded-xl px-2 disabled:border-transparent disabled:bg-transparent disabled:opacity-40',
                  selected && 'glass-button border-primary/50 bg-primary/40 text-accent-foreground shadow-[inset_0_1px_0_var(--glass-highlight),0_3px_10px_hsl(var(--primary)/0.15)] hover:bg-primary/50 active:bg-primary/60',
                )}
                aria-label={formatMonthLabel(value)}
                aria-pressed={selected}
                disabled={value > current}
                onClick={() => chooseMonth(value)}
              >
                {index + 1} 月
              </Button>
            );
          })}
        </div>
        <Button variant="outline" className="glass-button h-11 rounded-xl border-primary/25 bg-primary/10 text-accent-foreground hover:bg-primary/20" onClick={() => chooseMonth(current)}>本月</Button>
      </DialogContent>
    </Dialog>
  );
}
