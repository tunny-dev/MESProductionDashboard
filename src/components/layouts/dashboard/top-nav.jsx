import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopNav({ className, links = [], ...props }) {
  const location = useLocation();

  return (
    <>
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="icon" variant="outline" className="md:size-8 cursor-pointer" />}
          >
            <Menu className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start">
            {links.map(({ title, href, disabled }) => {
              const isActive = location.pathname === href;
              return (
                <DropdownMenuItem
                  key={`${title}-${href}`}
                  render={
                    <Link
                      to={href}
                      className={!isActive ? 'text-muted-foreground' : 'font-medium'}
                      style={disabled ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                    />
                  }
                >
                  {title}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav
        className={cn('hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6', className)}
        {...props}
      >
        {links.map(({ title, href, disabled }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={`${title}-${href}`}
              to={href}
              className={`hover:text-primary text-sm font-medium transition-colors ${
                isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
              } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
            >
              {title}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
