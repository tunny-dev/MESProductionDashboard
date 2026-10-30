import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/core/utils/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatInt, formatMinutes } from '@/core/utils/format';

const VIEW_HEIGHT = 250;

const TIME_RANGES = [
  { value: 'all', hours: null, labelKey: 'chartRange.all' },
  { value: '4h', hours: 4, labelKey: 'chartRange.last4h' },
  { value: '2h', hours: 2, labelKey: 'chartRange.last2h' },
];

export function CumulativeChart({
  points,
  shift,
  currentMinutes,
  height = VIEW_HEIGHT,
  className,
  emptyHint,
  title,
}) {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('all');

  const chartConfig = useMemo(
    () => ({
      actual: { label: t('chartLabels.actualLabel'), color: 'var(--chart-1)' },
      target: { label: t('chartLabels.targetLabel'), color: 'var(--chart-2)' },
    }),
    [t]
  );
  const filteredPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    const range = TIME_RANGES.find((r) => r.value === timeRange);
    if (!range || range.hours === null) return points;
    const reference = currentMinutes ?? points[points.length - 1].minutes;
    return points.filter((p) => p.minutes >= reference - range.hours * 60);
  }, [points, timeRange, currentMinutes]);

  if (!points || points.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-sm text-muted-foreground', className)}
        style={{ height }}
      >
        {emptyHint ?? t('chart.emptyGroup')}
      </div>
    );
  }

  const last =
    filteredPoints.length > 0
      ? filteredPoints[filteredPoints.length - 1]
      : points[points.length - 1];

  return (
    <Card className={cn('pt-0', className)}>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title ?? t('lineDetail.cumulativeTitle')}</CardTitle>
          <CardDescription>
            {t('chartLabels.actualLabel')} {formatInt(last.actual)} / {t('chartLabels.targetLabel')}{' '}
            {formatInt(last.target)} · {formatMinutes(last.minutes)}
          </CardDescription>
        </div>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
          items={TIME_RANGES.map((range) => ({
            value: range.value,
            label: t(range.labelKey),
          }))}
        >
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label={t('chartRange.label')}
          >
            <SelectValue placeholder={t('chartRange.all')} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value} className="rounded-lg">
                {t(range.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
          <AreaChart data={filteredPoints} accessibilityLayer={false}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="minutes"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(minutes) => formatMinutes(minutes)}
            />
            <YAxis
              domain={[0, 'auto']}
              tickCount={4}
              width={48}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatInt(value)}
            />

            {currentMinutes !== null &&
              currentMinutes >= shift.startMinutes &&
              currentMinutes <= shift.endMinutes && (
                <ReferenceLine
                  x={currentMinutes}
                  stroke="var(--foreground)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}

            <defs>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.05} />
              </linearGradient>
              {/* Target nhạt hơn hẳn: người xem phải thấy sản lượng thật là
                  đường chính, target chỉ là mốc chạy bên cạnh. */}
              <linearGradient id="fillTarget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-target)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="var(--color-target)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <ChartTooltip
              cursor={{ stroke: 'var(--border)' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(minutes) => formatMinutes(Number(minutes))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="target"
              type="natural"
              fill="url(#fillTarget)"
              stroke="var(--color-target)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="actual"
              type="natural"
              fill="url(#fillActual)"
              stroke="var(--color-actual)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <ReferenceDot
              x={last.minutes}
              y={last.actual}
              r={3.5}
              fill="var(--color-actual)"
              stroke="none"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
