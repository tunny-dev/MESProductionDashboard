import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Factory, LayoutDashboard, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { canAccessOverview } from '@/config/app';
import { useAuthStore } from '@/store/auth-store';
import { AccountMenu } from '@/components/layouts/account-menu';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/common/preferences';

const CARDS = [
  {
    to: '/production-dashboard',
    icon: Factory,
    titleKey: 'home.dashboardTitle',
    descriptionKey: 'home.dashboardDescription',
    tint: 'bg-production-blue/10 border-production-blue/30 hover:border-production-blue/60',
    chip: 'bg-production-blue/15 text-production-blue',
  },
  {
    to: '/overview',
    icon: LayoutDashboard,
    titleKey: 'home.overviewTitle',
    descriptionKey: 'home.overviewDescription',
    tint: 'bg-production-green/10 border-production-green/30 hover:border-production-green/60',
    chip: 'bg-production-green/15 text-production-green',
    // TEMP — thẻ này khoá với user ngoài OVERVIEW_ALLOWED_USER_IDS.
    overviewLocked: true,
  },
];

/** Ruột thẻ dùng chung cho cả trạng thái mở và khoá. */
function cardBody(card, locked, t) {
  return (
    <>
      <span className={cn('flex size-12 items-center justify-center rounded-xl', card.chip)}>
        <card.icon aria-hidden className="size-6" />
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-lg font-semibold tracking-tight">{t(card.titleKey)}</span>
        <span className="text-sm text-pretty text-muted-foreground">{t(card.descriptionKey)}</span>
      </span>
      {locked ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Lock aria-hidden className="size-4" />
          {t('home.restricted')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          {t('home.open')}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1"
          />
        </span>
      )}
    </>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  // K00136 (admin) vào full; user khác bị khoá thẻ Tổng quan.
  const overviewLocked = !canAccessOverview(user);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        {t('nav.skipToContent')}
      </a>

      <div className="flex items-center justify-end gap-1 p-4">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <AccountMenu />
      </div>

      <main id="main-content" className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[880px]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SENAO" className="h-11 w-auto" />
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold tracking-tight">{t('app.title')}</p>
              <p className="truncate text-sm text-muted-foreground">{t('app.subtitle')}</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t('home.lead')}</p>

          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CARDS.map((card) => {
              const locked = card.overviewLocked && overviewLocked;
              return (
                <li key={card.to} className="min-h-0">
                  {locked ? (
                    <div
                      aria-disabled="true"
                      title={t('home.restricted')}
                      className={cn(
                        'flex h-full min-h-[180px] cursor-not-allowed flex-col gap-3 rounded-xl border bg-card p-6 opacity-60 ring-0',
                        card.tint
                      )}
                    >
                      {cardBody(card, true, t)}
                    </div>
                  ) : (
                    <Link
                      to={card.to}
                      className={cn(
                        'group flex h-full min-h-[180px] flex-col gap-3 rounded-xl border bg-card p-6 ring-0 transition-colors hover:bg-surface-hover',
                        card.tint
                      )}
                    >
                      {cardBody(card, false, t)}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
