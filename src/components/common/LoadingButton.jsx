import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}) {
  return (
    <Button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={className}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
