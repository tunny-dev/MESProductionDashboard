import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { cn } from '@/core/utils/utils';
import { calculateAchievement } from '@/features/production-dashboard/utils/calc';
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

export function OutputChart({
  hourly,
  slots,
  slotStates,
  loading,
  error,
  globalError,
  copy,
  onRetry,
  finalStationId,
  targetUph = null,
  chartLayout = 'balanced',
  className,
}) {
  const isBalanced = chartLayout === 'balanced' || chartLayout === 'stacked';
  const barSize = isBalanced ? 44 : 28;
  const barGap = isBalanced ? 3 : 2;
  const barCategoryGap = isBalanced ? '28%' : '14%';

  const visibleSlots = slots.filter((s) => !s.empty);
  const visibleSlotStates = slotStates.filter((_, i) => !slots[i].empty);

  const chartData = useMemo(
    () =>
      visibleSlots.map((slot, index) => {
        const period =
          hourly.find(
            (item) =>
              item.slotIx === slot.slotIx ||
              item.slotIx === index ||
              item.label === slot.label ||
              item.slotId === slot.id
          ) ?? null;

        const finalStationOutput =
          !finalStationId || period?.finalStationOutput?.stationId === finalStationId
            ? period?.finalStationOutput
            : (period?.stationOutputs?.find((station) => station.stationId === finalStationId) ??
              period?.finalStationOutput);

        const isFuture = visibleSlotStates[index] === 'future';
        const isCurrent = visibleSlotStates[index] === 'current';

        const actualOut = period?.actualOutput ?? finalStationOutput?.actualOutput ?? 0;

        const planOut =
          period?.planOutput ??
          period?.plannedOutput ??
          finalStationOutput?.plannedOutput ??
          (targetUph && targetUph > 0 ? Math.round(targetUph * 2) : 0);

        const actual = Number(actualOut) || 0;
        const planned = Number(planOut) || 0;

        const achievement =
          period?.achievement !== undefined && period?.achievement !== null
            ? Number(period.achievement)
            : planned > 0
              ? calculateAchievement(actual, planned)
              : Number(finalStationOutput?.achievement) || 0;

        return {
          label: slot.label,
          plannedOutput: planned,
          actualOutput: actual,
          achievement,
          isCurrent,
          isFuture,
        };
      }),
    [visibleSlots, hourly, visibleSlotStates, finalStationId, targetUph]
  );

  const hasFinalStationData = chartData.some(
    (point) => point.plannedOutput !== null || point.actualOutput !== null
  );

  const hasDateLabels = chartData.some((point) => point.label?.includes('/'));

  const achievementValues = chartData
    .map((point) => point.achievement)
    .filter((value) => Number.isFinite(value));

  const achievementDomain = useMemo(() => {
    if (!achievementValues.length) return [0, 100];
    const lo = Math.min(...achievementValues);
    const hi = Math.max(...achievementValues);
    const pad = Math.max(5, (hi - lo) * 0.2);
    return [Math.max(0, Math.floor(lo - pad)), Math.min(100, Math.max(Math.ceil(hi + pad), 20))];
  }, [achievementValues]);

  const [hidden, setHidden] = useState({
    plannedOutput: false,
    actualOutput: false,
    achievement: false,
  });

  const config = {
    plannedOutput: { label: copy.charts.plannedOutput, color: 'var(--chart-1)' },
    actualOutput: { label: copy.charts.actualOutput, color: 'var(--chart-2)' },
    achievement: { label: copy.charts.achievement, color: 'var(--chart-3)' },
  };

  return (
    <ChartCard
      className={className}
      title={copy.charts.output}
      meta={
        finalStationId ? `${copy.charts.finalStation ?? 'Trạm cuối'} ${finalStationId}` : undefined
      }
    >
      {loading ? (
        <ChartLoading copy={copy} />
      ) : error || globalError ? (
        <ChartMessage error action={<ChartRetry copy={copy} onRetry={onRetry} />}>
          {copy.errors.hourly}
        </ChartMessage>
      ) : !hasFinalStationData ? (
        <ChartMessage>{copy.noData}</ChartMessage>
      ) : (
        <>
          <ChartContainer
            config={config}
            className={cn(
              'h-47.5 w-full aspect-auto fx-fade',
              hidden.plannedOutput && 'fx-off-b0',
              hidden.actualOutput && 'fx-off-b1',
              hidden.achievement && 'fx-off-l0 fx-off-lg-last'
            )}
            initialDimension={{ width: 420, height: 230 }}
          >
            <ComposedChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 24, right: 12, left: 4, bottom: hasDateLabels ? 20 : 0 }}
              barSize={barSize}
              barGap={barGap}
              barCategoryGap={barCategoryGap}
            >
              <CartesianGrid
                yAxisId="output"
                vertical={false}
                stroke="var(--border)"
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: hasDateLabels ? 9 : 10 }}
                tickMargin={hasDateLabels ? 5 : 7}
                angle={hasDateLabels ? -15 : 0}
              />
              <YAxis
                yAxisId="output"
                axisLine={false}
                tickLine={false}
                width={50}
                tickCount={4}
                allowDecimals={false}
                domain={[
                  0,
                  (dataMax) => Math.max(50, Math.ceil(((dataMax || 0) * 1.25) / 50) * 50),
                ]}
                tickFormatter={(value) => formatNumber(Math.round(value), 0)}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
                label={{
                  value: copy.charts.outputAxis,
                  angle: 0,
                  position: 'left',
                  fill: 'var(--muted-foreground)',
                  fontSize: 9,
                  offset: 4,
                }}
              />
              <YAxis
                yAxisId="achievement"
                orientation="right"
                domain={achievementDomain}
                tickCount={5}
                allowDecimals={false}
                tickFormatter={(value) => `${Math.round(value)}%`}
                axisLine={false}
                tickLine={false}
                width={40}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }}
              />
              <ReferenceLine
                yAxisId="achievement"
                y={100}
                stroke="var(--border-strong)"
                strokeDasharray="3 3"
                strokeOpacity={0.8}
              />
              <Bar
                yAxisId="output"
                dataKey="plannedOutput"
                fill="var(--color-plannedOutput)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {chartData.map((point) => (
                  <Cell
                    key={`plan-${point.label}`}
                    fillOpacity={point.isCurrent ? 0.55 : point.isFuture ? 0.35 : 0.85}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="output"
                dataKey="actualOutput"
                fill="var(--color-actualOutput)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {chartData.map((point) => (
                  <Cell
                    key={`actual-${point.label}`}
                    fillOpacity={point.isCurrent ? 0.85 : 1}
                    stroke={point.isCurrent ? 'var(--production-cyan, #38bdf8)' : undefined}
                    strokeWidth={point.isCurrent ? 2 : 0}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="achievement"
                dataKey="achievement"
                type="monotone"
                stroke="var(--color-achievement)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-3)', stroke: 'var(--surface)' }}
                activeDot={false}
                isAnimationActive={false}
                connectNulls={true}
              >
                <LabelList
                  dataKey="achievement"
                  position="top"
                  formatter={(value) => {
                    if (value == null || !Number.isFinite(Number(value))) return '';
                    return `${Math.round(value)}%`;
                  }}
                  fill="var(--chart-3)"
                  fontSize={10}
                  offset={8}
                />
              </Line>
              <ChartTooltip
                cursor={false}
                content={
                  <FilteredTooltipContent
                    indicator="dot"
                    hiddenKeys={[
                      hidden.plannedOutput && 'plannedOutput',
                      hidden.actualOutput && 'actualOutput',
                      hidden.achievement && 'achievement',
                    ].filter(Boolean)}
                  />
                }
              />
            </ComposedChart>
          </ChartContainer>
          <ChartLegendBar>
            <LegendToggle
              color="var(--chart-1)"
              label={copy.charts.plannedOutput}
              pressed={!hidden.plannedOutput}
              onToggle={() =>
                setHidden((prev) => ({ ...prev, plannedOutput: !prev.plannedOutput }))
              }
            />
            <LegendToggle
              color="var(--chart-2)"
              label={copy.charts.actualOutput}
              pressed={!hidden.actualOutput}
              onToggle={() => setHidden((prev) => ({ ...prev, actualOutput: !prev.actualOutput }))}
            />
            <LegendToggle
              color="var(--chart-3)"
              label={copy.charts.achievement}
              pressed={!hidden.achievement}
              onToggle={() => setHidden((prev) => ({ ...prev, achievement: !prev.achievement }))}
            />
          </ChartLegendBar>
        </>
      )}
    </ChartCard>
  );
}
