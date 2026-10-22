import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Link } from 'react-router-dom';
import { sidebarData } from '@/components/layouts/data/sidebar-data';
import { useAuthStore } from '@/store/auth-store';
import { useLayout } from '@/providers/layout-provider';
import { NavGroup } from '@/components/layouts/dashboard/nav-group';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function AppSidebar() {
  const { collapsible, variant } = useLayout();
  const authUser = useAuthStore((state) => state.user);
  const sidebarName = authUser?.name || authUser?.username || 'User';
  const sidebarEmail = authUser?.email || authUser?.username || '';
  const sidebarInitial = sidebarName.trim().charAt(0).toUpperCase() || 'U';
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <Link
          to="/"
          aria-label="Home"
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-hidden group-data-[collapsible=icon]:justify-center"
        >
          <img src="/logo.png" alt="SENAO" className="h-8 w-auto shrink-0" />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold whitespace-nowrap">
              Senao Networks
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/60">
              MES Production Dashboard
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1.5">
        <div className="flex items-center gap-2.5 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Avatar className="h-8 w-8 shrink-0 rounded-lg">
            <AvatarFallback className="rounded-lg">{sidebarInitial}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{sidebarName}</span>
            <span className="truncate text-xs text-muted-foreground">{sidebarEmail}</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
