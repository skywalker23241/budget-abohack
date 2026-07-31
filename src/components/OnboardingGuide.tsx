import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Icon } from '@/components/Icons';
import {
  IconChart,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconReceipt,
  IconSettings,
  IconTarget,
  IconWallet,
} from '@/components/Icons';
import { Button } from '@/components/ui';

const ONBOARDING_STORAGE_KEY = 'budget-app:onboarding-version';
const ONBOARDING_VERSION = '3';
const ONBOARDING_OPEN_EVENT = 'budget-app:onboarding:open';
const SETTINGS_OPEN_EVENT = 'budget-app:settings:open';
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
    label: '先从这里开始',
    title: '点一下，记下第一笔收支',
    description:
      '这颗按钮在任何页面都能快速记账。先打开它，看看一笔记录需要哪些信息。',
    hint: '点击高亮按钮，或使用下面的“打开快速记账”。',
    icon: IconReceipt,
    action: '打开快速记账',
  },
  {
    id: 'budget',
    route: '/app/budget',
    target: '[data-tour="budget-add"]',
    label: '让记账产生作用',
    title: '给常用分类设置每月额度',
    description:
      '新增预算后，每笔计入预算的支出都会自动更新进度，接近上限或超支时会提醒你。',
    hint: '第一次建议先设置餐饮、交通和购物三个分类。',
    icon: IconWallet,
    action: '下一步：看懂报表',
  },
  {
    id: 'reports',
    route: '/app/reports',
    target: '[data-tour="report-summary"]',
    label: '自动生成，不用整理',
    title: '这里把流水变成结余和趋势',
    description:
      '只要持续记账，报表就会自动计算收入、支出、储蓄率、分类占比和异常消费。',
    hint: '先看本月结余，再往下看最大支出分类与变化趋势。',
    icon: IconChart,
    action: '下一步：建立目标',
  },
  {
    id: 'goals',
    route: '/app/goals',
    target: '[data-tour="goal-add"]',
    label: '把结余变成计划',
    title: '为应急金或大额支出建一个目标',
    description:
      '输入目标金额和截止日期，系统会计算完成进度以及每月建议投入金额。',
    hint: '目标越具体越容易坚持，例如“6 个月攒 12,000 元”。',
    icon: IconTarget,
    action: '最后看看设置',
  },
  {
    id: 'settings-trigger',
    target: '[data-tour="settings-trigger"]',
    label: '辅助功能不再占页面',
    title: '设置会从当前页面直接弹出',
    description:
      '主题、币种、备份和云同步都属于辅助操作，不需要离开现在的工作页面。',
    hint: '点击高亮的“设置”，看看新的弹出式面板。',
    icon: IconSettings,
    action: '完成向导并打开设置',
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
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
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

function coachmarkPosition(rect: TargetRect | null): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(360, viewportWidth - 24);

  if (!rect) {
    return {
      left: '50%',
      top: '50%',
      width: cardWidth,
      transform: 'translate(-50%, -50%)',
    };
  }

  if (viewportWidth < 768) {
    if (rect.top > viewportHeight / 2) {
      return {
        left: 12,
        bottom: Math.max(12, viewportHeight - rect.top + 16),
        width: cardWidth,
      };
    }
    return {
      left: 12,
      top: Math.min(viewportHeight - 260, rect.bottom + 16),
      width: cardWidth,
    };
  }

  if (rect.width > viewportWidth * 0.55) {
    return { right: 24, bottom: 24, width: 360 };
  }

  const top = Math.max(16, Math.min(viewportHeight - 270, rect.top - 8));
  if (rect.right + 390 < viewportWidth) {
    return { left: rect.right + 18, top, width: 360 };
  }
  if (rect.left > 390) {
    return { right: viewportWidth - rect.left + 18, top, width: 360 };
  }
  if (rect.top > viewportHeight / 2) {
    return {
      left: Math.max(16, Math.min(viewportWidth - 376, rect.left)),
      bottom: viewportHeight - rect.top + 18,
      width: 360,
    };
  }
  return {
    left: Math.max(16, Math.min(viewportWidth - 376, rect.left)),
    top: rect.bottom + 18,
    width: 360,
  };
}

export function openOnboardingGuide() {
  emit(ONBOARDING_OPEN_EVENT);
}

export function OnboardingGuide() {
  const navigate = useNavigate();
  const targetRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const step = GUIDE_STEPS[stepIndex];
  const isLastStep = stepIndex === GUIDE_STEPS.length - 1;

  useEffect(() => {
    const handleOpen = () => {
      emit(SETTINGS_CLOSE_EVENT);
      emit(QUICK_ENTRY_CLOSE_EVENT);
      setStepIndex(0);
      setSuspended(false);
      setOpen(true);
    };

    window.addEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== ONBOARDING_VERSION) {
      handleOpen();
    }
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    const resumeAfterQuickEntry = () => {
      if (!suspended) return;
      setStepIndex(1);
      setSuspended(false);
    };
    window.addEventListener(QUICK_ENTRY_CLOSED_EVENT, resumeAfterQuickEntry);
    return () => window.removeEventListener(QUICK_ENTRY_CLOSED_EVENT, resumeAfterQuickEntry);
  }, [suspended]);

  useEffect(() => {
    if (!open || suspended || !step.route) return;
    navigate(step.route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate, open, step.route, suspended]);

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
  }, [open, suspended]);

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
  }, [open, suspended]);

  useEffect(() => {
    if (!open || suspended) return;

    const updateTarget = () => {
      const target = findVisibleTarget(step.target);
      targetRef.current = target;
      if (!target) {
        setTargetRect(null);
        return;
      }
      const nextRect = rectFromElement(target);
      setTargetRect((current) => (sameRect(current, nextRect) ? current : nextRect));
    };

    updateTarget();
    const interval = window.setInterval(updateTarget, 160);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [open, step.target, suspended]);

  useEffect(() => {
    if (!open || suspended || !['quick-entry', 'settings-trigger'].includes(step.id)) return;

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
  }, [open, step.id, step.target, suspended]);

  function closeGuide(markComplete = true) {
    if (markComplete) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, ONBOARDING_VERSION);
    }
    emit(SETTINGS_CLOSE_EVENT);
    emit(QUICK_ENTRY_CLOSE_EVENT);
    setOpen(false);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function advance() {
    if (step.id === 'quick-entry') {
      const target = targetRef.current;
      if (target) {
        target.click();
      } else {
        setStepIndex(1);
      }
      return;
    }
    if (step.id === 'settings-trigger') {
      closeGuide();
      emit(SETTINGS_OPEN_EVENT);
      return;
    }
    setStepIndex((current) => Math.min(GUIDE_STEPS.length - 1, current + 1));
  }

  if (!open || suspended) return null;

  const StepIcon = step.icon;
  const highlight = targetRect
    ? {
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null;

  return (
    <>
      {highlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[80] rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.68),0_0_0_5px_rgba(255,255,255,0.18)] transition-[top,left,width,height] duration-200"
          style={highlight}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] bg-black/70" />
      )}

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`使用向导：${step.title}`}
        data-onboarding-ui
        className="app-scroll-region fixed z-[90] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border bg-background p-5 shadow-2xl sm:p-6"
        style={coachmarkPosition(targetRect)}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <StepIcon className="h-5 w-5" weight="duotone" />
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

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {step.label}
        </p>
        <h2 className="mt-1.5 text-xl font-semibold leading-tight text-foreground">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {step.description}
        </p>
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {step.hint}
        </p>

        <div className="mt-5 flex items-center gap-1.5" aria-label={`第 ${stepIndex + 1} 步，共 ${GUIDE_STEPS.length} 步`}>
          {GUIDE_STEPS.map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-[width,background-color] ${
                index === stepIndex ? 'w-6 bg-foreground' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
          <span className="ml-1 text-[11px] text-muted-foreground">
            {stepIndex + 1}/{GUIDE_STEPS.length}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={stepIndex === 0}
          >
            <IconChevronLeft />
            上一步
          </Button>
          <Button type="button" size="sm" onClick={advance}>
            {isLastStep ? <IconCheckCircle weight="fill" /> : null}
            {step.action}
            {!isLastStep ? <IconChevronRight /> : null}
          </Button>
        </div>
      </section>
    </>
  );
}
