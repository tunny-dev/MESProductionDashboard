import { Columns3, LayoutGrid, Loader2, Rows3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/utils/utils';

export function LegendToggle({ color, label, pressed, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      title={label}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 whitespace-nowrap text-[9px] outline-hidden transition-opacity hover:bg-muted hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-production-blue 2xl:text-[10px]"
    >
      <span
        className="size-2 shrink-0 rounded-xs"
        style={{ backgroundColor: color, opacity: pressed ? 1 : 0.25 }}
        aria-hidden="true"
      />
      <span className="text-muted-foreground" style={{ opacity: pressed ? 1 : 0.45 }}>
        {label}
      </span>
    </button>
  );
}

export function ChartLegendBar({ children }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-2 pt-2">
      {children}
    </div>
  );
}

export function FilteredTooltipContent({ hiddenKeys = [], ...props }) {
  const payload = props.payload?.filter((item) => !hiddenKeys.includes(item.dataKey));
  if (!payload?.length) return null;
  return <ChartTooltipContent {...props} payload={payload} />;
}

export function ChartMessage({ children, error = false, action }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 text-center text-xs',
        error ? 'text-danger-text' : 'text-muted-foreground'
      )}
    >
      <span>{children}</span>
      {action}
    </div>
  );
}

export function ChartRetry({ copy, onRetry }) {
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

export function ChartLoading({ copy }) {
  return (
    <div className="relative flex h-full min-h-40 flex-col justify-end gap-3 px-2 pb-2">
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

export function ChartCard({ title, legend, children, meta, className }) {
  return (
    <Card
      className={cn(
        'flex min-h-55 min-w-0 flex-col overflow-visible border border-border-strong bg-card py-2 ring-0',
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

export const CHART_LAYOUTS = [
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

export function ChartLayoutControls({ chartLayout, onChartLayoutChange, copy }) {
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
