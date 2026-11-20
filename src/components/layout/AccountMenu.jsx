import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleUserRound, Loader2, LogOut } from 'lucide-react';

import { toast } from '@/components/ui/toast';
import { cn } from '@/core/utils/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLogout } from '@/core/auth/useAuth';
import { useAuthStore } from '@/store/authStore';
import { GroupLabel, ICON_TRIGGER, MENU_ITEM } from '@/components/common/preferences';

export function AccountMenu({ className }) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { mutate: doLogout, isPending: isLoggingOut } = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleLogout() {
    doLogout(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.add({ title: t('toast.signedOut'), type: 'success' });
      },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(ICON_TRIGGER, className)} aria-label={t('auth.account')}>
          {isLoggingOut ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <CircleUserRound aria-hidden className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <GroupLabel>{user?.name ?? t('auth.account')}</GroupLabel>
          <DropdownMenuItem
            onClick={() => setConfirmOpen(true)}
            disabled={isLoggingOut}
            className={MENU_ITEM}
          >
            {isLoggingOut ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <LogOut aria-hidden className="size-4" />
            )}
            <span className="flex-1">
              {isLoggingOut ? t('auth.signingOut') : t('auth.signOut')}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('auth.signOut')}
        description={t('auth.signOutConfirm')}
        confirmLabel={t('auth.signOut')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleLogout}
        isPending={isLoggingOut}
      />
    </>
  );
}
