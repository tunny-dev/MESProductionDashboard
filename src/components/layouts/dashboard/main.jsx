import { cn } from '@/lib/utils';

export function Main({ fixed = false, className, fluid = false, children, ...props }) {
  return (
    <main
      id="content"
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'px-4 py-6 flex-1 overflow-x-hidden overflow-y-auto',
        fixed && 'flex grow flex-col overflow-hidden',
        !fluid && 'mx-auto w-full max-w-[1680px]',
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}
