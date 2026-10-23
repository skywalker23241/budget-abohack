/**
 * 页面标题栏：标题与操作区（响应式）。
 */
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 max-sm:[&>button]:h-11 max-sm:[&>button]:rounded-xl">{actions}</div>
      )}
    </div>
  );
}
