import { memo } from 'react';
import { cn } from '@/core/utils/utils';
import {
  OutputChart,
  UphTrendChart,
  StationUphChart,
  ChartLayoutControls,
} from '@/features/production-dashboard/components/charts';

export const DashboardCharts = memo(function DashboardCharts({
  hourly,
  uphTrend,
  stations,
  finalStationId,
  slots,
  slotStates,
  loading,
  hourlyError,
  uphTrendError,
  stationsError,
  globalError,
  bottleneckId,
  copy,
  lineType,
  chartLayout,
  onChartLayoutChange,
  onRetry,
}) {
  const slotList = slots ?? [];
  const targetUph =
    stations?.find((s) => s.stationId === finalStationId)?.targetUph ??
    stations?.at(-1)?.targetUph ??
    null;

  const gridClasses = cn(
    'grid min-h-[220px] min-w-0 flex-1 gap-2 xl:gap-3',
    chartLayout === 'compact' && 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3',
    chartLayout === 'balanced' && 'grid-cols-1 md:grid-cols-2',
    chartLayout === 'stacked' && 'grid-cols-1'
  );

  return (
    <section aria-label={copy.charts.output} className="flex min-h-0 min-w-0 flex-col gap-2">
      <ChartLayoutControls
        chartLayout={chartLayout}
        onChartLayoutChange={onChartLayoutChange}
        copy={copy}
      />
      <div className={gridClasses}>
        <OutputChart
          hourly={hourly || []}
          slots={slotList}
          slotStates={slotStates}
          loading={loading}
          error={hourlyError}
          globalError={globalError}
          copy={copy}
          onRetry={onRetry}
          finalStationId={finalStationId}
          targetUph={targetUph}
          chartLayout={chartLayout}
          className={
            chartLayout === 'balanced'
              ? 'md:col-span-2'
              : chartLayout === 'compact'
                ? 'md:col-span-2 2xl:col-span-1'
                : undefined
          }
        />
        <UphTrendChart
          trend={uphTrend || []}
          slots={slotList}
          slotStates={slotStates}
          loading={loading}
          error={uphTrendError}
          globalError={globalError}
          copy={copy}
          onRetry={onRetry}
          lineType={lineType}
          finalStationId={finalStationId}
          targetUph={targetUph}
        />
        <StationUphChart
          stations={stations || []}
          loading={loading}
          error={stationsError}
          globalError={globalError}
          bottleneckId={bottleneckId}
          onRetry={onRetry}
          copy={copy}
          chartLayout={chartLayout}
        />
      </div>
    </section>
  );
});
