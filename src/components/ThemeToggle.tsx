/**
 * 主题切换控件。ThemeToggle：紧凑循环按钮（浅 → 深 → 系统）；
 * ThemeSegmented：设置页用的分段选择。
 */
import { Sun, Moon, Monitor } from '@/components/Icons';
import { useTheme, type Theme } from './theme-provider';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', Icon: Sun },
  { value: 'dark', label: '深色', Icon: Moon },
  { value: 'system', label: '跟随系统', Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const idx = OPTIONS.findIndex((o) => o.value === theme);
  const current = OPTIONS[idx === -1 ? 2 : idx];
  const next = () => setTheme(OPTIONS[(idx + 1) % OPTIONS.length].value);
  const { Icon, label } = current;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={next}
      className={className}
      title={`主题：${label}（点击切换）`}
      aria-label={`主题：${label}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  return (
    <div role="group" aria-label="外观主题" className="grid w-full grid-cols-3 gap-2">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={cn(
              'inline-flex min-w-0 flex-col items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-1.5 py-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'border-primary/70 bg-primary/15 text-accent-foreground'
                : 'border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40 hover:bg-accent/50 hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
