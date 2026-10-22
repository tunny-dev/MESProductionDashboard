import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiRow } from '@/features/overview/components/kpi-row';
import { FilterToolbar } from '@/features/overview/components/filter-toolbar';
import { LineTable } from '@/features/overview/components/line-table';
import { RefetchBar, DataFreshnessBanner } from '@/features/overview/components/data-freshness';
import {
  useProductionSnapshot,
  useAreas,
  useShifts,
} from '@/features/overview/hooks/use-production';
import { applyFilters, useFilters, useFilterActions } from '@/store/filter-store';
import { truncateText } from '@/lib/format';
import { MAX_CONSECUTIVE_FAILURES, useConsecutiveFailures } from '@/hooks/use-consecutive-failures';
import { DataDownScreen } from '@/components/common/data-down-screen';

export function OverviewPage() {
  const { t } = useTranslation();
  const [shiftId, setShiftId] = useState(null);

  const filters = useFilters();
  const { applyFilters: applyFiltersPatch, resetFilters } = useFilterActions();

  const { data: areas = [] } = useAreas();
  const { data: shifts = [] } = useShifts();
  const [autoShiftId] = useState(null);
  const autoShiftIdValue = autoShiftId ?? (shifts.length > 0 ? shifts[0].id : null);

  const effectiveShiftId = shiftId ?? autoShiftIdValue;

  const { view, isLoading, isFetching, error, failureReason, refetch, dataUpdatedAt } =
    useProductionSnapshot({
      shiftId: effectiveShiftId,
    });

  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

  const filteredLines = useMemo(
    () => (view ? applyFilters(view.lines, filters) : []),
    [view, filters]
  );

  const counts = useMemo(() => {
    const byStatus = { all: view?.lines.length ?? 0, attention: 0, onTrack: 0, noWo: 0 };
    for (const line of view?.lines ?? []) {
      if (['atRisk', 'behind', 'stopped'].includes(line.status.key)) byStatus.attention += 1;
      if (line.status.key === 'onTrack') byStatus.onTrack += 1;
      if (['noWo', 'idle'].includes(line.status.key)) byStatus.noWo += 1;
    }
    return { byStatus, shown: filteredLines.length };
  }, [view, filteredLines]);

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

  if (error) {
    return <ListError onRetry={refetch} />;
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[1680px] flex-col gap-6">
      <LoadingOverlay active={isLoading} label={t('freshness.loading')} />

      {isLoading || !view ? (
        <OverviewSkeleton />
      ) : (
        <>
          <DataFreshnessBanner dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} />

          <KpiRow
            kpi={view.kpi}
            shift={view.shift}
            shiftId={effectiveShiftId}
            onShiftChange={setShiftId}
            updatedAt={dataUpdatedAt}
          />

          <div className="relative flex flex-col gap-3">
            <RefetchBar isFetching={isFetching} />
            <FilterToolbar
              filters={filters}
              areas={areas}
              counts={counts}
              totalCount={view.lines.length}
              onChange={applyFiltersPatch}
              onReset={resetFilters}
            />
          </div>

          {filteredLines.length === 0 ? (
            <EmptyResult filters={filters} onReset={resetFilters} />
          ) : (
            <LineTable lines={filteredLines} />
          )}
        </>
      )}
    </div>
  );
}

function EmptyResult({ filters, onReset }) {
  const { t } = useTranslation();
  const hasQuery = Boolean(filters.query.trim());

  return (
    <Empty className="rounded-lg border border-solid border-border bg-surface py-10">
      <p className="max-w-[55ch] text-sm text-muted-foreground">
        {hasQuery
          ? t('filters.emptyWithQuery', { query: truncateText(filters.query, 24) })
          : t('filters.emptyNoQuery')}{' '}
        <button
          type="button"
          onClick={onReset}
          className="inline h-auto cursor-pointer p-0 font-medium text-foreground underline-offset-4 outline-hidden hover:underline"
        >
          {t('filters.clearFilters')}
        </button>
      </p>
    </Empty>
  );
}

function ListError({ onRetry }) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <div>
        <p className="text-sm font-medium text-error-text">{t('error.loadFailed')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('error.networkLost')}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden className="size-4" />
        {t('error.retry')}
      </Button>
    </div>
  );
}

function OverviewSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        {t('freshness.loading')}
      </span>
      <div className="rounded-lg border border-border bg-surface">
        <div className="h-14 border-b border-border" />
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-surface p-4 sm:p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {Array.from({ length: 10 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 border-b border-border px-3 py-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="ml-auto h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
