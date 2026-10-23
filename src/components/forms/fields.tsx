/**
 * 表单字段辅助组件：统一的标签、必填标记、错误提示样式。
 */
import { useId, type ReactNode } from 'react';
import {
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

export function Field({
  label,
  required,
  error,
  children,
  id,
  className = '',
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <Label htmlFor={id} className="mb-1.5 flex break-words">
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p id={id ? `${id}-error` : undefined} className="mt-1 break-words text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** 一组按钮式的单选（用于交易类型等） */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className="app-segment app-choice min-h-11 rounded-xl px-3 py-1.5 text-sm font-medium"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 复选开关 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <Label htmlFor={id} className="min-w-0 cursor-pointer break-words text-sm font-normal text-foreground">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** 下拉选择（shadcn Select 封装）。options 支持字符串或 {value,label}。 */
type OptionLike = string | { value: string; label: string };

export function SelectField({
  value,
  onChange,
  options,
  disabled,
  placeholder,
  id,
  className,
  categoryIcons = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly OptionLike[];
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  categoryIcons?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <SelectItem key={opt.value} value={opt.value}>
              {categoryIcons && opt.value !== 'all' ? (
                <span className="inline-flex items-center gap-2"><CategoryIcon category={opt.label} className="h-4 w-4" />{opt.label}</span>
              ) : opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
