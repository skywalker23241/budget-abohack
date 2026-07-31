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
      <DialogContent className="grid h-[min(92dvh,52rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[1.4rem] border-border/70 p-0 shadow-[0_28px_90px_-35px_rgba(9,9,11,.5)]">
        <DialogHeader className="border-b border-border/70 bg-card px-5 py-4 text-left sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-foreground text-background shadow-sm">
              <IconSettings className="h-5 w-5" weight="duotone" />
            </span>
            <div className="min-w-0 pr-6">
              <DialogTitle className="tracking-tight">设置中心</DialogTitle>
              <DialogDescription className="mt-1 break-words">
                偏好、数据备份与私有云同步
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="app-scroll-region min-h-0 overflow-y-auto bg-background md:overflow-hidden">
          <Settings embedded />
        </div>
      </DialogContent>
    </Dialog>
  );
}
