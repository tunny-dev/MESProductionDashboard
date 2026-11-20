import { cn } from '@/core/utils/utils';

export function Spinner({ className, label = 'Đang tải' }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <span className="block size-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
    </span>
  );
}

export function LoadingOverlay({ active = false, label, className }) {
  if (!active) return null;

  return (
    <div
      aria-busy="true"
      className={cn(
        'fixed inset-0 z-100 flex flex-col items-center justify-center gap-3',
        'bg-background/80 backdrop-blur-[2px]',
        className
      )}
    >
      <Spinner label={label} />
      {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
    </div>
  );
}
