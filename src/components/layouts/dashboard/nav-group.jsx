import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NavGroup({ title, items = [] }) {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const href = location.pathname + location.search;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const key = `${item.title}-${item.url || 'collapsible'}`;

          if (!item.items) {
            return <SidebarMenuLink key={key} item={item} href={href} />;
          }

          if (state === 'collapsed' && !isMobile) {
            return <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />;
          }

          return <SidebarMenuCollapsible key={key} item={item} href={href} />;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavBadge({ children }) {
  return <Badge className="rounded-full px-1.5 py-0 text-[10px] leading-4">{children}</Badge>;
}

function SidebarMenuLink({ item, href }) {
  const { setOpenMobile } = useSidebar();
  const isActive = checkIsActive(href, item);
  const Icon = item.icon;

  const isExternal = item.url?.startsWith('http') || item.url?.includes('?line=');

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          isExternal ? (
            <a
              href={item.url}
              target={item.url?.startsWith('http') ? '_blank' : '_self'}
              rel="noopener"
            />
          ) : (
            <Link to={item.url} onClick={() => setOpenMobile(false)} />
          )
        }
        isActive={isActive}
        tooltip={item.title}
        className="h-9"
      >
        {Icon && <Icon className="size-4 shrink-0" />}
        <span className="truncate">{item.title}</span>
        {item.badge && <NavBadge>{item.badge}</NavBadge>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarMenuCollapsible({ item, href }) {
  const { setOpenMobile } = useSidebar();
  const isOpen = checkIsActive(href, item, true);
  const Icon = item.icon;

  return (
    <Collapsible defaultOpen={isOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={<SidebarMenuButton tooltip={item.title} className="h-9 cursor-pointer" />}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span className="truncate">{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
          <ChevronRight className="ms-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => {
              const SubIcon = subItem.icon;
              const isSubActive = checkIsActive(href, subItem);

              return (
                <SidebarMenuSubItem key={`${subItem.title}-${subItem.url}`}>
                  <SidebarMenuSubButton
                    render={<Link to={subItem.url} onClick={() => setOpenMobile(false)} />}
                    isActive={isSubActive}
                  >
                    {SubIcon && <SubIcon className="size-3.5 shrink-0" />}
                    <span className="truncate">{subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarMenuCollapsedDropdown({ item, href }) {
  const Icon = item.icon;
  const isActive = checkIsActive(href, item);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={isActive}
              className="h-9 cursor-pointer"
            />
          }
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
          <ChevronRight className="ms-auto size-4 transition-transform duration-200" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4} className="min-w-48">
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = checkIsActive(href, sub);

            return (
              <DropdownMenuItem
                key={`${sub.title}-${sub.url}`}
                render={
                  <Link to={sub.url} className={isSubActive ? 'bg-secondary font-medium' : ''} />
                }
              >
                {SubIcon && <SubIcon className="size-4" />}
                <span className="max-w-52 truncate">{sub.title}</span>
                {sub.badge && (
                  <span className="ms-auto text-xs text-muted-foreground">{sub.badge}</span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function checkIsActive(href, item, mainNav = false) {
  if (!item) return false;
  const currentPath = href.split('?')[0];
  const itemPath = item.url?.split('?')[0];

  if (item.url && (href === item.url || currentPath === itemPath)) {
    return true;
  }

  if (item.items?.some((i) => checkIsActive(href, i))) {
    return true;
  }

  if (
    mainNav &&
    item.url &&
    currentPath.split('/')[1] !== '' &&
    currentPath.split('/')[1] === itemPath?.split('/')[1]
  ) {
    return true;
  }

  return false;
}
