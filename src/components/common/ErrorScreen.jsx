import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/common/preferences';
import { cn } from '@/core/utils/utils';

export function ErrorScreen({ code, title, message, actions, detail, role, className }) {
  return createPortal(
    <div
      className={cn(
        'relative flex min-h-svh flex-col items-center justify-center bg-background px-4',
        className
      )}
    >
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <img src="/logo.png" alt="SENAO" className="h-9 w-auto shrink-0" />

      <div className="mx-auto mt-8 w-full max-w-md text-center" role={role}>
        {code ? (
          <p className="text-sm font-medium tabular-nums text-muted-foreground">{code}</p>
        ) : null}

        <h1 className={cn('text-xl font-semibold text-foreground', code && 'mt-1')}>{title}</h1>

        {message ? (
          <p className="mt-2 text-sm text-pretty text-muted-foreground">{message}</p>
        ) : null}

        {actions ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">{actions}</div>
        ) : null}

        {detail ? <div className="mt-8">{detail}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export const ERROR_ACTION_BUTTON = 'h-11 w-full px-5 sm:w-auto md:h-10';

const ACTION_BUTTON = ERROR_ACTION_BUTTON;

export function ErrorGhostButton({ children, onClick, to }) {
  if (!to) {
    return (
      <Button variant="outline" size="lg" onClick={onClick} className={ACTION_BUTTON}>
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      nativeButton={false}
      render={<Link to={to} onClick={onClick} />}
      className={ACTION_BUTTON}
    >
      {children}
    </Button>
  );
}

export function ErrorPrimaryButton({ children, to, onClick }) {
  if (!to) {
    return (
      <Button size="lg" onClick={onClick} className={ACTION_BUTTON}>
        {children}
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      nativeButton={false}
      render={<Link to={to} onClick={onClick} />}
      className={ACTION_BUTTON}
    >
      {children}
    </Button>
  );
}

export function ErrorBackButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.key === 'default') return null;

  return <ErrorGhostButton onClick={() => navigate(-1)}>{t('error.goBack')}</ErrorGhostButton>;
}

export function ErrorCodeDetail({ value }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
      <span className="font-mono">{value}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleCopy}
        aria-label={t('error.copyErrorCode')}
        title={t('error.copyErrorCode')}
        className="text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
      </Button>
    </span>
  );
}
