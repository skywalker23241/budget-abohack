/**
 * 页面标题栏：标题、副标题 + 右侧操作区（响应式）。
 */
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:mb-7 sm:items-end">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 break-words text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:[&>button]:h-11 max-sm:[&>button]:rounded-xl">{actions}</div>
      )}
    </div>
  );
}
