import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronDown } from '@/components/Icons';
import { cn } from '@/lib/utils';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}

export function MobileCollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  alwaysOpen = false,
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();
  const inactive = !alwaysOpen && isMobile && !open;
  const inertProps = inactive ? ({ inert: '' } as { inert: string }) : {};

  return (
    <section className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'app-press flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left shadow-sm active:bg-accent md:hidden',
          alwaysOpen && 'hidden',
        )}
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold text-foreground">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        {...inertProps}
        aria-hidden={inactive}
        className={cn(
          'grid transition-[grid-template-rows,opacity] [transition-duration:350ms] ease-out md:grid-rows-[1fr] md:opacity-100',
          inactive && 'pointer-events-none md:pointer-events-auto',
          alwaysOpen
            ? 'grid-rows-[1fr] opacity-100'
            : open
              ? 'mt-3 grid-rows-[1fr] opacity-100 md:mt-0'
              : 'grid-rows-[0fr] opacity-0 md:mt-0',
        )}
      >
        <div
          className={cn(
            'min-h-0 overflow-hidden md:overflow-visible',
            (open || alwaysOpen) && 'app-enter',
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export function InlineDisclosure({
  title,
  subtitle,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const contentId = useId();
  const inertProps = !open ? ({ inert: '' } as { inert: string }) : {};

  return (
    <div className="border-t border-border/60 pt-2">
      <button
        type="button"
        onClick={() => { setInternalOpen(!open); onOpenChange?.(!open); }}
        className="group flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium text-muted-foreground group-hover:text-foreground">{title}</span>
          {subtitle && (
            <span className="mt-1 block break-words text-xs text-muted-foreground/80">
              {subtitle}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        id={contentId}
        {...inertProps}
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
          !open && 'pointer-events-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-1 pb-2 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
