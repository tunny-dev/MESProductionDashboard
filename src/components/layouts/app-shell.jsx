import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, LayoutDashboard, ClipboardList, Factory } from 'lucide-react';

import { getDashboardCopy } from '@/features/production-dashboard/lib/dashboard-copy';
import { cn } from '@/lib/utils';
import { formatClockSeconds } from '@/lib/format';
import { useClock } from '@/hooks/use-clock';
import { AccountMenu } from '@/components/layouts/account-menu';
import { LanguageSwitcher, ThemeSwitcher } from '@/components/common/preferences';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/store/auth-store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { to: '/overview', labelKey: 'nav.overview', icon: LayoutDashboard, end: true },
  { to: '/overview/chart', labelKey: 'nav.chart', icon: BarChart3, end: false },
  { to: '/wip-report', labelKey: 'nav.wipReport', icon: ClipboardList, end: true },
];

export function AppShell() {
  const location = useLocation();
  const { t } = useTranslation();
  const clock = useClock();

  return (
    <SidebarProvider>
      <AppSidebar pathname={location.pathname} />

      <SidebarInset className="flex h-screen min-h-0 flex-col pb-16 md:pb-0">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          {t('nav.skipToContent')}
        </a>

        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:gap-4 sm:px-6">
          <SidebarTrigger aria-label={t('nav.collapse')} className="-ml-1 cursor-pointer" />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
            {pageTitle(location.pathname, t)}
          </h1>
          <p className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:block">
            {formatClockSeconds(clock)}
          </p>
          <ThemeSwitcher />
          <LanguageSwitcher />
          <AccountMenu />
        </header>

        <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto min-w-0 w-full max-w-[1680px]">
            <Outlet context={{ now: clock }} />
          </div>
        </main>
      </SidebarInset>

      <MobileNavBar />
    </SidebarProvider>
  );
}

function pageTitle(pathname, t) {
  if (pathname.startsWith('/overview/line/')) return t('lineDetail.title');
  if (pathname.startsWith('/overview/chart')) return t('chart.title');
  if (pathname.startsWith('/wip-report')) return t('nav.wipReport');
  return t('nav.overview');
}

function AppSidebar({ pathname }) {
  const { t, i18n } = useTranslation();
  const dashboardCopy = getDashboardCopy(i18n.resolvedLanguage || i18n.language);
  const user = useAuthStore((state) => state.user);
  const initial = (user?.name ?? user?.username ?? 'U').trim().charAt(0).toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/"
          aria-label={t('nav.home')}
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-hidden group-data-[collapsible=icon]:justify-center"
        >
          <img src="/logo.png" alt="SENAO" className="h-7 w-auto shrink-0" />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-medium whitespace-nowrap">
              {t('app.title')}
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/60">
              {t('app.subtitle')}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu aria-label={t('nav.main')} className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={<NavLink to={item.to} end={item.end} />}
                      isActive={isActive}
                      tooltip={t(item.labelKey)}
                      className="h-11"
                    >
                      <item.icon aria-hidden />
                      <span>{t(item.labelKey)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <a href="/production-dashboard?line=DIP-1" target="_blank" rel="noopener" />
                  }
                  tooltip={dashboardCopy.navLabel}
                  className="h-11"
                >
                  <Factory aria-hidden />
                  <span>{dashboardCopy.navLabel}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2.5 rounded-md px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-medium whitespace-nowrap">
              {user?.name ?? user?.username ?? ''}
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/60">
              {user?.username ?? ''}
            </span>
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function MobileNavBar() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const dashboardCopy = getDashboardCopy(i18n.resolvedLanguage || i18n.language);

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-16 cursor-pointer flex-col items-center justify-center gap-1 text-xs outline-hidden',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                <item.icon aria-hidden className="size-5" />
                {t(item.labelKey)}
              </NavLink>
            </li>
          );
        })}

        <li>
          <a
            href="/production-dashboard?line=DIP-1"
            target="_blank"
            rel="noopener"
            className="flex h-16 cursor-pointer flex-col items-center justify-center gap-1 text-xs text-muted-foreground outline-hidden"
          >
            <Factory aria-hidden className="size-5" />
            {dashboardCopy.navShort}
          </a>
        </li>
      </ul>
    </nav>
  );
}
