import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Icon } from '@/components/Icons';
import {
  IconChart,
  IconCheckCircle,
  IconChevronRight,
  IconClose,
  IconReceipt,
  IconSettings,
  IconTarget,
  IconWallet,
  ShieldCheck,
} from '@/components/Icons';
import { Button } from '@/components/ui';

const ONBOARDING_STORAGE_KEY = 'budget-app:onboarding-version';
const ONBOARDING_VERSION = '3';
const ONBOARDING_OPEN_EVENT = 'budget-app:onboarding:open';
const SETTINGS_CLOSE_EVENT = 'budget-app:settings:close';
const QUICK_ENTRY_CLOSE_EVENT = 'budget-app:quick-entry:close';
const QUICK_ENTRY_CLOSED_EVENT = 'budget-app:quick-entry:closed';

type TargetRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  radius: number;
};

type GuideStep = {
  id: string;
  route?: string;
  target: string;
  label: string;
  title: string;
  description: string;
  hint: string;
  icon: Icon;
  action: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'quick-entry',
    route: '/app',
    target: '[data-tour="quick-add"]',
    label: '日常记账',
    title: '从生活里的每一笔开始',
    description:
      '点「记一笔」就能记录金额、分类和日期，收入与支出都在这里。',
    hint: '想试试？点击高亮按钮，关闭表单后继续导览。',
    icon: IconReceipt,
    action: '下一步',
  },
  {
    id: 'budget',
    route: '/app/budget',
    target: '[data-tour="budget-add"]',
    label: '分类预算',
    title: '给每一笔钱留好位置',
    description:
      '新增预算后，每笔计入预算的支出都会自动更新进度，接近上限或超支时会提醒你。',
    hint: '第一次建议先设置餐饮、交通和购物三个分类。',
    icon: IconWallet,
    action: '下一步',
  },
  {
    id: 'reports',
    route: '/app/reports',
    target: '[data-tour="report-balance"]',
    label: '收支报表',
    title: '看清钱花在了哪里',
    description:
      '只要持续记账，报表就会自动计算收入、支出、储蓄率、分类占比和异常消费。',
    hint: '先看本月结余，再往下看最大支出分类与变化趋势。',
    icon: IconChart,
    action: '下一步',
  },
  {
    id: 'goals',
    route: '/app/goals',
    target: '[data-tour="goal-add"]',
    label: '储蓄目标',
    title: '让想要的生活慢慢靠近',
    description:
      '输入目标金额和截止日期，系统会计算完成进度以及每月建议投入金额。',
    hint: '目标越具体越容易坚持，例如“6 个月攒 12,000 元”。',
    icon: IconTarget,
    action: '下一步',
  },
  {
    id: 'settings-trigger',
    target: '[data-tour="settings-trigger"]',
    label: '偏好与备份',
    title: '账本也需要好好保管',
    description:
      '在设置中调整外观与币种，导出本地备份，或连接自己的 WebDAV 服务。',
    hint: '数据默认留在当前浏览器，记得定期备份。',
    icon: IconSettings,
    action: '完成向导',
  },
];

function emit(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

function findVisibleTarget(selector: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    }) ?? null
  );
}

function rectFromElement(element: HTMLElement): TargetRect {
  const surface = element.querySelector<HTMLElement>('[data-tour-focus]') ?? element;
  const rect = surface.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    radius: Math.min(rect.width / 2, rect.height / 2, parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 4),
  };
}

function sameRect(a: TargetRect | null, b: TargetRect): boolean {
  if (!a) return false;
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

function coachmarkPosition(rect: TargetRect | null, cardHeight: number): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(384, viewportWidth - 24);
  const height = Math.min(cardHeight, viewportHeight - 24);
  const clampTop = (top: number) => Math.max(12, Math.min(viewportHeight - height - 12, top));
  const clampLeft = (left: number) => Math.max(12, Math.min(viewportWidth - cardWidth - 12, left));

  if (!rect) {
    return {
      left: '50%',
      top: '50%',
      width: cardWidth,
      transform: 'translate(-50%, -50%)',
    };
  }

  if (viewportWidth >= 768 && rect.right + cardWidth + 28 <= viewportWidth) {
    return { left: rect.right + 16, top: clampTop(rect.top), width: cardWidth };
  }
  if (viewportWidth >= 768 && rect.left >= cardWidth + 28) {
    return { left: rect.left - cardWidth - 16, top: clampTop(rect.top), width: cardWidth };
  }
  const below = viewportHeight - rect.bottom;
  const above = rect.top;
  const placeBelow = below >= height + 28 || (above < height + 28 && below >= above);
  return {
    left: clampLeft(rect.left + rect.width / 2 - cardWidth / 2),
    top: clampTop(placeBelow ? rect.bottom + 16 : rect.top - height - 16),
    width: cardWidth,
  };
}

export function openOnboardingGuide() {
  emit(ONBOARDING_OPEN_EVENT);
}

export function OnboardingGuide() {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLElement | null>(null);
  const transitionTimer = useRef<number>();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [cardHeight, setCardHeight] = useState(300);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [suspended, setSuspended] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const step = GUIDE_STEPS[stepIndex];
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;

  useEffect(() => {
    const handleOpen = () => {
      window.clearTimeout(transitionTimer.current);
      emit(SETTINGS_CLOSE_EVENT);
      emit(QUICK_ENTRY_CLOSE_EVENT);
      setStepIndex(0);
      setStarted(false);
      setSwitching(false);
      setSuspended(false);
      setOpen(true);
    };

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== ONBOARDING_VERSION) {
      handleOpen();
    }
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => () => window.clearTimeout(transitionTimer.current), []);

  useEffect(() => {
    const resumeAfterQuickEntry = () => {
      if (!suspended) return;
      setSwitching(true);
      setTargetRect(null);
      setStepIndex(1);
      setSuspended(false);
    };
    window.addEventListener(QUICK_ENTRY_CLOSED_EVENT, resumeAfterQuickEntry);
    return () => window.removeEventListener(QUICK_ENTRY_CLOSED_EVENT, resumeAfterQuickEntry);
  }, [suspended]);

  useEffect(() => {
    if (!open || !started || suspended) return;
    setSwitching(true);
    if (step.route) navigate(step.route);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const timer = window.setTimeout(() => setSwitching(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360);
    return () => window.clearTimeout(timer);
  }, [navigate, open, started, stepIndex, suspended]);

  useEffect(() => {
    if (!open || suspended || !dialogRef.current) return;
    const observer = new ResizeObserver(([entry]) => setCardHeight(entry.target.getBoundingClientRect().height));
    observer.observe(dialogRef.current);
    return () => observer.disconnect();
  }, [open, started, suspended]);

  useEffect(() => {
    if (!open || suspended) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [open, started, suspended]);

  useEffect(() => {
    if (!open || suspended) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusDialog = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('button:not(:disabled)')
        ?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGuide();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, started, suspended]);

  useEffect(() => {
    if (!open || suspended) return;

    const updateTarget = () => {
      const target = findVisibleTarget(step.target);
      if (!target) {
        setTargetRect(null);
        return;
      }
      const nextRect = rectFromElement(target);
      setTargetRect((current) => (sameRect(current, nextRect) ? current : nextRect));
    };

    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      updateTarget();
    };
    onResize();
    const interval = window.setInterval(updateTarget, 160);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [open, started, step.target, suspended]);

  useEffect(() => {
    if (!open || !started || suspended || !['quick-entry', 'settings-trigger'].includes(step.id)) return;

    const handleTargetClick = (event: MouseEvent) => {
      const clicked = (event.target as HTMLElement).closest(step.target);
      if (!clicked) return;
      if (step.id === 'quick-entry') {
        setSuspended(true);
      } else {
        closeGuide();
      }
    };

    document.addEventListener('click', handleTargetClick, true);
    return () => document.removeEventListener('click', handleTargetClick, true);
  }, [open, started, step.id, step.target, suspended]);

  function closeGuide(markComplete = true) {
    window.clearTimeout(transitionTimer.current);
    if (markComplete) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, ONBOARDING_VERSION);
    }
    emit(SETTINGS_CLOSE_EVENT);
    emit(QUICK_ENTRY_CLOSE_EVENT);
    setOpen(false);
  }

  function goBack() {
    if (stepIndex === 0) return;
    changeStep(stepIndex - 1);
  }

  function changeStep(nextIndex: number, begin = false) {
    if (switching) return;
    setSwitching(true);
    transitionTimer.current = window.setTimeout(() => {
      setTargetRect(null);
      setStepIndex(nextIndex);
      if (begin) setStarted(true);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150);
  }

  function advance() {
    if (isLastStep) {
      closeGuide();
      return;
    }
    changeStep(Math.min(GUIDE_STEPS.length - 1, stepIndex + 1));
  }

  if (!open || suspended) return null;

  const StepIcon = step.icon;
  const highlight = started && targetRect
    ? {
        top: targetRect.top - 2,
        left: targetRect.left - 2,
        width: targetRect.width + 4,
        height: targetRect.height + 4,
      }
    : null;
  const radius = targetRect ? targetRect.radius + 2 : 6;
  const cutout = highlight
    ? `M${highlight.left + radius} ${highlight.top}
       h${highlight.width - radius * 2} a${radius} ${radius} 0 0 1 ${radius} ${radius}
       v${highlight.height - radius * 2} a${radius} ${radius} 0 0 1 ${-radius} ${radius}
       h${radius * 2 - highlight.width} a${radius} ${radius} 0 0 1 ${-radius} ${-radius}
       v${radius * 2 - highlight.height} a${radius} ${radius} 0 0 1 ${radius} ${-radius} Z`
    : '';

  return (
    <>
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] h-full w-full">
        <path
          className="pointer-events-auto fill-foreground/25 dark:fill-black/50"
          fillRule="evenodd"
          d={`M0 0H${viewport.width}V${viewport.height}H0Z ${cutout}`}
        />
        <path d={cutout} className={`fill-foreground/25 transition-opacity duration-150 motion-reduce:transition-none dark:fill-black/50 ${switching ? 'pointer-events-auto opacity-100' : 'opacity-0'}`} />
      </svg>
      {highlight && (switching || !['quick-entry', 'settings-trigger'].includes(step.id)) && (
        <div aria-hidden="true" className="fixed z-[80]" style={highlight} />
      )}

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        data-onboarding-ui
        data-switching={switching}
        className="glass-popup fixed z-[90] max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-[1.5rem] border p-5 text-popover-foreground shadow-[0_20px_70px_hsl(var(--foreground)/0.12)] transition-opacity duration-150 motion-reduce:transition-none data-[switching=true]:pointer-events-none data-[switching=true]:opacity-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-6"
        style={started ? coachmarkPosition(targetRect, cardHeight) : { left: '50%', top: '50%', width: 'min(28rem,calc(100vw - 1.5rem))', transform: 'translate(-50%,-50%)' }}
      >
        {!started ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">PennyPeek · 快速上手</span>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8 text-muted-foreground" onClick={() => closeGuide()} aria-label="退出向导"><IconClose /></Button>
            </div>
            <div className="pb-2 pt-5 text-center">
              <img src="/logo.svg" alt="" className="mx-auto h-16 w-16 rounded-2xl shadow-[0_8px_24px_hsl(var(--primary)/0.2)]" />
              <h2 id="onboarding-title" className="mt-5 text-2xl font-semibold tracking-tight">把钱花明白，从这里开始。</h2>
              <p id="onboarding-description" className="mx-auto mt-3 max-w-xs text-sm leading-7 text-muted-foreground">花一分钟认识记账、预算和报表，<br />找到适合自己的日常记账节奏。</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-accent-foreground [&_svg]:h-4 [&_svg]:w-4">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2"><IconReceipt />记录收支</span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2"><IconWallet />安排预算</span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2"><ShieldCheck />自己保管</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/50 pt-5">
              <Button variant="ghost" onClick={() => closeGuide()}>稍后再看</Button>
              <Button disabled={switching} onClick={() => changeStep(0, true)}>开始导览<IconChevronRight /></Button>
            </div>
            <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">随时可以从菜单中的「使用向导」重新打开。</p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-accent-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15"><StepIcon className="h-4 w-4" weight="duotone" /></span>
                {step.label}
              </span>
              <button
                type="button"
                onClick={() => closeGuide()}
                className="app-press -mr-2 -mt-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="退出向导"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <h2 id="onboarding-title" className="mt-4 text-xl font-semibold leading-snug tracking-tight text-foreground">
              {step.title}
            </h2>
            <p id="onboarding-description" className="mt-2 text-sm leading-7 text-muted-foreground">
              {step.description}
            </p>
            <p className="mt-3 text-xs leading-6 text-accent-foreground">
              {step.hint}
            </p>

            <div className="mt-5 flex items-center gap-3 border-t border-border/50 pt-4">
              <div className="min-w-8 flex-1" role="progressbar" aria-label="导览进度" aria-valuemin={0} aria-valuemax={GUIDE_STEPS.length} aria-valuenow={stepIndex + 1}>
                <div className="h-1 overflow-hidden rounded-full bg-primary/15"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${(stepIndex + 1) / GUIDE_STEPS.length * 100}%` }} /></div>
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">{stepIndex + 1} / {GUIDE_STEPS.length}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={switching || stepIndex === 0}
              >
                上一步
              </Button>
              <Button type="button" size="sm" onClick={advance} disabled={switching}>
                {isLastStep ? <IconCheckCircle weight="fill" /> : null}
                {step.action}
                {!isLastStep ? <IconChevronRight /> : null}
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
