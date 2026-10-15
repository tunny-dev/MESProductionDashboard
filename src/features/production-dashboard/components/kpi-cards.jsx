import { memo } from 'react';
import { Gauge, Package, PackageCheck, Target, ClipboardList } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  calculateAchievement,
  formatNumber,
  formatPercent,
  getAchievementColor,
} from '@/features/production-dashboard/lib/calc';

/** 'yyyyMMdd' → 'dd/MM' cho dòng "Chạy 30/09 → 14/10". */
function formatYmdShort(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{8}$/.test(s)) return String(value ?? '');
  return `${s.slice(6, 8)}/${s.slice(4, 6)}`;
}

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

function LoadingCards() {
  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3"
      aria-label="Loading production KPIs"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Card
          key={index}
          className="h-full min-h-[96px] gap-0 border border-border bg-card py-0 ring-0 xl:min-h-[100px]"
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

function SummaryError({ message }) {
  return (
    <Card className="flex min-h-[96px] items-center border border-danger/35 bg-danger/5 ring-0 xl:min-h-[100px]">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <Target className="size-5 shrink-0 text-danger-text" aria-hidden="true" />
        <p role="alert" className="text-sm font-medium text-danger-text">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}

function MoInfoCard({ selectedWo, copy }) {
  const style = cardStyles.blue;
  return (
    <Card
      className={cn(
        'h-full min-h-[96px] gap-0 overflow-hidden border bg-card py-0 ring-0 xl:min-h-[100px]',
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
              <p className="truncate text-xs text-muted-foreground" title={selectedWo.partNumber ?? ''}>
                {copy.kpi.partNumber}: {selectedWo.partNumber ?? '—'}
              </p>
              <p className="truncate text-xs text-muted-foreground" title={selectedWo.modelName ?? ''}>
                {copy.kpi.modelName}: {selectedWo.modelName ?? '—'}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">{copy.kpi.noWo}</p>
          )}
        </div>
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', style.icon)}>
          <ClipboardList className="size-5" aria-hidden="true" />
        </div>
      </CardHeader>
      <div className="pb-3" aria-hidden="true" />
    </Card>
  );
}

function KpiCard({ icon: Icon, title, value, unit, detail, color, achievement, goal, copy }) {
  const style = cardStyles[color];
  const achievementClass = achievement === undefined ? '' : getAchievementColor(achievement);
  const achievementTextClass = achievementClass
    .split(' ')
    .find((className) => className.startsWith('text-'));

  return (
    <Card
      className={cn(
        'h-full min-h-[96px] gap-0 overflow-hidden border bg-card py-0 ring-0 xl:min-h-[100px]',
        style.surface
      )}
    >
      <div aria-hidden className={cn('h-1 w-full shrink-0', style.strip)} />
      <CardHeader className="flex min-w-0 flex-row items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground 2xl:text-xs">
            {title}
          </CardTitle>
          <p className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2">
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
          {detail ? (
            <p className="mt-1.5 truncate text-xs tabular-nums text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <div
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', style.icon)}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardHeader>

      {achievement !== undefined ? (
        <CardContent className="flex items-center gap-2 px-4 pt-2 pb-3">
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
            {copy.kpi.goal}: {formatNumber(goal)} PCS
          </Badge>
        </CardContent>
      ) : (
        <div className="pb-3" aria-hidden="true" />
      )}
    </Card>
  );
}

export const KpiCards = memo(function KpiCards({
  summary,
  selectedWo,
  loading,
  error,
  scope = 'DAY',
  copy,
}) {
  if (loading && !summary) return <LoadingCards />;
  if (error || !summary) return <SummaryError message={copy.errors.summary} />;

  // Phạm vi 'Cả WO': kế hoạch MF008 là của CẢ WO nên lúc này mới so được.
  // Ở phạm vi 'Ca này' mà đem nhân với MF008 sẽ ra tỷ lệ thấp vô lý — WO chạy
  // 14 ngày thì mỗi ca chỉ được ~7% dù cả WO đã vượt kế hoạch.
  const showWoProgress = scope === 'WO';
  const woPercent = calculateAchievement(summary.totalOutput, summary.planOutput);
  const woSpan =
    summary.woStartDate && summary.woEndDate && summary.woDayCount
      ? copy.woProgress.span(
          formatYmdShort(summary.woStartDate),
          formatYmdShort(summary.woEndDate),
          summary.woDayCount
        )
      : null;

  const achievement = showWoProgress
    ? woPercent
    : (summary.achievement ?? calculateAchievement(summary.totalOutput, summary.planOutput));

  const cards = [
    {
      icon: Package,
      title: copy.kpi.input,
      value: formatNumber(summary.totalInput),
      unit: 'PCS',
      detail: `${copy.kpi.plan}: ${formatNumber(summary.planInput)} PCS`,
      color: 'blue',
    },
    {
      icon: PackageCheck,
      title: copy.kpi.output,
      value: formatNumber(summary.totalOutput),
      unit: 'PCS',
      detail: showWoProgress && woSpan ? woSpan : `${copy.kpi.plan}: ${formatNumber(summary.planOutput)} PCS`,
      color: 'green',
    },
    {
      icon: Gauge,
      title: copy.kpi.uph,
      value: formatNumber(summary.actualUph),
      unit: 'PCS/H',
      detail: `${copy.kpi.uphTarget}: ${formatNumber(summary.targetUph)} PCS/H`,
      color: 'violet',
    },
    {
      icon: Target,
      // Phạmvi 'Cả WO' thì con số này là tiến độ của cả WO, không phải tỷ lệ
      // đạt kế hoạch của ca — gọi đúng tên tránh đọc nhầm.
      title: showWoProgress ? copy.woProgress.title : copy.kpi.achievement,
      value: formatPercent(achievement, 1),
      color: 'amber',
      achievement,
      goal: summary.planOutput,
    },
  ];

  return (
    <section
      aria-label={copy.kpi.achievement}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3"
    >
      {/* MO info card — luôn render đầu tiên */}
      <MoInfoCard selectedWo={selectedWo} copy={copy} />
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} copy={copy} />
      ))}
    </section>
  );
});
