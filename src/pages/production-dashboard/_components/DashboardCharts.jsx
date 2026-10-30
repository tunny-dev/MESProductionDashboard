import { memo, useCallback, useId, useMemo, useState } from 'react';
import { Columns3, LayoutGrid, Loader2, Rows3 } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/utils/utils';
import { calculateAchievement } from '@/pages/production-dashboard/utils/calc';
import { formatNumber } from '@/core/utils/format';

function LegendToggle({ color, label, pressed, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      title={label}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 whitespace-nowrap text-[9px] outline-hidden transition-opacity hover:bg-muted hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-production-blue 2xl:text-[10px]"
    >
      <span
        className="size-2 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color, opacity: pressed ? 1 : 0.25 }}
        aria-hidden="true"
      />
      <span className="text-muted-foreground" style={{ opacity: pressed ? 1 : 0.45 }}>
        {label}
      </span>
    </button>
  );
}

function ChartLegendBar({ children }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-2">
      {children}
    </div>
  );
}

function FilteredTooltipContent({ hiddenKeys = [], ...props }) {
  const payload = props.payload?.filter((item) => !hiddenKeys.includes(item.dataKey));
  if (!payload?.length) return null;
  return <ChartTooltipContent {...props} payload={payload} />;
}

function ChartMessage({ children, error = false, action }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[160px] flex-col items-center justify-center gap-2 px-4 text-center text-xs',
        error ? 'text-danger-text' : 'text-muted-foreground'
      )}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}

/** Nút thử lại dùng chung cho các panel lỗi của biểu đồ. */
function ChartRetry({ copy, onRetry }) {
  if (!onRetry) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 border-danger/40 text-danger-text hover:bg-danger/10 hover:text-danger-text"
      onClick={onRetry}
    >
      {copy.retry}
    </Button>
  );
}

function ChartLoading({ copy }) {
  return (
    <div className="relative flex h-full min-h-[160px] flex-col justify-end gap-3 px-2 pb-2">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/30 backdrop-blur-[1px]">
        <Loader2 className="size-6 animate-spin text-production-blue" />
        <span className="text-xs font-medium text-muted-foreground">{copy.loadingCharts}</span>
      </div>
      <div className="flex h-full items-end gap-3">
        {[52, 76, 62, 86, 42, 66].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 bg-foreground/10"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <Skeleton className="h-3 w-full bg-foreground/10" />
    </div>
  );
}

function ChartCard({ title, legend, children, meta, className }) {
  return (
    <Card
      className={cn(
        'flex min-h-[220px] min-w-0 flex-col overflow-visible border border-border-strong bg-card py-2 ring-0',
        className
      )}
    >
      <CardHeader className="flex min-w-0 shrink-0 flex-col items-stretch gap-1 px-3 py-0">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <CardTitle className="min-w-0 truncate text-sm font-semibold text-foreground 2xl:text-base">
            {title}
          </CardTitle>
          {meta ? (
            <span className="shrink-0 text-[9px] font-medium text-muted-foreground">{meta}</span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {legend}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 px-2 pb-2 pt-1">{children}</CardContent>
    </Card>
  );
}

const CHART_LAYOUTS = [
  {
    value: 'compact',
    icon: Columns3,
    label: 'layoutCompact',
    description: 'layoutCompactDescription',
  },
  {
    value: 'balanced',
    icon: LayoutGrid,
    label: 'layoutBalanced',
    description: 'layoutBalancedDescription',
  },
  {
    value: 'stacked',
    icon: Rows3,
    label: 'layoutStacked',
    description: 'layoutStackedDescription',
  },
];

function ChartLayoutControls({ chartLayout, onChartLayoutChange, copy }) {
  return (
    <div className="flex min-w-0 items-center justify-end gap-2">
      <span
        id="production-chart-layout-label"
        className="shrink-0 text-[10px] font-medium text-muted-foreground"
      >
        {copy.charts.layoutLabel}
      </span>
      <ToggleGroup
        aria-labelledby="production-chart-layout-label"
        value={[chartLayout]}
        onValueChange={(values) => {
          const nextLayout = values[0];
          if (nextLayout) onChartLayoutChange(nextLayout);
        }}
        variant="outline"
        size="sm"
        spacing={1}
        className="shrink-0"
      >
        {CHART_LAYOUTS.map(({ value, icon: Icon, label, description }) => {
          const descriptionText = copy.charts[description];
          return (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={descriptionText}
              title={descriptionText}
              className="gap-1.5 px-2 data-[pressed]:bg-secondary data-[pressed]:text-foreground"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="text-[10px] leading-none">{copy.charts[label]}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

function OutputChart({
  hourly,
  slots,
  slotStates,
  loading,
  error,
  globalError,
  copy,
  scope,
  onRetry,
  finalStationId,
  className,
}) {
  // Vẫn vẽ ĐỦ các khung giờ của ca, kể cả khung chưa tới — người xem cần thấy
  // toàn cảnh 6 khung (08-10 … 18-20) thay vì biểu đồ chỉ dài tới giờ hiện tại.
  // Khung future để giá trị null (không phải 0) nên không có cột và đường
  // achievement dừng lại, không cắm xuống 0 gây hiểu nhầm "rớt".
  // Bucket rỗng (empty, WO ngắn ngày) vẫn ẩn vì chỉ là chỗ giữ index.
  const visibleSlots = slots.filter((s) => !s.empty);
  const visibleSlotStates = slotStates.filter((_, i) => !slots[i].empty);
  const chartData = useMemo(
    () =>
      visibleSlots.map((slot, index) => {
        const period = hourly.find((item) => item.slotId === slot.id);
        const finalStationOutput =
          period?.finalStationOutput?.stationId === finalStationId
            ? period.finalStationOutput
            : period?.stationOutputs?.find((station) => station.stationId === finalStationId);
        const isFuture = visibleSlotStates[index] === 'future';
        return {
          label: slot.label,
          plannedOutput: isFuture ? null : (finalStationOutput?.plannedOutput ?? null),
          actualOutput: isFuture ? null : (finalStationOutput?.actualOutput ?? null),
          // Khung chưa tới: chưa sản xuất = 0% để đường tỷ lệ vòng xuống 0 và
          // chạy tiếp tới cuối ca, thay vì đứt ngang ở khung hiện tại.
          achievement: isFuture
            ? 0
            : (finalStationOutput?.achievement ??
              calculateAchievement(
                finalStationOutput?.actualOutput,
                finalStationOutput?.plannedOutput
              )),
          isCurrent: visibleSlotStates[index] === 'current',
        };
      }),
    [visibleSlots, hourly, visibleSlotStates, finalStationId]
  );
  const hasFinalStationData = chartData.some(
    (point) => point.plannedOutput !== null || point.actualOutput !== null
  );

  // Nhãn WO có dấu "/" (DD/MM) hoặc "–" (DD/MM–DD/MM) → cần xử lý đặc biệt
  const hasDateLabels = chartData.some((point) => point.label?.includes('/'));

  const achievementValues = chartData
    .map((point) => point.achievement)
    .filter((value) => Number.isFinite(value));
  // Trục phần trăm CHỈ CẦN [0, 100] — đạt là 100%, không có 125%.
  // Trước đây cộng thêm padding (lo-pad, hi+pad) nên đỉnh nhảy lên 125%
  // và đường cong bị dẹp xuống 80% chiều cao. Giữ trần 100%, đáy không
  // xuống dưới 0, và luôn có tối thiểu 20% để mảng 0% không bị đè sát trục.
  const achievementDomain = (() => {
    if (!achievementValues.length) return [0, 100];
    const lo = Math.min(...achievementValues);
    const hi = Math.max(...achievementValues);
    const pad = Math.max(5, (hi - lo) * 0.2);
    return [Math.max(0, Math.floor(lo - pad)), Math.min(100, Math.max(Math.ceil(hi + pad), 20))];
  })();
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
      title={scope === 'WO' ? copy.charts.outputWo : copy.charts.output}
      meta={finalStationId ? `${copy.charts.finalStation} ${finalStationId}` : undefined}
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
              'h-[190px] w-full aspect-auto fx-fade',
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
              barGap={1}
              barCategoryGap="12%"
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
                width={60}
                tickCount={4}
                domain={[0, (dataMax) => Math.max(10, Math.ceil((dataMax || 0) * 1.25))]}
                tickFormatter={formatNumber}
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
                tickFormatter={(value) => `${value}%`}
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
                maxBarSize={72}
                isAnimationActive={false}
              >
                {chartData.map((point) => (
                  <Cell key={`plan-${point.label}`} fillOpacity={point.isCurrent ? 0.42 : 0.9} />
                ))}
              </Bar>
              <Bar
                yAxisId="output"
                dataKey="actualOutput"
                fill="var(--color-actualOutput)"
                radius={[3, 3, 0, 0]}
                maxBarSize={72}
                isAnimationActive={false}
              >
                {chartData.map((point) => (
                  <Cell key={`actual-${point.label}`} fillOpacity={point.isCurrent ? 0.58 : 1} />
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
                  formatter={(value) => (value == null ? '' : `${Math.round(value)}%`)}
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

function UphTrendChart({
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
}) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hidden, setHidden] = useState({ actual: false, target: false });
  const stationTrend = useCallback(
    (point) =>
      point?.stationId === finalStationId
        ? point
        : point?.stationValues?.find((station) => station.stationId === finalStationId),
    [finalStationId]
  );
  const configuredTarget = trend
    .map(stationTrend)
    .find((point) => point?.target !== null && point?.target !== undefined)?.target;

  // Giữ đủ khung giờ như OutputChart (kể cả khung chưa tới) để hai biểu đồ
  // luôn thẳng cột và người xem thấy trọn ca.
  const visibleSlots = slots.filter((s) => !s.empty);
  const visibleSlotStates = slotStates.filter((_, i) => !slots[i].empty);

  const chartData = useMemo(
    () =>
      visibleSlots.map((slot, index) => {
        const point = stationTrend(trend.find((item) => item.slotId === slot.id));
        const isFuture = visibleSlotStates[index] === 'future';
        return {
          label: slot.label,
          // Khung chưa tới: chưa sản xuất = 0 UPH để đường thực tế vòng xuống
          // 0 và chạy tới cuối ca, đồng bộ với biểu đồ tỷ lệ đạt kế hoạch.
          actual: isFuture ? 0 : (point?.actual ?? null),
          target: point?.target ?? configuredTarget ?? null,
          isFuture,
        };
      }),
    [visibleSlots, trend, visibleSlotStates, stationTrend, configuredTarget]
  );
  // Chỉ tính là "có dữ liệu" khi có khung thật (không phải future) — nếu không,
  // ngày tương lai sẽ vẽ một đường 0 thay vì hiện thông báo chưa có dữ liệu.
  const hasFinalStationData = chartData.some((point) => !point.isFuture && point.actual !== null);
  // Nhãn WO có dấu "/" → cần xử lý tương tự OutputChart
  const hasDateLabels = chartData.some((point) => point.label?.includes('/'));
  const config = {
    actual: { label: copy.charts.actualUph, color: 'var(--chart-4)' },
    target: { label: copy.charts.targetUph, color: 'var(--chart-1)' },
  };

  return (
    <ChartCard
      title={copy.charts.uphTrend(lineType)}
      meta={finalStationId ? `${copy.charts.finalStation} ${finalStationId}` : undefined}
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
              'h-[190px] w-full aspect-auto fx-fade',
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
                  <stop offset="5%" stopColor="var(--color-target)" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="var(--color-target)" stopOpacity={0.08} />
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
                domain={[0, 'dataMax + 50']}
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
                type="natural"
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
                type="natural"
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
                  // Khung chưa tới có giá trị 0 — không cần in 4 nhãn "0" sát đáy
                  // trục, đường đã cho thấy rõ.
                  formatter={(value) => (value ? formatNumber(value) : '')}
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

function StationUphChart({ stations, loading, error, globalError, bottleneckId, onRetry, copy }) {
  const chartData = useMemo(
    () =>
      stations.map((station) => ({
        stationId: station.stationId,
        targetUph: station.targetUph,
        actualUph: station.actualUph,
        bottleneck: station.stationId === bottleneckId,
      })),
    [stations, bottleneckId]
  );
  const [hidden, setHidden] = useState({ targetUph: false, actualUph: false });
  const config = {
    targetUph: { label: copy.charts.targetUph, color: 'var(--chart-1)' },
    actualUph: { label: copy.charts.actualUph, color: 'var(--chart-2)' },
  };

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
              'h-[190px] w-full aspect-auto fx-fade',
              hidden.targetUph && 'fx-off-b0 fx-off-lg-prev',
              hidden.actualUph && 'fx-off-b1 fx-off-lg-last'
            )}
            initialDimension={{ width: 420, height: 230 }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 22, right: 8, left: 4, bottom: 0 }}
              barGap={2}
              barCategoryGap="10%"
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
              <XAxis
                dataKey="stationId"
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                tickMargin={7}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={38}
                tickCount={4}
                domain={[0, (dataMax) => Math.max(10, Math.ceil((dataMax || 0) * 1.15))]}
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
              <Bar
                dataKey="targetUph"
                fill="var(--color-targetUph)"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="targetUph"
                  position="top"
                  formatter={formatNumber}
                  fill="var(--chart-1)"
                  fontSize={9}
                />
              </Bar>
              <Bar
                dataKey="actualUph"
                fill="var(--color-actualUph)"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              >
                {chartData.map((point) => (
                  <Cell
                    key={point.stationId}
                    fill={point.bottleneck ? 'var(--danger)' : 'var(--color-actualUph)'}
                  />
                ))}
                <LabelList
                  dataKey="actualUph"
                  position="top"
                  formatter={formatNumber}
                  fill="var(--chart-2)"
                  fontSize={9}
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
  scope = 'DAY',
  chartLayout,
  onChartLayoutChange,
  onRetry,
}) {
  const slotList = slots ?? [];
  const gridClasses = cn(
    'grid min-h-[220px] min-w-0 flex-1 gap-2 xl:gap-3',
    chartLayout === 'compact' && 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3',
    chartLayout === 'balanced' && 'grid-cols-1 md:grid-cols-2',
    chartLayout === 'stacked' && 'grid-cols-1'
  );

  return (
    <section
      aria-label={scope === 'WO' ? copy.charts.outputWo : copy.charts.output}
      className="flex min-h-0 min-w-0 flex-col gap-2"
    >
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
          scope={scope}
          onRetry={onRetry}
          finalStationId={finalStationId}
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
        />
        <StationUphChart
          stations={stations || []}
          loading={loading}
          error={stationsError}
          globalError={globalError}
          bottleneckId={bottleneckId}
          onRetry={onRetry}
          copy={copy}
        />
      </div>
    </section>
  );
});
