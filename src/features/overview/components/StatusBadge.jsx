import { useTranslation } from 'react-i18next';

import { cn } from '@/core/utils/utils';
import { formatPercent } from '@/core/utils/format';
import { useStatusLabelWithStop } from '@/hooks/useStatusLabel';

function StatusDot({ className }) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-xs', className)} />;
}

export function StatusBadge({ status, size = 'sm', className }) {
  const statusLabel = useStatusLabelWithStop();

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm font-medium ring-1 ring-inset ring-black/5',
        size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-xs',
        status.badge,
        className
      )}
    >
      <StatusDot className={status.dot} />
      {statusLabel(status)}
    </span>
  );
}

export function StatusText({ status, className }) {
  const statusLabel = useStatusLabelWithStop();

  return (
    <span className={cn('whitespace-nowrap font-medium', status.text, className)}>
      {statusLabel(status)}
    </span>
  );
}

export function AchievementBar({ achievement, className, lineId }) {
  const { t } = useTranslation();

  const width = Math.min(100, Math.max(0, achievement ?? 0));

  const label =
    achievement === null
      ? t('table.progressLabelNoData')
      : t('table.progressLabel', { value: formatPercent(achievement, 0) });

  return (
    <div
      className={cn('h-2 rounded-full bg-foreground/5', className)}
      role="progressbar"
      aria-valuenow={achievement ?? 0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={lineId ? `${lineId}: ${label}` : label}
    >
      <div className="h-2 rounded-full bg-chart-fill" style={{ width: `${width}%` }} />
    </div>
  );
}
