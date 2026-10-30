import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PauseCircle, RotateCw } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { ErrorPrimaryButton, ErrorScreen } from '@/components/common/ErrorScreen';
import { DataDownScreen } from '@/components/common/DataDownScreen';
import { MAX_CONSECUTIVE_FAILURES, useConsecutiveFailures } from '@/hooks/useConsecutiveFailures';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CumulativeChart } from '@/pages/overview/_components/CumulativeChart';
import { StatusBadge } from '@/pages/overview/_components/StatusBadge';
import { RefetchBar } from '@/pages/overview/_components/DataFreshness';
import { useProductionSnapshot } from '@/hooks/useProduction';
import { buildLineDetailView } from '@/pages/overview/utils/snapshotView';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import {
  EMPTY_DASH,
  formatInt,
  formatNumber,
  formatPercent,
  formatMinutes,
} from '@/core/utils/format';

export function LineDetailPage() {
  const { lineId } = useParams();
  const { t } = useTranslation();
  const { view, isLoading, isFetching, error, failureReason, refetch } = useProductionSnapshot({});
  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

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
  if (error) return <LineError onRetry={refetch} />;
  if (isLoading || !view) {
    return (
      <div className="relative">
        <LoadingOverlay active label={t('freshness.loading')} />
        <LineDetailSkeleton />
      </div>
    );
  }

  const rawLine = view.lines.find((l) => l.lineId === lineId);

  if (!rawLine) return <LineNotFound lineId={lineId} />;

  const detail = buildLineDetailView(rawLine, view.shift, view.currentMinutes);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            to="/overview"
            className="inline-flex h-8 items-center gap-1 text-sm text-muted-foreground underline-offset-4 outline-hidden hover:text-foreground hover:underline"
          >
            <ArrowLeft aria-hidden className="size-4" />
            <BackLabel />
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{detail.lineId}</h2>
            <StatusBadge status={detail.status} size="md" />
          </div>
          <p className="mt-1 max-w-[55ch] text-sm text-pretty text-muted-foreground">
            {detail.areaName} · {t('table.model')} {detail.model}
            {detail.workOrderNo
              ? ` · ${t('table.workOrder')} ${detail.workOrderNo}`
              : ` · ${t('lineDetail.noWorkOrder')}`}
          </p>
        </div>

        <LineSwitcher lines={view.lines} currentId={detail.lineId} />
      </header>

      <div className="relative flex flex-col gap-4">
        <RefetchBar isFetching={isFetching} />
        <LineKpis detail={detail} />
        <CumulativeSection detail={detail} view={view} />
        <HourlyTable detail={detail} />
        <StopInfo detail={detail} />
      </div>
    </div>
  );
}

function LineSwitcher({ lines, currentId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-muted-foreground">{t('lineDetail.switchLine')}</span>
      <Select
        value={currentId}
        onValueChange={(value) => navigate(`/overview/line/${encodeURIComponent(value)}`)}
        items={lines.map((line) => ({ value: line.lineId, label: line.lineId }))}
      >
        <SelectTrigger className="h-9 w-44" aria-label={t('lineDetail.switchLine')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {lines.map((line) => (
            <SelectItem key={line.lineId} value={line.lineId}>
              {line.lineId}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BackLabel() {
  const { t } = useTranslation();
  return t('lineDetail.backToOverview');
}

function LineKpis({ detail }) {
  const { t } = useTranslation();

  const tiles = [
    {
      label: t('lineDetail.actual'),
      value: formatInt(detail.passCount),
      hint: `${t('chartLabels.targetLabel')} ${formatInt(detail.targetSoFar)}`,
    },
    {
      label: t('lineDetail.achievement'),
      value: formatPercent(detail.achievement),
      hint: t('lineDetail.thresholdHint', { threshold: detail.atRiskThreshold }),
    },
    {
      label: t('lineDetail.currentHour'),
      value: detail.currentUph === null ? EMPTY_DASH : formatNumber(detail.currentUph, 1),
      hint: detail.isResting ? t('lineDetail.inRest') : t('lineDetail.currentHourHint'),
    },
    {
      label: t('lineDetail.yield'),
      value: formatPercent(detail.yield),
      hint: t('kpi.failuresSuffix', { count: formatInt(detail.failCount) }),
    },
    {
      label: t('lineDetail.plannedUph'),
      value: formatNumber(detail.plannedUph, 0),
      hint: t('lineDetail.fullShiftTarget', { count: formatInt(detail.targetFullShift) }),
    },
  ];

  return (
    <section
      aria-label={t('lineDetail.kpiLabel')}
      className="rounded-lg border border-border bg-surface"
    >
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="min-w-0 bg-surface p-4">
            <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-xl font-semibold table-nums text-foreground">{tile.value}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{tile.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CumulativeSection({ detail, view }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg border border-border bg-surface">
      <header className="flex flex-col gap-0.5 border-b border-border px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <h3 className="text-base font-semibold text-foreground">
          {t('lineDetail.cumulativeTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {view.shift.name} · {formatMinutes(view.shift.startMinutes)}–
          {formatMinutes(view.shift.endMinutes)}
        </p>
      </header>
      <div className="p-4">
        <CumulativeChart
          points={detail.cumulative}
          shift={view.shift}
          currentMinutes={view.currentMinutes}
        />
        <p className="mt-2 text-xs text-muted-foreground">{t('lineDetail.chartHint')}</p>
      </div>
    </section>
  );
}

function HourlyTable({ detail }) {
  const { t } = useTranslation();

  const rows = detail.buckets.filter((bucket) => !bucket.isFuture);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-foreground">{t('lineDetail.hourlyTitle')}</h3>
        <span className="text-xs text-muted-foreground">
          {t('lineDetail.countHours', { count: formatInt(rows.length) })}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {t('lineDetail.hourBucket')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('table.actual')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('chartLabels.targetLabel')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('lineDetail.gap')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                {t('table.achievement')}
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {t('lineDetail.note')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((bucket) => (
              <tr key={bucket.hourMinutes} className="h-9">
                <td className="px-3 py-1.5 table-nums">{bucket.label}</td>
                <td className="px-3 py-1.5 text-right table-nums font-medium">
                  {formatInt(bucket.actual)}
                </td>
                <td className="px-3 py-1.5 text-right table-nums text-muted-foreground">
                  {formatInt(bucket.target)}
                </td>
                <td
                  className={cn(
                    'px-3 py-1.5 text-right table-nums',
                    bucket.gap >= 0 ? 'text-success-text' : 'text-error-text'
                  )}
                >
                  {bucket.gap > 0 ? '+' : ''}
                  {formatInt(bucket.gap)}
                </td>
                <td className="px-3 py-1.5 text-right table-nums">
                  <span
                    className={cn(
                      bucket.achievement === null
                        ? 'text-muted-foreground'
                        : bucket.achievement >= 90
                          ? 'text-success-text'
                          : 'text-error-text'
                    )}
                  >
                    {formatPercent(bucket.achievement)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  <HourlyNote bucket={bucket} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HourlyNote({ bucket }) {
  const { t } = useTranslation();

  if (bucket.stopMinutes > 0) {
    return (
      <span className="text-error-strong">
        {t('lineDetail.noteStop', { minutes: bucket.stopMinutes })}
      </span>
    );
  }
  if (bucket.restMinutes > 0) {
    return <span>{t('lineDetail.noteRest', { minutes: bucket.restMinutes })}</span>;
  }
  if (bucket.fail > 0) {
    return (
      <span className="text-muted-foreground">
        {t('lineDetail.noteFail', { count: formatInt(bucket.fail) })}
      </span>
    );
  }
  return <span className="text-muted-foreground">{EMPTY_DASH}</span>;
}

function StopInfo({ detail }) {
  const { t } = useTranslation();

  const stops = detail.stops;

  if (stops.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">{t('lineDetail.stopsEmpty')}</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <PauseCircle aria-hidden className="size-4 text-error-strong" />
        <h3 className="text-base font-semibold text-foreground">{t('lineDetail.stopsTitle')}</h3>
      </header>
      <ul className="divide-y divide-border">
        {stops.map((stop) => (
          <li
            key={`${stop.fromMinutes}-${stop.toMinutes}`}
            className="flex items-baseline gap-3 px-4 py-2.5"
          >
            <span className="table-nums text-sm font-medium">
              {formatMinutes(stop.fromMinutes)}–{formatMinutes(stop.toMinutes)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('lineDetail.stopDuration', { count: stop.toMinutes - stop.fromMinutes })}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-pretty">{stop.reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LineNotFound({ lineId }) {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      code="404"
      title={t('error.lineNotFoundTitle', { lineId })}
      message={t('error.lineNotFoundDescription')}
      actions={<ErrorPrimaryButton to="/overview">{t('error.backToLines')}</ErrorPrimaryButton>}
    />
  );
}

function LineError({ onRetry }) {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <div>
        <p className="text-sm font-medium text-error-text">{t('error.loadingLine')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('error.networkLost')}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RotateCw aria-hidden className="size-4" />
        {t('error.retry')}
      </Button>
    </div>
  );
}

function LineDetailSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only" role="status">
        {t('error.loadingLine')}
      </span>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
