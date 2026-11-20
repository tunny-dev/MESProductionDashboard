import { memo } from 'react';
import { Gauge, Package, PackageCheck, Target, ClipboardList, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/utils/utils';
import {
  calculateAchievement,
  getAchievementColor,
} from '@/features/production-dashboard/utils/calc';
import { formatNumber, formatPercent } from '@/core/utils/format';

const cardStyles = {
  blue: {
    surface: 'bg-production-blue/10 border-production-blue/30',
    icon: 'bg-production-blue/15 text-production-blue',
    strip: 'bg-production-blue',
  },
  green: {
    surface: 'bg-production-green/10 border-production-green/30',
    icon: 'bg-production-green/15 text-production-green',
    strip: 'bg-production-green',
  },
  violet: {
    surface: 'bg-production-violet/10 border-production-violet/30',
    icon: 'bg-production-violet/15 text-production-violet',
    strip: 'bg-production-violet',
  },
  amber: {
    surface: 'bg-production-amber/10 border-production-amber/30',
    icon: 'bg-production-amber/15 text-production-amber',
    strip: 'bg-production-amber',
  },
};

function LoadingCards({ copy }) {
  return (
    <div
      className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3"
      aria-label={copy.loadingKpi}
    >
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/30 backdrop-blur-[1px]">
        <span className="flex items-center gap-2 rounded-lg border border-border-strong bg-card/95 px-3.5 py-2 text-xs font-medium text-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin text-production-blue" />
          <span>{copy.loadingKpi}</span>
        </span>
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <Card
          key={index}
          className="h-full min-h-24 gap-0 border border-border bg-card py-0 ring-0 xl:min-h-25"
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            <div className="grid min-w-0 flex-1 gap-2">
              <Skeleton className="h-3 w-28 bg-foreground/10" />
              <Skeleton className="h-7 w-36 max-w-full bg-foreground/10" />
              <Skeleton className="h-2.5 w-24 bg-foreground/10" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-lg bg-foreground/10" />
          </div>
          <div className="px-4 pb-3" />
        </Card>
      ))}
    </div>
  );
}

function SummaryError({ message, copy, onRetry }) {
  return (
    <Card className="flex min-h-24 items-center border border-danger/35 bg-danger/5 ring-0 xl:min-h-25">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <Target className="size-5 shrink-0 text-danger-text" aria-hidden="true" />
        <p role="alert" className="min-w-0 flex-1 text-sm font-medium text-danger-text">
          {message}
        </p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 border-danger/40 text-danger-text hover:bg-danger/10 hover:text-danger-text"
            onClick={onRetry}
          >
            {copy.retry}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MoInfoCard({ selectedWo, copy }) {
  const style = cardStyles.blue;
  return (
    <Card
      className={cn(
        'h-full min-h-24 gap-0 overflow-hidden border bg-card py-0 ring-0 xl:min-h-25',
        style.surface
      )}
    >
      <div aria-hidden className={cn('h-1 w-full shrink-0', style.strip)} />
      <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground 2xl:text-xs">
            {copy.kpi.moInfo}
          </CardTitle>
          {selectedWo ? (
            <div className="mt-1.5 grid gap-0.5">
              <p className="truncate text-base font-semibold leading-tight text-foreground">
                {selectedWo.mo}
              </p>
              <p
                className="truncate text-xs text-muted-foreground"
                title={selectedWo.partNumber ?? ''}
              >
                {copy.kpi.partNumber}: {selectedWo.partNumber ?? '—'}
              </p>
              <p
                className="truncate text-xs text-muted-foreground"
                title={selectedWo.modelName ?? ''}
              >
                {copy.kpi.modelName}: {selectedWo.modelName ?? '—'}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.kpi.noWo}</p>
          )}
        </div>
        <div
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', style.icon)}
        >
          <ClipboardList className="size-5" aria-hidden="true" />
        </div>
      </CardHeader>
      <div className="pb-3" aria-hidden="true" />
    </Card>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
  unit,
  detail,
  subDetail,
  color,
  achievement,
  goal,
  cumProgress,
  copy,
}) {
  const style = cardStyles[color];
  const achievementClass = achievement === undefined ? '' : getAchievementColor(achievement);
  const achievementTextClass = achievementClass
    .split(' ')
    .find((className) => className.startsWith('text-'));

  return (
    <Card
      className={cn(
        'h-full min-h-24 gap-0 overflow-hidden border bg-card py-0 ring-0 xl:min-h-25',
        style.surface
      )}
    >
      <div aria-hidden className={cn('h-1 w-full shrink-0', style.strip)} />
      <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground 2xl:text-xs">
            {title}
          </CardTitle>
          <p className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span
              className={cn(
                'truncate text-3xl font-semibold leading-none tracking-tight tabular-nums 2xl:text-4xl',
                achievementTextClass || 'text-foreground'
              )}
            >
              {value}
            </span>
            {unit ? (
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground 2xl:text-xs">
                {unit}
              </span>
            ) : null}
          </p>
          <div className="mt-1 space-y-0.5">
            {detail ? (
              <p className="truncate text-xs tabular-nums text-muted-foreground">{detail}</p>
            ) : null}
            {subDetail ? (
              <p className="truncate text-[11px] tabular-nums font-medium text-foreground/80">
                {subDetail}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', style.icon)}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardHeader>

      {achievement !== undefined ? (
        <CardContent className="flex items-center gap-2 px-4 pt-1 pb-3">
          <Progress
            value={Math.min(100, Math.max(0, Number(achievement) || 0))}
            aria-valuetext={formatPercent(achievement, 1)}
            className={cn(
              achievementClass,
              'min-w-0 flex-1 gap-1 bg-transparent',
              '[&_[data-slot=progress-track]]:h-2',
              '[&_[data-slot=progress-track]]:bg-foreground/10',
              '[&_[data-slot=progress-indicator]]:bg-current'
            )}
          >
            <ProgressLabel className="sr-only">{copy.kpi.achievement}</ProgressLabel>
          </Progress>
          <Badge
            variant="outline"
            className="h-auto shrink-0 border-production-amber/30 bg-production-amber/10 px-1.5 py-0.5 text-[9px] text-warning-text"
          >
            {cumProgress !== null && cumProgress !== undefined
              ? `${copy.kpi.cumulative ?? 'Lũy kế'}: ${formatPercent(cumProgress, 1)}`
              : `${copy.kpi.goal}: ${formatNumber(goal)} PCS`}
          </Badge>
        </CardContent>
      ) : (
        <div className="pb-2" aria-hidden="true" />
      )}
    </Card>
  );
}

export const KpiCards = memo(function KpiCards({
  summary,
  selectedWo,
  loading,
  error,
  uphTargetState = null,
  onRetry,
  copy,
}) {
  if (loading && !summary) return <LoadingCards copy={copy} />;
  if (error || !summary)
    return <SummaryError message={copy.errors.summary} copy={copy} onRetry={onRetry} />;

  // Tổng Input và Tổng Output toàn công đơn
  const totalWoInput = summary.cumInput ?? summary.totalInput;
  const totalWoOutput = summary.cumOutput ?? summary.totalOutput;
  const totalWoPlan =
    summary.planInput > 0 ? summary.planInput : (summary.planQty ?? summary.planOutput ?? 0);

  // Luôn tính Tỷ lệ đạt kế hoạch trên TOÀN BỘ CÔNG ĐƠN theo đúng chuẩn bản mẫu:
  // Tỷ lệ = (Lũy kế hoàn thành cả đơn / Kế hoạch toàn đơn) * 100%
  const totalPlan = totalWoPlan;
  const orderAchievement = totalPlan > 0 ? calculateAchievement(totalWoOutput, totalPlan) : 0;
  const achievement = orderAchievement;

  const cards = [
    {
      icon: Package,
      title: copy.kpi.input,
      value: formatNumber(totalWoInput),
      unit: 'PCS',
      detail: `${copy.kpi.plan}: ${formatNumber(totalWoPlan)} PCS`,
      subDetail:
        summary.totalInput > 0 ? `Trong ca: ${formatNumber(summary.totalInput)} PCS` : null,
      color: 'blue',
    },
    {
      icon: PackageCheck,
      title: copy.kpi.output,
      value: formatNumber(totalWoOutput),
      unit: 'PCS',
      detail: `${copy.kpi.plan}: ${formatNumber(totalWoPlan)} PCS`,
      subDetail:
        summary.totalOutput > 0 ? `Trong ca: ${formatNumber(summary.totalOutput)} PCS` : null,
      color: 'green',
    },
    {
      icon: Gauge,
      title: copy.kpi.uph,
      value: formatNumber(summary.actualUph),
      unit: 'PCS/H',
      detail:
        uphTargetState === 'missing'
          ? `${copy.kpi.uphTarget}: ${copy.kpi.uphTargetMissing}`
          : uphTargetState === 'error'
            ? `${copy.kpi.uphTarget}: ${copy.kpi.uphTargetError}`
            : `${copy.kpi.uphTarget}: ${formatNumber(summary.targetUph)} PCS/H`,
      color: 'violet',
    },
    {
      icon: Target,
      title: copy.kpi.achievement,
      value: formatPercent(achievement, 1),
      color: 'amber',
      achievement,
      goal: totalPlan,
      cumProgress: null, // Hiển thị "Mục tiêu: X PCS" chuẩn bản mẫu, bỏ chữ "Lũy kế"
    },
  ];

  return (
    <section
      aria-label={copy.kpi.achievement}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3"
    >
      <MoInfoCard selectedWo={selectedWo} copy={copy} />
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} copy={copy} />
      ))}
    </section>
  );
});
