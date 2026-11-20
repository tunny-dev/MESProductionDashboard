import { useCallback, useId, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { cn } from '@/core/utils/utils';
import { formatNumber } from '@/core/utils/format';
import {
  ChartCard,
  ChartLoading,
  ChartMessage,
  ChartRetry,
  ChartLegendBar,
  LegendToggle,
  FilteredTooltipContent,
} from '@/features/production-dashboard/components/charts/ChartCommon';

export function UphTrendChart({
  trend,
  slots,
  slotStates,
  loading,
  error,
  globalError,
  copy,
  onRetry,
  lineType,
  finalStationId,
  targetUph = null,
}) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hidden, setHidden] = useState({ actual: false, target: false });

  const stationTrend = useCallback(
    (point) => {
      if (!point) return null;
      if (!finalStationId || point.stationId === finalStationId) return point;
      return point.stationValues?.find((station) => station.stationId === finalStationId) ?? point;
    },
    [finalStationId]
  );

  const configuredTarget =
    targetUph ??
    trend.find((point) => point?.targetUph != null)?.targetUph ??
    trend.map(stationTrend).find((point) => point?.target !== null && point?.target !== undefined)
      ?.target ??
    trend
      .map(stationTrend)
      .find((point) => point?.uphTarget !== null && point?.uphTarget !== undefined)?.uphTarget ??
    null;

  const visibleSlots = slots.filter((s) => !s.empty);
  const visibleSlotStates = slotStates.filter((_, i) => !slots[i].empty);

  const chartData = useMemo(
    () =>
      visibleSlots.map((slot, index) => {
        const rawPoint = trend.find(
          (item) =>
            item.slotIx === slot.slotIx ||
            item.slotIx === index ||
            item.label === slot.label ||
            item.slotId === slot.id
        );
        const point = stationTrend(rawPoint);
        const isFuture = visibleSlotStates[index] === 'future';

        const actualVal = point?.actualUph ?? point?.actual ?? point?.uphActual ?? null;

        const targetVal =
          point?.targetUph ?? point?.target ?? point?.uphTarget ?? configuredTarget ?? null;

        return {
          label: slot.label,
          actual: Number(actualVal) || 0,
          target: targetVal != null ? Number(targetVal) : null,
          isFuture,
        };
      }),
    [visibleSlots, trend, visibleSlotStates, stationTrend, configuredTarget]
  );

  const hasFinalStationData = chartData.some(
    (point) => !point.isFuture && point.actual !== null && point.actual !== undefined
  );
  const hasDateLabels = chartData.some((point) => point.label?.includes('/'));

  const config = {
    actual: { label: copy.charts.actualUph, color: 'var(--chart-4)' },
    target: { label: copy.charts.targetUph, color: 'var(--chart-1)' },
  };

  return (
    <ChartCard
      title={copy.charts.uphTrend(lineType)}
      meta={
        finalStationId ? `${copy.charts.finalStation ?? 'Trạm cuối'} ${finalStationId}` : undefined
      }
    >
      {loading ? (
        <ChartLoading copy={copy} />
      ) : error || globalError ? (
        <ChartMessage error action={<ChartRetry copy={copy} onRetry={onRetry} />}>
          {copy.errors.uphTrend}
        </ChartMessage>
      ) : !hasFinalStationData ? (
        <ChartMessage>{copy.noData}</ChartMessage>
      ) : (
        <>
          <ChartContainer
            config={config}
            className={cn(
              'h-47.5 w-full aspect-auto fx-fade',
              hidden.target && 'fx-off-a0',
              hidden.actual && 'fx-off-a1 fx-off-lg-last'
            )}
            initialDimension={{ width: 420, height: 230 }}
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 22, right: 12, left: 4, bottom: hasDateLabels ? 20 : 0 }}
            >
              <defs>
                <linearGradient id={`fillUphActual-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id={`fillUphTarget-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-target)" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="var(--color-target)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: hasDateLabels ? 9 : 10 }}
                tickMargin={hasDateLabels ? 5 : 7}
                angle={hasDateLabels ? -15 : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={38}
                tickCount={4}
                allowDecimals={false}
                domain={[
                  0,
                  (dataMax) => Math.max(50, Math.ceil(((dataMax || 0) * 1.25) / 25) * 25),
                ]}
                tickFormatter={(value) => formatNumber(Math.round(value), 0)}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
                label={{
                  value: copy.charts.uphAxis,
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--muted-foreground)',
                  fontSize: 9,
                  offset: 2,
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <FilteredTooltipContent
                    indicator="dot"
                    hiddenKeys={[hidden.actual && 'actual', hidden.target && 'target'].filter(
                      Boolean
                    )}
                  />
                }
              />
              <Area
                dataKey="target"
                type="monotone"
                fill={`url(#fillUphTarget-${gradientId})`}
                stroke="var(--color-target)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area
                dataKey="actual"
                type="monotone"
                fill={`url(#fillUphActual-${gradientId})`}
                stroke="var(--color-actual)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--chart-4)', stroke: 'var(--surface)' }}
                activeDot={{ r: 4 }}
                connectNulls={true}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="actual"
                  position="top"
                  formatter={(value) =>
                    value == null || !Number.isFinite(Number(value)) ? '' : formatNumber(value)
                  }
                  fill="var(--chart-4)"
                  fontSize={10}
                  offset={8}
                />
              </Area>
            </AreaChart>
          </ChartContainer>
          <ChartLegendBar>
            <LegendToggle
              color="var(--chart-4)"
              label={copy.charts.actualUph}
              pressed={!hidden.actual}
              onToggle={() => setHidden((prev) => ({ ...prev, actual: !prev.actual }))}
            />
            <LegendToggle
              color="var(--chart-1)"
              label={copy.charts.targetUph}
              pressed={!hidden.target}
              onToggle={() => setHidden((prev) => ({ ...prev, target: !prev.target }))}
            />
          </ChartLegendBar>
        </>
      )}
    </ChartCard>
  );
}
