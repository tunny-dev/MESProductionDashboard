import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { EMPTY_DASH, formatInt, formatNumber, formatPercent } from '@/core/utils/format';
import { AchievementBar, StatusBadge } from '@/features/overview/components/StatusBadge';

export function LineMatrix({ lines, className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        className
      )}
    >
      {lines.map((line) => (
        <LineCard key={line.lineId} line={line} />
      ))}
    </div>
  );
}

function LineCard({ line }) {
  const { t } = useTranslation();
  const detailHref = `/overview/line/${encodeURIComponent(line.lineId)}`;
  const dashboardHref = `/production-dashboard?line=${encodeURIComponent(line.lineId)}${
    line.workOrderNo ? `&mo=${encodeURIComponent(line.workOrderNo)}` : ''
  }`;

  const isStopped = line.status?.key === 'stopped';
  const isBehind = line.status?.key === 'behind';
  const isAtRisk = line.status?.key === 'atRisk';

  const displayName = line.lineName || line.lineId;
  const hasDistinctCode = line.lineName && line.lineName !== line.lineId;

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border bg-surface p-4 shadow-2xs transition-all hover:shadow-md',
        isStopped
          ? 'border-error-strong/40 bg-error-surface/15 hover:border-error-strong/70'
          : isBehind
            ? 'border-error/30 hover:border-error/60'
            : isAtRisk
              ? 'border-warning/30 hover:border-warning/60'
              : 'border-border/80 hover:border-foreground/20'
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                to={detailHref}
                className="truncate text-base font-bold text-foreground underline-offset-4 outline-hidden hover:text-primary hover:underline"
              >
                {displayName}
              </Link>
              {hasDistinctCode && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {line.lineId}
                </span>
              )}
            </div>
            <span className="inline-block mt-0.5 rounded border border-border/60 bg-surface-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
              {line.areaName || line.areaId}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <StatusBadge status={line.status} size="sm" />
            <Link
              to={dashboardHref}
              title={t('table.viewDashboard', 'Xem Production Dashboard')}
              aria-label={t('table.viewDashboard')}
              className="inline-flex size-6.5 items-center justify-center rounded-md border border-border/80 bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              <LayoutDashboard className="size-3" />
            </Link>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border/50 bg-surface-muted/40 p-2.5 text-xs">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[11px] text-muted-foreground">{t('table.model')}:</span>
            <span className="truncate font-mono font-bold text-foreground" title={line.model}>
              {line.model || EMPTY_DASH}
            </span>
          </div>
          {line.productName && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground" title={line.productName}>
              {line.productName}
            </p>
          )}
          <div className="mt-1.5 flex items-baseline justify-between gap-1 border-t border-border/40 pt-1.5">
            <span className="text-[11px] text-muted-foreground">{t('table.workOrder')}:</span>
            <span className="truncate font-mono font-medium text-foreground">
              {line.workOrderNo ?? EMPTY_DASH}
            </span>
          </div>
          {line.workOrder?.planQty > 0 && (
            <div className="mt-0.5 flex items-baseline justify-between gap-1 text-[11px] text-muted-foreground">
              <span>{t('table.plan', 'Kế hoạch')}:</span>
              <span className="font-medium table-nums text-foreground">
                {formatInt(line.workOrder.planQty)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {t('table.actual')} / {t('table.target')}
            </span>
            <span className="text-sm font-bold table-nums text-foreground">
              {formatInt(line.passCount)}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {formatInt(line.targetSoFar)}
              </span>
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <AchievementBar
              achievement={line.achievement}
              lineId={line.lineId}
              className="h-2 flex-1"
            />
            <span className="shrink-0 text-xs font-bold table-nums text-foreground">
              {formatPercent(line.achievement)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-surface-muted/60 px-2 py-1.5 text-center text-xs">
        <div>
          <span className="block text-[10px] font-medium text-muted-foreground uppercase">
            {t('table.uph')}
          </span>
          <span className="font-semibold table-nums text-foreground">
            {line.currentUph === null ? EMPTY_DASH : formatNumber(line.currentUph, 0)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-medium text-muted-foreground uppercase">
            {t('table.yield')}
          </span>
          <span className="font-semibold table-nums text-foreground">
            {formatPercent(line.yield)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-medium text-muted-foreground uppercase">
            {t('table.failures')}
          </span>
          <span
            className={cn(
              'font-semibold table-nums',
              line.failCount > 0 ? 'text-error-strong font-bold' : 'text-muted-foreground'
            )}
          >
            {line.failCount > 0 ? formatInt(line.failCount) : EMPTY_DASH}
          </span>
        </div>
      </div>
    </div>
  );
}
