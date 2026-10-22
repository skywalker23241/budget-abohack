import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/Icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function shiftMonth(date: Date, amount: number): Date {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const lastDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(date.getDate(), lastDay),
  );
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return Boolean(
    left &&
      right &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate(),
  );
}

function displayDate(value: string): string {
  const parsed = parseDate(value);
  if (!parsed) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(parsed);
}

function isDisabledDate(date: Date, minDate: Date | null, maxDate: Date | null): boolean {
  const value = dateValue(date);
  return Boolean(
    (minDate && value < dateValue(minDate)) ||
      (maxDate && value > dateValue(maxDate)),
  );
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  clearable = false,
  placeholder = '选择日期',
  id,
  className,
  'aria-invalid': ariaInvalid,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  'aria-invalid'?: boolean;
}) {
  const selectedDate = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const initialDate = selectedDate ?? minDate ?? today;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialDate));
  const [focusedDate, setFocusedDate] = useState(() => initialDate);

  useEffect(() => {
    if (!open) return;
    const next = selectedDate ?? minDate ?? today;
    setVisibleMonth(startOfMonth(next));
    setFocusedDate(next);
  }, [open, value]);

  const days = useMemo(() => {
    const mondayOffset = (visibleMonth.getDay() + 6) % 7;
    const firstVisibleDay = addDays(visibleMonth, -mondayOffset);
    return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDay, index));
  }, [visibleMonth]);

  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);
  const previousMonthLastDay = new Date(
    previousMonth.getFullYear(),
    previousMonth.getMonth() + 1,
    0,
  );
  const canGoPrevious = !minDate || dateValue(previousMonthLastDay) >= dateValue(minDate);
  const canGoNext = !maxDate || dateValue(nextMonth) <= dateValue(maxDate);
  const canSelectToday = !isDisabledDate(today, minDate, maxDate);

  function chooseDate(date: Date) {
    if (isDisabledDate(date, minDate, maxDate)) return;
    onChange(dateValue(date));
    setFocusedDate(date);
    setVisibleMonth(startOfMonth(date));
    setOpen(false);
  }

  function moveFocus(date: Date) {
    if (isDisabledDate(date, minDate, maxDate)) return;
    setFocusedDate(date);
    setVisibleMonth(startOfMonth(date));
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-calendar-date="${dateValue(date)}"]`)?.focus();
    });
  }

  function handleDayKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, date: Date) {
    let next: Date | null = null;
    if (event.key === 'ArrowLeft') next = addDays(date, -1);
    if (event.key === 'ArrowRight') next = addDays(date, 1);
    if (event.key === 'ArrowUp') next = addDays(date, -7);
    if (event.key === 'ArrowDown') next = addDays(date, 7);
    if (event.key === 'Home') next = addDays(date, -((date.getDay() + 6) % 7));
    if (event.key === 'End') next = addDays(date, 6 - ((date.getDay() + 6) % 7));
    if (event.key === 'PageUp') next = shiftMonth(date, -1);
    if (event.key === 'PageDown') next = shiftMonth(date, 1);
    if (!next) return;
    event.preventDefault();
    moveFocus(next);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            'app-press flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-input bg-card/60 px-3 text-left text-sm shadow-[0_1px_2px_rgba(15,23,42,.03)] transition-[border-color,box-shadow,background-color] hover:border-foreground/25 focus-visible:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60',
            ariaInvalid && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/20',
            className,
          )}
        >
          <span className={cn('min-w-0 truncate', value ? 'text-foreground' : 'text-muted-foreground')}>
            {value ? displayDate(value) : placeholder}
          </span>
          <IconCalendar className="h-4 w-4 shrink-0 text-muted-foreground" weight="duotone" />
        </button>
      </Popover.Trigger>

      <Popover.Portal
        container={triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? undefined}
      >
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          className="pointer-events-auto z-[70] w-[min(20rem,calc(100vw-1rem))] rounded-2xl border glass-popup p-3 text-popover-foreground outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between px-1 pb-3">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {visibleMonth.getFullYear()}年 {visibleMonth.getMonth() + 1}月
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">选择日期</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setVisibleMonth(previousMonth)}
                disabled={!canGoPrevious}
                aria-label="上个月"
              >
                <IconChevronLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setVisibleMonth(nextMonth)}
                disabled={!canGoNext}
                aria-label="下个月"
              >
                <IconChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-y border-border/60 py-2" aria-hidden="true">
            {WEEKDAYS.map((weekday, index) => (
              <span
                key={weekday}
                className={cn(
                  'text-center text-[11px] font-medium text-muted-foreground',
                  index >= 5 && 'text-muted-foreground/70',
                )}
              >
                {weekday}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5" role="grid" aria-label="日历">
            {days.map((date) => {
              const dateString = dateValue(date);
              const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const selected = sameDate(date, selectedDate);
              const isToday = sameDate(date, today);
              const dateDisabled = isDisabledDate(date, minDate, maxDate);
              const isFocused = sameDate(date, focusedDate);
              return (
                <button
                  key={dateString}
                  type="button"
                  role="gridcell"
                  data-calendar-date={dateString}
                  tabIndex={isFocused ? 0 : -1}
                  disabled={dateDisabled}
                  aria-label={new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  }).format(date)}
                  aria-selected={selected}
                  onClick={() => chooseDate(date)}
                  onFocus={() => setFocusedDate(date)}
                  onKeyDown={(event) => handleDayKeyDown(event, date)}
                  className={cn(
                    'app-press relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30',
                    outsideMonth ? 'text-muted-foreground/40' : 'text-foreground',
                    !dateDisabled && !selected && 'hover:bg-accent hover:text-accent-foreground',
                    selected && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
                    dateDisabled && 'cursor-not-allowed text-muted-foreground/25',
                  )}
                >
                  {date.getDate()}
                  {isToday && !selected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-success" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/60 px-1 pt-3">
            <div>
              {clearable && value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                >
                  清除
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSelectToday}
              onClick={() => chooseDate(today)}
            >
              回到今天
            </Button>
          </div>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
