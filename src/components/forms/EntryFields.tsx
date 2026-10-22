import { useId } from 'react';
import { Input } from '@/components/ui';
import { CategoryIcon } from '@/components/CategoryIcon';
import type { Icon } from '@/components/Icons';
import type { TransactionType } from '@/types';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Field } from './fields';

export function AmountField({ label, value, onChange, error, autoFocus = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const currency = useStore((state) => state.settings.currency);
  const symbol = new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency;
  return (
    <Field id={id} label={label} required error={error}>
      <div className={cn('flex items-center gap-3 rounded-2xl border bg-background/60 px-4 py-4 transition-colors focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15', error && 'border-destructive/60')}>
        <span className="shrink-0 text-xl font-medium text-muted-foreground" aria-hidden="true">{symbol}</span>
        <Input id={id} type="number" inputMode="decimal" min="0" step="0.01" autoFocus={autoFocus}
          value={value} onChange={(event) => onChange(event.target.value)} placeholder="0.00"
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
          className="h-12 min-w-0 rounded-none border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      </div>
    </Field>
  );
}

export function IconChoices<T extends string>({ label, value, options, onChange, type, disabled, className }: {
  label: string;
  value: T;
  options: readonly (T | { value: T; label: string; icon?: Icon })[];
  onChange: (value: T) => void;
  type?: TransactionType;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('grid grid-cols-3 gap-2', className)}>
      {options.map((item) => {
        const option = typeof item === 'string' ? { value: item, label: item } : item;
        const active = value === option.value;
        const ChoiceIcon = option.icon;
        return (
          <button key={option.value} type="button" aria-pressed={active} disabled={disabled} onClick={() => onChange(option.value)}
            className="app-segment app-choice flex min-h-20 min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-medium disabled:cursor-default">
            {ChoiceIcon ? <ChoiceIcon className="h-6 w-6" weight="duotone" aria-hidden="true" /> : <CategoryIcon category={option.label} type={type} className="h-6 w-6" />}
            <span className="max-w-full break-words">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
