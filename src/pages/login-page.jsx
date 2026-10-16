import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input.jsx';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field.jsx';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/common/preferences';
import { LoadingButton } from '@/components/common';
import { toast } from '@/components/ui/toast';
import { useLogin } from '@/features/auth/hooks/use-auth';
import { useSessionStore } from '@/store/session-store';

export function LoginPage() {
  const { t } = useTranslation();

  const sessionExpired = useSessionStore((s) => s.sessionExpired);
  const resetSessionExpiry = useSessionStore((s) => s.resetSessionExpiry);

  const passwordRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: doLogin, isPending, errorMessage, reset } = useLogin();

  useEffect(() => {
    if (sessionExpired) {
      toast.add({
        title: 'Phiên đăng nhập đã hết hạn',
        description: 'Vui lòng đăng nhập lại để tiếp tục.',
        type: 'warning',
        timeout: 6000,
      });
      resetSessionExpiry();
    }
  }, [sessionExpired, resetSessionExpiry]);

  function handleSubmit(event) {
    event.preventDefault();
    if (isPending) return;
    reset();
    doLogin(
      { username: username.trim(), password },
      {
        onError: () => {
          setPassword('');
          passwordRef.current?.focus();
        },
      }
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md rounded-xl border border-border-strong bg-card p-6 shadow-modal sm:p-8">
        <img src="/logo.png" alt="SENAO" className="h-9 w-auto" />
        <h1 className="mt-5 text-xl font-semibold text-foreground">{t('app.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInHint')}</p>

        <form onSubmit={handleSubmit} className="mt-8">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">{t('auth.username')}</FieldLabel>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  reset();
                }}
                placeholder={t('auth.usernamePlaceholder')}
                className="h-12"
              />
            </Field>

            <Field>
              <div className="relative order-2">
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    reset();
                  }}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-hidden hover:bg-foreground/5 hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden className="size-4" />
                  ) : (
                    <Eye aria-hidden className="size-4" />
                  )}
                </button>
              </div>
              <div className="order-1 flex items-center justify-between">
                <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
                <Link
                  to="/forgot-password"
                  className="rounded-sm text-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </Field>
          </FieldGroup>

          {errorMessage && (
            <div className="mt-4 min-h-5">
              <p role="alert" className="text-sm text-error-text">
                {errorMessage}
              </p>
            </div>
          )}

          <LoadingButton
            type="submit"
            loading={isPending}
            loadingText={t('auth.signingIn')}
            className="mt-4 h-12 w-full"
          >
            {t('auth.signIn')}
          </LoadingButton>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">{t('auth.itNote')}</p>
      </div>
    </div>
  );
}
