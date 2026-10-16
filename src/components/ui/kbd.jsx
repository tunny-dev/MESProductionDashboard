import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const kbdVariants = cva(
  'select-none rounded border px-1.5 py-px font-mono text-[0.7rem] font-normal shadow-xs disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground border-border',
        outline: 'bg-background text-foreground border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export const Kbd = React.forwardRef(function Kbd(
  { abbrTitle, children, className, variant, ...props },
  ref
) {
  return (
    <kbd className={cn(kbdVariants({ variant, className }))} ref={ref} {...props}>
      {abbrTitle ? (
        <abbr title={abbrTitle} className="no-underline">
          {children}
        </abbr>
      ) : (
        children
      )}
    </kbd>
  );
});

Kbd.displayName = 'Kbd';
