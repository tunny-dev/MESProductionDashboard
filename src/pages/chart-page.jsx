import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { CumulativeChart } from '@/features/overview/components/cumulative-chart';
import { FilterToolbar } from '@/features/overview/components/filter-toolbar';
import { RefetchBar, DataFreshnessBanner } from '@/features/overview/components/data-freshness';
import { useProductionSnapshot, useAreas } from '@/features/overview/hooks/use-production';
import { applyFilters, useFilters, useFilterActions } from '@/store/filter-store';
import { buildGroupCumulative, buildGroupHourly } from '@/features/overview/lib/snapshot-view';
import { EMPTY_DASH, formatInt, formatPercent } from '@/lib/format';
import { MAX_CONSECUTIVE_FAILURES, useConsecutiveFailures } from '@/hooks/use-consecutive-failures';
import { DataDownScreen } from '@/components/common/data-down-screen';

export function ChartPage() {
  const { t } = useTranslation();
  const filters = useFilters();
  const { applyFilters: applyFiltersPatch, resetFilters } = useFilterActions();

  const { data: areas = [] } = useAreas();
  const { view, isLoading, isFetching, error, failureReason, refetch, dataUpdatedAt } =
    useProductionSnapshot({});
  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

  const filteredLines = useMemo(
    () => (view ? applyFilters(view.lines, filters) : []),
    [view, filters]
  );

  const rows = useMemo(
    () => (view ? buildGroupHourly(filteredLines, view.shift, view.currentMinutes) : []),
    [filteredLines, view]
  );
  const cumulative = useMemo(() => buildGroupCumulative(rows), [rows]);

  const groupTotals = useMemo(() => {
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    const target = rows.reduce((sum, row) => sum + row.target, 0);
    return { actual, target, achievement: target > 0 ? (actual / target) * 100 : null };
  }, [rows]);

  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    return (
      <DataDownScreen
        onRetry={() => {
          resetFailures();
          refetch();
        }}
      />
    );
  }

  if (error) return <ChartError onRetry={refetch} />;

  return (
    <div className="relative flex flex-col gap-4">
      <LoadingOverlay active={isLoading} label={t('freshness.loading')} />
      <p className="max-w-[70ch] text-sm text-pretty text-muted-foreground">
        {t('chart.description')}
      </p>

      <DataFreshnessBanner dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} />

      <div className="relative flex flex-col gap-3">
        <RefetchBar isFetching={isFetching} />
        <FilterToolbar
          filters={filters}
          areas={areas}
          counts={{ byStatus: { all: view?.lines.length ?? 0 }, shown: filteredLines.length }}
          totalCount={view?.lines.length ?? 0}
          onChange={applyFiltersPatch}
          onReset={resetFilters}
          showDateRange
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {view && (
            <p className="text-xs text-muted-foreground">
              {t('shift.label')}{' '}
              <span className="font-medium text-foreground">{view.shift.name}</span> ·{' '}
              {t('shift.groupNote')}
            </p>
          )}
        </div>
      </div>

      {isLoading || !view ? (
        <ChartSkeleton />
      ) : (
        <>
          <section className="rounded-lg border border-border bg-surface">
            <header className="flex flex-col gap-0.5 border-b border-border px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {t('chart.cumulativeTitle')}
              </h2>
              <p className="text-xs text-muted-foreground table-nums">
                {t('chart.groupSummary', {
                  actual: formatInt(groupTotals.actual),
                  target: formatInt(groupTotals.target),
                  achievement: formatPercent(groupTotals.achievement),
                })}
              </p>
            </header>
            <div className="p-4">
              <CumulativeChart
                points={cumulative}
                shift={view.shift}
                currentMinutes={view.currentMinutes}
                emptyHint={t('chart.emptyGroup')}
              />
            </div>
          </section>

          <HourlyGroupTable rows={rows} />
        </>
      )}
    </div>
  );
}

function HourlyGroupTable({ rows }) {
  const { t } = useTranslation();
  const visibleRows = rows.filter((row) => !row.isFuture);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">{t('chart.hourlyTitle')}</h2>
        <span className="text-xs text-muted-foreground">
          {t('lineDetail.countHours', { count: formatInt(visibleRows.length) })}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {t('lineDetail.hourBucket')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('table.actual')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('chartLabels.targetLabel')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('lineDetail.gap')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('table.achievement')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {t('lineDetail.note')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleRows.map((row) => (
              <tr key={row.hourMinutes} className="h-9">
                <td className="px-3 py-1.5 table-nums">{row.label}</td>
                <td className="px-3 py-1.5 text-right table-nums font-medium">
                  {formatInt(row.actual)}
                </td>
                <td className="px-3 py-1.5 text-right table-nums text-muted-foreground">
                  {formatInt(row.target)}
                </td>
                <td
                  className={cn(
                    'px-3 py-1.5 text-right table-nums',
                    row.gap >= 0 ? 'text-success-text' : 'text-error-text'
                  )}
                >
                  {row.gap > 0 ? '+' : ''}
                  {formatInt(row.gap)}
                </td>
                <td className="px-3 py-1.5 text-right table-nums">
                  <span
                    className={cn(
                      row.achievement === null
                        ? 'text-muted-foreground'
                        : row.achievement >= 90
                          ? 'text-success-text'
                          : 'text-error-text'
                    )}
                  >
                    {formatPercent(row.achievement)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {row.stopMinutes > 0 ? (
                    <span className="text-error-strong">
                      {t('lineDetail.noteStop', { minutes: formatInt(row.stopMinutes) })}
                    </span>
                  ) : row.restMinutes > 0 ? (
                    <span>{t('lineDetail.noteRest', { minutes: formatInt(row.restMinutes) })}</span>
                  ) : (
                    <span>{EMPTY_DASH}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChartError({ onRetry }) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <div>
        <p className="text-sm font-medium text-error-text">{t('error.chartFailed')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('error.networkLost')}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden className="size-4" />
        {t('error.retry')}
      </Button>
    </div>
  );
}

function ChartSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        {t('error.chartFailed')}
      </span>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
