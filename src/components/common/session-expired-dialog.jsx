import { LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSessionStore } from '@/store/session-store';
import { useAuthStore } from '@/store/auth-store';

export function SessionExpiredDialog() {
  const sessionExpired = useSessionStore((s) => s.sessionExpired);
  const resetSessionExpiry = useSessionStore((s) => s.resetSessionExpiry);
  const logout = useAuthStore((s) => s.logout);

  function handleLoginAgain() {
    logout();
    resetSessionExpiry();
    const back = window.location.pathname + window.location.search;
    window.location.assign(`/login?back=${encodeURIComponent(back)}`);
  }

  return (
    <Dialog open={sessionExpired}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-warning-bg">
            <LogIn className="size-6 text-warning-text" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center">Phiên đăng nhập đã hết hạn</DialogTitle>
          <DialogDescription className="text-center">
            Phiên làm việc của bạn đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại để tiếp
            tục.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-center">
          <Button type="button" onClick={handleLoginAgain} className="w-full sm:w-auto">
            <LogIn className="mr-2 size-4" aria-hidden="true" />
            Đăng nhập lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
