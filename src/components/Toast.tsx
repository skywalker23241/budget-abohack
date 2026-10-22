/**
 * 全局操作反馈：顶部玻璃提示，背景填充表示剩余时间。
 * 用法：const toast = useToast(); toast.success('已保存');
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconCheckCircle, IconAlert, IconInfo, IconClose } from './Icons';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const icons: Record<ToastType, ReactNode> = {
  success: <IconCheckCircle className="h-5 w-5 text-success" />,
  error: <IconAlert className="h-5 w-5 text-destructive" />,
  info: <IconInfo className="h-5 w-5 text-info" />,
};

function ToastNotice({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const [closing, setClosing] = useState(false);
  const fill = { success: 'bg-success/15', error: 'bg-destructive/15', info: 'bg-info/15' };

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      className={`toast-notice glass-popup pointer-events-auto relative isolate w-full max-w-md overflow-hidden rounded-2xl border text-sm text-popover-foreground ${closing ? 'toast-notice-closing' : ''}`}
      onAnimationEnd={(event) => {
        // 同一条 CSS 时间轴驱动填充和关闭，悬停暂停时不会提前被定时器移除。
        if (event.animationName === 'toast-countdown') setClosing(true);
        if (event.animationName === 'toast-leave' && event.target === event.currentTarget) onRemove(item.id);
      }}
    >
      <div aria-hidden="true" className={`toast-countdown pointer-events-none absolute inset-0 -z-10 origin-left ${fill[item.type]}`} />
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="mt-0.5 shrink-0" aria-hidden="true">{icons[item.type]}</span>
        <span className="min-w-0 flex-1 break-words leading-6">{item.message}</span>
        <button
          type="button"
          onClick={() => setClosing(true)}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="关闭提示"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, type, message }]);
    },
    [],
  );

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-label="操作提示" className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <ToastNotice key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
