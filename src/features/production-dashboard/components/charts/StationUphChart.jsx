import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';

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

export function StationUphChart({
  stations,
  loading,
  error,
  globalError,
  bottleneckId,
  onRetry,
  copy,
  chartLayout = 'compact',
}) {
  const chartData = useMemo(
    () =>
      stations.map((station) => {
        const target = station.targetUph != null ? Number(station.targetUph) : null;
        const actual = station.actualUph != null ? Number(station.actualUph) : null;
        const isBottleneck = station.stationId === bottleneckId;

        // Nếu UPH thực tế không đạt với mục tiêu -> đánh dấu để trên biểu đồ hiển thị màu đỏ
        const isUnderTarget =
          isBottleneck || (target != null && target > 0 && actual !== null && actual < target);
        return {
          stationId: station.stationId,
          targetUph: target,
          actualUph: actual,
          bottleneck: isBottleneck,
          isUnderTarget,
        };
      }),
    [stations, bottleneckId]
  );

  const [hidden, setHidden] = useState({ targetUph: false, actualUph: false });
  const config = {
    targetUph: { label: copy.charts.targetUph, color: 'var(--chart-1)' },
    actualUph: { label: copy.charts.actualUph, color: 'var(--chart-2)' },
  };

  const isBalanced = chartLayout === 'balanced';
  const isStacked = chartLayout === 'stacked';

  const maxBarSize = isStacked ? 56 : isBalanced ? 46 : 34;
  const barGap = isStacked ? 4 : isBalanced ? 3 : 2;
  const barCategoryGap = isStacked ? '28%' : isBalanced ? '20%' : '10%';

  // Khi ở màn hình rộng xử lý cho các cột trong biểu đồ đứng sát nhau
  const xPadding = useMemo(() => {
    if (chartData.length >= 8) return { left: 16, right: 16 };
    if (isStacked) return { left: 180, right: 180 };
    if (isBalanced) return { left: 60, right: 60 };
    return { left: 12, right: 12 };
  }, [isStacked, isBalanced, chartData.length]);

  return (
    <ChartCard title={copy.charts.stationUph}>
      {loading ? (
        <ChartLoading copy={copy} />
      ) : error || globalError ? (
        <ChartMessage error action={<ChartRetry copy={copy} onRetry={onRetry} />}>
          {copy.errors.stations}
        </ChartMessage>
      ) : !stations.some((station) => station.actualUph != null) ? (
        <ChartMessage>{copy.noData}</ChartMessage>
      ) : (
        <>
          <ChartContainer
            config={config}
            className={cn(
              'h-47.5 w-full aspect-auto fx-fade',
              hidden.targetUph && 'fx-off-b0 fx-off-lg-prev',
              hidden.actualUph && 'fx-off-b1 fx-off-lg-last'
            )}
            initialDimension={{ width: 420, height: 230 }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 22, right: 8, left: 4, bottom: 0 }}
              barGap={barGap}
              barCategoryGap={barCategoryGap}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
              <XAxis
                dataKey="stationId"
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickMargin={7}
                padding={xPadding}
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
                    hiddenKeys={[
                      hidden.targetUph && 'targetUph',
                      hidden.actualUph && 'actualUph',
                    ].filter(Boolean)}
                  />
                }
              />
              <Bar
                dataKey="targetUph"
                fill="var(--color-targetUph)"
                radius={[3, 3, 0, 0]}
                maxBarSize={maxBarSize}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="targetUph"
                  position="top"
                  formatter={(val) => (val != null ? formatNumber(val) : '')}
                  fill="var(--chart-1)"
                  fontSize={9}
                />
              </Bar>
              <Bar
                dataKey="actualUph"
                fill="var(--color-actualUph)"
                radius={[3, 3, 0, 0]}
                maxBarSize={maxBarSize}
                isAnimationActive={false}
              >
                {chartData.map((point) => (
                  <Cell
                    key={point.stationId}
                    fill={point.isUnderTarget ? 'var(--danger)' : 'var(--color-actualUph)'}
                  />
                ))}
                <LabelList
                  dataKey="actualUph"
                  position="top"
                  content={({ x, y, width, value, index }) => {
                    if (value == null || value === '') return null;
                    if (x == null || y == null) return null;
                    const point = chartData[index];
                    const isUnderTarget = point?.isUnderTarget;
                    return (
                      <text
                        x={x + (width ?? 0) / 2}
                        y={y - 4}
                        fill={isUnderTarget ? 'var(--danger)' : 'var(--chart-2)'}
                        fontSize={9}
                        textAnchor="middle"
                        fontWeight="500"
                      >
                        {formatNumber(value)}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
          <ChartLegendBar>
            <LegendToggle
              color="var(--chart-1)"
              label={copy.charts.targetUph}
              pressed={!hidden.targetUph}
              onToggle={() => setHidden((prev) => ({ ...prev, targetUph: !prev.targetUph }))}
            />
            <LegendToggle
              color="var(--chart-2)"
              label={copy.charts.actualUph}
              pressed={!hidden.actualUph}
              onToggle={() => setHidden((prev) => ({ ...prev, actualUph: !prev.actualUph }))}
            />
          </ChartLegendBar>
        </>
      )}
    </ChartCard>
  );
}
