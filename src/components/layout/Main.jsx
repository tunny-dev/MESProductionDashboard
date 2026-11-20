import { cn } from '@/core/utils/utils';

export function Main({ fixed = false, className, children, ...props }) {
  return (
    <main
      id="content"
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'px-3 sm:px-5 py-4 flex-1 overflow-x-hidden overflow-y-auto',
        fixed && 'flex grow flex-col overflow-hidden',
        'w-full',
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}
