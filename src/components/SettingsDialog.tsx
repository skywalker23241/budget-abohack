import { useEffect, useState } from 'react';
import { IconSettings } from '@/components/Icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { Settings } from '@/pages/Settings';

const SETTINGS_OPEN_EVENT = 'budget-app:settings:open';
const SETTINGS_CLOSE_EVENT = 'budget-app:settings:close';

export function openSettingsDialog() {
  window.dispatchEvent(new CustomEvent(SETTINGS_OPEN_EVENT));
}

export function closeSettingsDialog() {
  window.dispatchEvent(new CustomEvent(SETTINGS_CLOSE_EVENT));
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    window.addEventListener(SETTINGS_OPEN_EVENT, handleOpen);
    window.addEventListener(SETTINGS_CLOSE_EVENT, handleClose);
    return () => {
      window.removeEventListener(SETTINGS_OPEN_EVENT, handleOpen);
      window.removeEventListener(SETTINGS_CLOSE_EVENT, handleClose);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="grid h-[min(92dvh,50rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-3xl border-border/60 p-0">
        <DialogHeader className="border-b border-border/50 px-5 py-4 text-left sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-accent-foreground">
              <IconSettings className="h-5 w-5" weight="duotone" />
            </span>
            <div className="min-w-0 pr-6">
              <DialogTitle className="tracking-tight">设置</DialogTitle>
              <DialogDescription className="sr-only">
                偏好、数据备份与私有云同步
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="app-scroll-region min-h-0 overflow-y-auto bg-transparent md:overflow-hidden">
          <Settings embedded />
        </div>
      </DialogContent>
    </Dialog>
  );
}
