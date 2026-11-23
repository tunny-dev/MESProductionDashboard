import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  EyeOff,
  Activity,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Info,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

import { Input } from '@/components/ui/input.jsx';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field.jsx';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/common/preferences';
import { LoadingButton } from '@/components/common';
import { toast } from '@/components/ui/toast';
import { useLogin } from '@/core/auth/useAuth';
import { useSessionStore } from '@/store/sessionStore';

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
    <div className="relative flex h-svh max-h-svh w-full flex-col lg:flex-row overflow-hidden bg-background text-foreground transition-colors duration-300">
      <aside className="relative hidden lg:flex lg:w-[48%] xl:w-[52%] shrink-0 flex-col justify-between overflow-hidden bg-linear-to-br from-blue-50/90 via-slate-50 to-indigo-50/50 dark:from-[#070b14] dark:via-[#090f1d] dark:to-[#070b14] p-6 lg:p-8 xl:p-12 text-slate-900 dark:text-white select-none border-r border-border transition-colors duration-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -left-28 size-96 rounded-full bg-primary/10 dark:bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-28 size-96 rounded-full bg-sky-400/10 dark:bg-sky-500/15 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(100,116,139,0.18)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:24px_24px]"
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="SENAO"
              className="h-8 lg:h-9 w-auto drop-shadow-sm transition-transform duration-200 hover:scale-105"
            />
            <div>
              <span className="block text-xs lg:text-sm font-bold tracking-wider text-slate-900 dark:text-white uppercase">
                Senao Networks
              </span>
              <span className="block text-[10px] lg:text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Production Dashboard
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 lg:gap-2 rounded-full border border-primary/25 bg-primary/10 dark:border-primary/40 dark:bg-primary/15 px-2.5 lg:px-3 py-1 text-[11px] lg:text-xs font-semibold text-primary dark:text-primary-hover backdrop-blur-xs transition-colors hover:border-primary/50">
            <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>{t('auth.heroBadge')}</span>
          </div>
        </div>

        <div className="relative z-10 my-auto py-4 xl:py-6">
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-2.5 text-xs lg:text-sm xl:text-base text-slate-600 dark:text-slate-300/90 leading-relaxed max-w-xl">
            {t('auth.heroDescription')}
          </p>

          <div className="group mt-5 lg:mt-6 xl:mt-7 rounded-2xl border border-slate-200/90 bg-white/90 dark:border-white/10 dark:bg-white/[0.04] p-4 lg:p-5 backdrop-blur-md shadow-xl shadow-blue-900/5 dark:shadow-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 hover:cursor-pointer cursor-default">
            <div
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-0.5 bg-linear-to-r from-transparent via-primary/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />

            {/* Thanh tiêu đề card */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-white tracking-wide">
                  {t('auth.lineSimTitle')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                {t('auth.lineOperating')}
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2.5 lg:gap-3">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 dark:border-white/5 dark:bg-white/[0.02] p-2.5 lg:p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-primary/30 hover:shadow-xs">
                <span className="text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 block font-medium truncate">
                  {t('auth.kpiOee')}
                </span>
                <span className="mt-1 text-base lg:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
                  96.4%
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ↑ 2.1%
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  {t('auth.kpiOeeSub')}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 dark:border-white/5 dark:bg-white/[0.02] p-2.5 lg:p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-primary/30 hover:shadow-xs">
                <span className="text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 block font-medium truncate">
                  {t('auth.kpiUph')}
                </span>
                <span className="mt-1 text-base lg:text-lg font-bold text-primary dark:text-sky-400 tracking-tight flex items-baseline gap-1">
                  485
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    / 450
                  </span>
                </span>
                <span className="text-[10px] text-primary/80 dark:text-sky-400/90 block mt-0.5 truncate">
                  {t('auth.kpiUphSub')}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 dark:border-white/5 dark:bg-white/[0.02] p-2.5 lg:p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-primary/30 hover:shadow-xs">
                <span className="text-[10px] lg:text-[11px] text-slate-500 dark:text-slate-400 block font-medium truncate">
                  {t('auth.kpiMo')}
                </span>
                <span className="mt-1 text-base lg:text-lg font-bold text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-1">
                  2,850
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    / 3k
                  </span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  {t('auth.kpiMoSub')}
                </span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium flex-wrap">
                <span className="rounded bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-hover px-1.5 py-0.5 font-mono font-semibold transition-transform hover:scale-105">
                  SMT
                </span>
                <span>➔</span>
                <span className="rounded bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-white px-1.5 py-0.5 font-mono font-semibold transition-transform hover:scale-105">
                  AOI
                </span>
                <span>➔</span>
                <span className="rounded bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-white px-1.5 py-0.5 font-mono font-semibold transition-transform hover:scale-105">
                  DIP
                </span>
                <span>➔</span>
                <span className="rounded bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-white px-1.5 py-0.5 font-mono font-semibold transition-transform hover:scale-105">
                  TEST
                </span>
                <span>➔</span>
                <span className="rounded bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-1.5 py-0.5 font-mono font-semibold transition-transform hover:scale-105">
                  PACK
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="size-3.5" />
                {t('auth.flowBalanced')}
              </span>
            </div>
          </div>

          <div className="mt-5 lg:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 lg:gap-3">
            <div className="group/feat flex items-start gap-2.5 rounded-xl p-2 transition-all duration-200 hover:bg-white/70 dark:hover:bg-white/[0.04] hover:shadow-xs hover:cursor-pointer cursor-default">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 dark:border-primary/30 dark:bg-primary/15 text-primary dark:text-primary-hover transition-transform duration-200 group-hover/feat:scale-110">
                <Activity className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('auth.featureRealtimeTitle')}
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {t('auth.featureRealtimeDesc')}
                </p>
              </div>
            </div>

            <div className="group/feat flex items-start gap-2.5 rounded-xl p-2.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-white/[0.04] hover:shadow-xs hover:cursor-pointer cursor-default">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 dark:border-sky-500/30 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 transition-transform duration-200 group-hover/feat:scale-110">
                <Cpu className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('auth.featureWipTitle')}
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {t('auth.featureWipDesc')}
                </p>
              </div>
            </div>

            <div className="group/feat flex items-start gap-2.5 rounded-xl p-2.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-white/[0.04] hover:shadow-xs hover:cursor-pointer cursor-default">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 group-hover/feat:scale-110">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                  {t('auth.featureTraceTitle')}
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {t('auth.featureTraceDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-white/10 pt-3 lg:pt-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="truncate">
              {t('auth.systemLive')} • {t('auth.serverStatus')}
            </span>
          </div>
          <span className="font-mono font-medium shrink-0 ml-2">v1.0.0</span>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col justify-between overflow-y-auto overflow-x-hidden p-6 sm:p-10 lg:p-12 xl:p-14 bg-linear-to-b from-white via-slate-50/70 to-blue-50/20 dark:from-[#0d121c] dark:via-[#090d16] dark:to-[#070a10] transition-colors duration-300">
        {/* Nền hiệu ứng Ambient Glow & Lưới vi mạch nhẹ ở trung tâm */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(100,116,139,0.12)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]"
        />

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="flex lg:hidden items-center gap-2.5">
            <img src="/logo.png" alt="SENAO" className="h-8 w-auto" />
            <span className="text-sm font-bold tracking-tight text-foreground uppercase">
              Senao MES
            </span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-surface/90 p-1 shadow-xs backdrop-blur-md">
            <ThemeSwitcher />
            <div className="h-4 w-px bg-border" />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="relative z-10 my-auto w-full max-w-sm sm:max-w-md mx-auto py-6">
          <div className="text-left">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/20 text-primary mb-3.5 shadow-xs">
              <TrendingUp className="size-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('app.title')}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t('auth.signInHint')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7">
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="username"
                  className="text-xs sm:text-sm font-medium text-foreground"
                >
                  {t('auth.username')}
                </FieldLabel>
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
                  className="mt-1.5 h-11 sm:h-12 text-sm rounded-xl bg-surface/80 dark:bg-surface/50 border-border/90 focus-visible:ring-primary/30"
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel
                    htmlFor="password"
                    className="text-xs sm:text-sm font-medium text-foreground"
                  >
                    {t('auth.password')}
                  </FieldLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:text-primary-hover hover:underline outline-hidden transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="relative mt-1.5">
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
                    className="h-11 sm:h-12 pr-11 text-sm rounded-xl bg-surface/80 dark:bg-surface/50 border-border/90 focus-visible:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-2.5 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground outline-hidden"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
              </Field>
            </FieldGroup>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2.5 rounded-xl border border-error-border bg-error-bg px-3.5 py-2.5 text-sm text-error-text"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <LoadingButton
              type="submit"
              loading={isPending}
              loadingText={t('auth.signingIn')}
              className="mt-6 h-11 sm:h-12 w-full rounded-xl bg-linear-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              {t('auth.signIn')}
            </LoadingButton>
          </form>

          <div className="mt-7 flex items-start gap-2.5 rounded-xl border border-border/80 bg-surface/70 p-3.5 text-xs text-muted-foreground backdrop-blur-xs">
            <Info className="size-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">{t('auth.itNote')}</p>
          </div>
        </div>

        <div className="relative z-10 pt-4 text-center text-xs text-muted-foreground/80">
          <span>
            © {new Date().getFullYear()} Senao Networks. All rights reserved. • Plant IT Department
          </span>
        </div>
      </main>
    </div>
  );
}
