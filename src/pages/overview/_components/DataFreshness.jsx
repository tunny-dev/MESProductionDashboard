import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CircleAlert, RefreshCw } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { formatClockSeconds, formatInt } from '@/core/utils/format';
import { STALE_AFTER_SECONDS } from '@/hooks/useProduction';

export function DataFreshnessBanner({ dataUpdatedAt, isFetching = false }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const staleSeconds = dataUpdatedAt ? Math.max(0, Math.round((now - dataUpdatedAt) / 1000)) : 0;
  const isStale = Boolean(dataUpdatedAt) && staleSeconds >= STALE_AFTER_SECONDS && !isFetching;

  const wasStale = useRef(false);
  useEffect(() => {
    if (isStale && !wasStale.current) {
      toast.add({ title: t('toast.dataLost'), type: 'error' });
    } else if (!isStale && wasStale.current) {
      toast.add({ title: t('toast.dataRecovered'), type: 'success' });
    }
    wasStale.current = isStale;
  }, [isStale, t]);

  if (!dataUpdatedAt) return null;

  const updatedAt = new Date(dataUpdatedAt);

  return (
    <div className="flex flex-col">
      <div className="flex h-9 shrink-0 items-center justify-end gap-2 px-4 sm:px-6">
        {isFetching && (
          <RefreshCw aria-hidden className="size-3.5 animate-spin text-muted-foreground" />
        )}
        <p className="text-xs text-muted-foreground">
          {t('freshness.updatedAt')}{' '}
          <time dateTime={updatedAt.toISOString()} className="table-nums">
            {formatClockSeconds(updatedAt)}
          </time>
        </p>
      </div>

      {isStale && (
        <Alert
          variant="destructive"
          className="gap-x-3 rounded-none border-x-0 border-error-border bg-error-bg px-4 py-3 text-error-strong sm:px-6"
        >
          <CircleAlert aria-hidden className="size-5 text-error-strong" />
          <AlertTitle className="text-error-strong">
            {t('freshness.staleTitle', { seconds: formatInt(staleSeconds) })}
          </AlertTitle>
          <AlertDescription className="text-foreground/80">
            {t('freshness.staleDescription')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function RefetchBar({ isFetching, className }) {
  return (
    <div aria-hidden className={cn('fixed inset-x-0 top-0 z-50 h-0.5', className)}>
      {isFetching && (
        <div className="h-full w-1/3 animate-progress-slide bg-primary motion-reduce:animate-pulse" />
      )}
    </div>
  );
}
