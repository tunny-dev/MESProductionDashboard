import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiRow } from '@/features/overview/components/KpiRow';
import { FilterToolbar } from '@/features/overview/components/FilterToolbar';
import { LineTable } from '@/features/overview/components/LineTable';
import { LineMatrix } from '@/features/overview/components/LineMatrix';
import { CriticalAttentionStrip } from '@/features/overview/components/CriticalAttentionStrip';
import { RefetchBar } from '@/features/overview/components/DataFreshness';
import { useOverviewSnapshot, useOverviewAreas, useOverviewShifts } from '@/hooks/useOverview';
import { applyFilters, useFilters, useFilterActions } from '@/store/filterStore';
import { truncateText } from '@/core/utils/format';
import { MAX_CONSECUTIVE_FAILURES, useConsecutiveFailures } from '@/hooks/useConsecutiveFailures';
import { DataDownScreen } from '@/components/common/DataDownScreen';
import { generateExcelReport } from '@/services/export.service';

export function OverviewPage() {
  const { t } = useTranslation();
  const [shiftId, setShiftId] = useState(null);
  const [pollInterval, setPollInterval] = useState(0); // Mặc định tắt reload tự động theo yêu cầu
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('overview_view_mode') || 'table';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('overview_view_mode', mode);
  };

  const filters = useFilters();
  const { applyFilters: applyFiltersPatch, resetFilters } = useFilterActions();

  const { data: areas = [] } = useOverviewAreas();
  const { data: shifts = [] } = useOverviewShifts();
  const [autoShiftId] = useState(null);
  const autoShiftIdValue = autoShiftId ?? (shifts.length > 0 ? shifts[0].id : null);

  const effectiveShiftId = shiftId ?? autoShiftIdValue;

  const { view, isLoading, isFetching, error, failureReason, refetch, dataUpdatedAt } =
    useOverviewSnapshot({
      shiftId: effectiveShiftId,
      pollInterval,
    });

  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

  // Chỉ lấy chuyền đang có WO và đang sản xuất thực tế
  const viewLines = view?.lines;
  const activeLines = useMemo(() => {
    if (!viewLines) return [];
    return viewLines.filter((line) => Boolean(line.workOrderNo && line.workOrderNo.trim()));
  }, [viewLines]);

  const filteredLines = useMemo(() => applyFilters(activeLines, filters), [activeLines, filters]);

  const counts = useMemo(() => {
    const byStatus = { all: activeLines.length, attention: 0, onTrack: 0, noWo: 0 };
    for (const line of activeLines) {
      if (['atRisk', 'behind', 'stopped'].includes(line.status?.key)) byStatus.attention += 1;
      if (line.status?.key === 'onTrack') byStatus.onTrack += 1;
      if (['noWo', 'idle'].includes(line.status?.key)) byStatus.noWo += 1;
    }
    return { byStatus, shown: filteredLines.length };
  }, [activeLines, filteredLines]);

  const handleExportExcel = () => {
    if (!view || filteredLines.length === 0) return;
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const columns = [
      { key: 'lineId', title: t('table.line') },
      { key: 'areaName', title: t('table.area') },
      { key: 'model', title: t('table.model') },
      { key: 'workOrderNo', title: t('table.workOrder') },
      { key: 'passCount', title: t('table.actual'), format: 'number' },
      { key: 'targetSoFar', title: t('table.target'), format: 'number' },
      { key: 'achievementText', title: t('table.achievement') },
      { key: 'uphText', title: t('table.uph') },
      { key: 'yieldText', title: t('table.yield') },
      { key: 'failCount', title: t('table.failures'), format: 'number' },
      { key: 'statusText', title: t('table.status') },
    ];

    const rows = filteredLines.map((line) => ({
      lineId: line.lineId,
      areaName: line.areaName || '',
      model: line.model || '',
      workOrderNo: line.workOrderNo || '',
      passCount: line.passCount ?? 0,
      targetSoFar: line.targetSoFar ?? 0,
      achievementText: line.achievement !== null ? `${line.achievement}%` : '',
      uphText: line.currentUph !== null ? line.currentUph : '',
      yieldText: line.yield !== null ? `${line.yield}%` : '',
      failCount: line.failCount ?? 0,
      statusText: t(line.status?.labelKey || '') || line.status?.label || '',
    }));

    generateExcelReport({
      fileName: `${t('overview.exportFileName')}_${dateStamp}`,
      sheetName: view.shift?.name || 'Overview',
      columns,
      rows,
    });
  };

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
    <div className="relative flex w-full flex-col gap-5 pb-8">
      <LoadingOverlay active={isLoading} label={t('freshness.loading')} />

      <div className="flex flex-col gap-1 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t('overview.pageTitle', 'Tổng quan sản xuất')}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {t(
              'overview.pageSubtitle',
              'Giám sát thời gian thực tiến độ sản xuất, sản lượng và hiệu suất các chuyền đang vận hành'
            )}
          </p>
        </div>
        {view?.lines && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              {t('overview.activeLinesCount', { count: activeLines.length })}
            </span>
          </div>
        )}
      </div>

      {isLoading || !view ? (
        <OverviewSkeleton />
      ) : (
        <>
          <KpiRow
            kpi={{
              ...view.kpi,
              lineCount: activeLines.length,
              attentionCount: counts.byStatus.attention,
              onTrackCount: counts.byStatus.onTrack,
              noWoCount: 0,
            }}
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
              totalCount={activeLines.length}
              onChange={applyFiltersPatch}
              onReset={resetFilters}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onExport={handleExportExcel}
              pollInterval={pollInterval}
              onPollIntervalChange={setPollInterval}
              onRefresh={refetch}
              isFetching={isFetching}
            />
          </div>

          <CriticalAttentionStrip lines={activeLines} />

          {filteredLines.length === 0 ? (
            <EmptyResult filters={filters} onReset={resetFilters} />
          ) : viewMode === 'matrix' ? (
            <LineMatrix lines={filteredLines} />
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
