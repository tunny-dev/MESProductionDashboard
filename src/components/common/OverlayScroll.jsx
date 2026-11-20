import { forwardRef } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import 'overlayscrollbars/styles/overlayscrollbars.css';
import { cn } from '@/core/utils/utils';

export const OverlayScroll = forwardRef(function OverlayScroll(
  {
    className,
    children,
    options,
    defer = true,
    theme = 'os-theme-senao',
    autoHide = 'leave',
    autoHideDelay = 300,
    ...props
  },
  ref
) {
  return (
    <OverlayScrollbarsComponent
      ref={ref}
      defer={defer}
      options={{
        scrollbars: {
          theme,
          autoHide,
          autoHideDelay,
          clickScroll: true,
        },
        overflow: {
          x: 'scroll',
          y: 'scroll',
        },
        ...options,
      }}
      className={cn('relative', className)}
      {...props}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
});

export default OverlayScroll;
