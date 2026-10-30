import { Outlet } from 'react-router-dom';
import { getCookie } from '@/core/utils/cookies';
import { SearchProvider } from '@/components/common/SearchProvider';
import { LayoutProvider } from '@/components/layout/LayoutProvider';
import { DirectionProvider } from '@/components/layout/DirectionProvider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Header } from '@/components/layout/Header';
import { Main } from '@/components/layout/Main';
import { cn } from '@/core/utils/utils';
import { SkipToMain } from '@/components/common/SkipToMain';
import { TopNav } from '@/components/layout/TopNav';
import { Search } from '@/components/common/Search';
// ThemeSwitcher là nút đổi theme DUY NHẤT của app — dùng chung với
// trang chủ / đăng nhập / trang lỗi nên nút, menu và nhãn giống hệt nhau.
// (Bản cũ components/theme-switch.jsx đã bỏ.)
import { ThemeSwitcher } from '@/components/common/Preferences';
import { ConfigDrawer } from '@/components/common/ConfigDrawer';
import { AccountMenu } from '@/components/layout/AccountMenu';

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

export const AppLayout = AppShell;
export default AppLayout;
