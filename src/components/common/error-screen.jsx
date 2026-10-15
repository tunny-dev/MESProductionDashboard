import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher, ThemeSwitcher } from '@/components/common/preferences';
import { cn } from '@/lib/utils';

export function ErrorScreen({ code, title, message, actions, icon: Icon, className }) {
  const { t } = useTranslation();

  return createPortal(
    <div
      className={cn(
        'relative z-50 flex min-h-svh flex-col items-center justify-center bg-background px-4',
        className
      )}
    >
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md text-center">
        {Icon ? <Icon aria-hidden className="mx-auto size-8 text-muted-foreground" /> : null}

        {code ? (
          <p className="text-sm font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {code}
          </p>
        ) : null}
        <h1 className="mt-2 text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">{message}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">{actions}</div>

        <p className="mt-8 text-xs text-muted-foreground">{t('app.subtitle')}</p>
      </div>
    </div>,
    document.body
  );
}

export function ErrorGhostButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground transition-colors outline-hidden hover:bg-button-hover"
    >
      {children}
    </button>
  );
}

export function ErrorPrimaryButton({ children, to = '/', onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors outline-hidden hover:bg-primary-hover"
    >
      {children}
    </Link>
  );
}
