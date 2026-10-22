import { Outlet } from 'react-router-dom';
import { getCookie } from '@/lib/cookies';
import { SearchProvider } from '@/context/search-provider';
import { LayoutProvider } from '@/providers/layout-provider';
import { DirectionProvider } from '@/providers/direction-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layouts/dashboard/app-sidebar';
import { Header } from '@/components/layouts/dashboard/header';
import { Main } from '@/components/layouts/dashboard/main';
import { cn } from '@/lib/utils';
import { SkipToMain } from '@/components/skip-to-main';
import { TopNav } from '@/components/layouts/dashboard/top-nav';
import { Search } from '@/components/search';
// ThemeSwitcher là nút đổi theme DUY NHẤT của app — dùng chung với
// trang chủ / đăng nhập / trang lỗi nên nút, menu và nhãn giống hệt nhau.
// (Bản cũ components/theme-switch.jsx đã bỏ.)
import { ThemeSwitcher } from '@/components/common/preferences';
import { ConfigDrawer } from '@/components/config-drawer';
import { AccountMenu } from '@/components/layouts/account-menu';

const topNav = [
  {
    title: 'Overview',
    href: '/overview',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Production Dashboard',
    href: '/production-dashboard',
    isActive: false,
    disabled: false,
  },
  {
    title: 'WIP Report',
    href: '/wip-report',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Chart',
    href: '/overview/chart',
    isActive: false,
    disabled: false,
  },
];

export function AppShell({ children }) {
  // Mặc định app: sidebar COMPACT (gập thành icon) + LTR.
  // `sidebar_state` chỉ ghi lại khi người dùng TỰ bấm — không có cookie là compact.
  const defaultOpen = getCookie('sidebar_state') === 'true';

  return (
    <DirectionProvider>
      <SearchProvider>
        <LayoutProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SkipToMain />
            <AppSidebar />
            <SidebarInset
              className={cn(
                '@container/content',
                'flex flex-col h-svh',
                'peer-data-[variant=inset]:h-[calc(100svh-(var(--spacing)*4))]'
              )}
            >
              <Header fixed={true}>
                <TopNav links={topNav} />
                <div className="ms-auto flex items-center space-x-2 sm:space-x-4">
                  <Search />
                  <ThemeSwitcher />
                  <ConfigDrawer />
                  <AccountMenu />
                </div>
              </Header>
              <Main className="pt-4">{children ?? <Outlet />}</Main>
            </SidebarInset>
          </SidebarProvider>
        </LayoutProvider>
      </SearchProvider>
    </DirectionProvider>
  );
}

export default AppShell;
