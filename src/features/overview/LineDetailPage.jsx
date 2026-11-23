import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  LayoutDashboard,
  Layers,
  Target,
  TrendingUp,
  Percent,
  Clock,
} from 'lucide-react';

import { cn } from '@/core/utils/utils';
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
import { CumulativeChart } from '@/features/overview/components/CumulativeChart';
import { StatusBadge } from '@/features/overview/components/StatusBadge';
import { RefetchBar } from '@/features/overview/components/DataFreshness';
import { useOverviewSnapshot } from '@/hooks/useOverview';
import { buildLineDetailView } from '@/features/overview/utils/snapshotView';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { EMPTY_DASH, formatInt, formatNumber, formatPercent } from '@/core/utils/format';

export function LineDetailPage() {
  const { lineId } = useParams();
  const { t } = useTranslation();
  const { view, isLoading, isFetching, error, failureReason, refetch } = useOverviewSnapshot();
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
        <LoadingOverlay active label={t('freshness.loading', 'Đang tải dữ liệu chuyền…')} />
        <LineDetailSkeleton />
      </div>
    );
  }

  const rawLine = view.lines?.find((l) => l.lineId?.toUpperCase() === lineId?.toUpperCase());

  if (!rawLine) return <LineNotFound lineId={lineId} lines={view.lines} />;

  const detail = buildLineDetailView(rawLine, view.shift, view.currentMinutes);
  const displayName = detail.lineName || detail.lineId;
  const dashboardHref = `/production-dashboard?line=${encodeURIComponent(detail.lineId)}${
    detail.workOrderNo ? `&mo=${encodeURIComponent(detail.workOrderNo)}` : ''
  }`;

  return (
    <div className="relative flex w-full flex-col gap-5 pb-8">
      <header className="rounded-2xl border border-border/80 bg-surface p-5 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Link to="/overview" className="hover:text-primary transition-colors hover:underline">
                {t('overview.pageTitle', 'Tổng quan')}
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground">{displayName}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">{displayName}</h1>
              {detail.lineName && detail.lineName !== detail.lineId && (
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                  {detail.lineId}
                </span>
              )}
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {t('table.stage', 'Công đoạn')}: {detail.areaName || detail.areaId}
              </span>
              <StatusBadge status={detail.status} size="md" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {detail.model && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-muted-foreground">
                    {t('table.model', 'Model')}:
                  </span>
                  <span className="font-mono font-bold text-foreground">{detail.model}</span>
                  {detail.productName && (
                    <span className="text-muted-foreground">({detail.productName})</span>
                  )}
                </div>
              )}
              {detail.workOrderNo && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-muted-foreground">
                    {t('table.workOrder', 'Công lệnh')}:
                  </span>
                  <span className="font-mono font-bold text-foreground">{detail.workOrderNo}</span>
                  {detail.workOrder?.planQty > 0 && (
                    <span className="text-muted-foreground table-nums">
                      ({t('table.plan', 'Kế hoạch')}:{' '}
                      <strong className="text-foreground">
                        {formatInt(detail.workOrder.planQty)}
                      </strong>
                      )
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <LineSwitcher lines={view.lines} currentId={detail.lineId} />
            <Link
              to={dashboardHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 text-xs font-bold text-primary transition-all hover:bg-primary/20"
            >
              <LayoutDashboard className="size-3.5" />
              <span>{t('table.viewDashboard', 'Mở Dashboard')}</span>
            </Link>
            <Link
              to="/overview"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-all hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" />
              <span>{t('lineDetail.backToOverview', 'Quay lại')}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative flex flex-col gap-5">
        <RefetchBar isFetching={isFetching} />
        <LineKpis detail={detail} />
        <CumulativeSection detail={detail} view={view} />
        <HourlyTable detail={detail} />
        <StopInfo detail={detail} />
      </div>
    </div>
  );
}

function LineSwitcher({ lines = [], currentId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Select
        value={currentId}
        onValueChange={(value) => navigate(`/overview/line/${encodeURIComponent(value)}`)}
      >
        <SelectTrigger
          className="h-9 min-w-44 rounded-xl border-border/80 text-xs font-semibold"
          aria-label={t('lineDetail.switchLine', 'Đổi chuyền')}
        >
          <SelectValue placeholder={t('lineDetail.switchLine', 'Đổi chuyền')} />
        </SelectTrigger>
        <SelectContent>
          {lines.map((line) => (
            <SelectItem key={line.lineId} value={line.lineId}>
              <span className="font-medium">{line.lineName || line.lineId}</span>
              {line.lineName && line.lineName !== line.lineId && (
                <span className="ml-1.5 text-muted-foreground font-mono text-[10px]">
                  ({line.lineId})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LineKpis({ detail }) {
  const { t } = useTranslation();

  const tiles = [
    {
      label: t('lineDetail.actual', 'Sản lượng thực tế'),
      value: formatInt(detail.passCount),
      hint: `${t('chartLabels.targetLabel', 'Target')} ${formatInt(detail.targetSoFar)}`,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      label: t('lineDetail.achievement', '% Hoàn thành'),
      value: formatPercent(detail.achievement),
      hint: t('lineDetail.thresholdHint', { threshold: detail.atRiskThreshold }) || 'Chỉ tiêu ≥90%',
      icon: Percent,
      color: (detail.achievement ?? 0) >= 90 ? 'text-emerald-500' : 'text-amber-500',
    },
    {
      label: t('lineDetail.currentHour', 'UPH hiện tại'),
      value: detail.currentUph === null ? EMPTY_DASH : formatNumber(detail.currentUph, 1),
      hint: detail.isResting
        ? t('lineDetail.inRest', 'Đang giờ nghỉ')
        : t('lineDetail.currentHourHint', 'Sản phẩm/giờ'),
      icon: Clock,
      color: 'text-indigo-500',
    },
    {
      label: t('lineDetail.yield', 'Tỷ lệ đạt (Yield)'),
      value: formatPercent(detail.yield),
      hint: `${formatInt(detail.failCount)} ${t('table.failures', 'Lỗi')}`,
      icon: Target,
      color: detail.failCount > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: t('lineDetail.plannedUph', 'UPH Kế hoạch'),
      value: formatNumber(detail.plannedUph, 0),
      hint: `${t('lineDetail.fullShiftTarget', 'Target cả ca')}: ${formatInt(detail.targetFullShift)}`,
      icon: Layers,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <section
      aria-label={t('lineDetail.kpiLabel', 'Chỉ số line')}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div
            key={tile.label}
            className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tile.label}
              </span>
              <Icon className={cn('size-4', tile.color)} />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-extrabold table-nums text-foreground">{tile.value}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{tile.hint}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function CumulativeSection({ detail, view }) {
  return (
    <section className="overflow-hidden rounded-2xl">
      <CumulativeChart
        points={detail.cumulative}
        shift={view.shift}
        currentMinutes={view.currentMinutes}
      />
    </section>
  );
}

function HourlyTable({ detail }) {
  const { t } = useTranslation();

  const rows = detail.buckets?.filter((bucket) => !bucket.isFuture) ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-2xs">
      <header className="flex items-center justify-between gap-2 border-b border-border/80 bg-muted/40 px-5 py-3.5">
        <h3 className="text-sm font-bold text-foreground">
          {t('lineDetail.hourlyTitle', 'Sản lượng chi tiết theo khung giờ')}
        </h3>
        <span className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {t('lineDetail.countHours', { count: formatInt(rows.length) })}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 border-collapse border border-border text-sm [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border">
          <thead>
            <tr className="bg-muted/60">
              <th className="w-[6%] px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">
                {t('table.stt', 'STT')}
              </th>
              <th className="w-[18%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                {t('lineDetail.hourBucket', 'Khung giờ')}
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">
                {t('table.actual', 'Thực tế')}
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">
                {t('chartLabels.targetLabel', 'Mục tiêu')}
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">
                {t('lineDetail.gap', 'Chênh lệch')}
              </th>
              <th className="w-[15%] px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">
                {t('table.achievement', '% Đạt')}
              </th>
              <th className="w-[16%] px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">
                {t('lineDetail.note', 'Ghi chú')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bucket, index) => (
              <tr key={bucket.hourMinutes} className="h-10 hover:bg-muted/40 transition-colors">
                <td className="px-3 py-2 text-center table-nums text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-2 table-nums font-semibold text-foreground">
                  {bucket.label}
                </td>
                <td className="px-4 py-2 text-right table-nums font-bold text-foreground">
                  {formatInt(bucket.pass ?? bucket.actual)}
                </td>
                <td className="px-4 py-2 text-right table-nums text-muted-foreground">
                  {formatInt(bucket.target)}
                </td>
                <td className="px-4 py-2 text-right table-nums">
                  <span
                    className={cn(
                      'font-semibold',
                      bucket.gap >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-error-strong'
                    )}
                  >
                    {bucket.gap > 0 ? `+${formatInt(bucket.gap)}` : formatInt(bucket.gap)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right table-nums font-semibold">
                  {formatPercent(bucket.achievement)}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {bucket.isResting && (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400 font-medium">
                      {t('lineDetail.inRest', 'Giờ nghỉ')}
                    </span>
                  )}
                  {bucket.stopMinutes > 0 && (
                    <span className="rounded bg-error/10 px-2 py-0.5 text-error-strong font-medium ml-1">
                      {t('lineDetail.stoppedMins', { count: bucket.stopMinutes })}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StopInfo({ detail }) {
  const { t } = useTranslation();

  if (!detail.activeStop && !detail.lastStop) return null;

  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-4 shadow-2xs">
      <h3 className="text-sm font-bold text-foreground">
        {t('lineDetail.stopInfoTitle', 'Thông tin dừng chuyền')}
      </h3>
      {detail.activeStop && (
        <div className="mt-2 rounded-lg bg-error/10 p-3 text-xs text-error-strong font-medium">
          {t('lineDetail.activeStopAlert', {
            reason: detail.activeStop.reason || t('lineDetail.unknownReason'),
            duration: detail.activeStop.durationMinutes,
          })}
        </div>
      )}
    </section>
  );
}

function LineError({ onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-error-strong font-semibold">{t('error.failedToLoad')}</p>
      <Button onClick={onRetry} variant="outline" size="sm" className="mt-3">
        {t('error.retry')}
      </Button>
    </div>
  );
}

function LineNotFound({ lineId }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-bold text-foreground">
        {t('lineDetail.notFound', 'Không tìm thấy chuyền {lineId}', { lineId })}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('lineDetail.notFoundHint', 'Chuyền này không có trong danh sách phân xưởng hiện tại.')}
      </p>
      <Link to="/overview" className="mt-4">
        <Button variant="outline" size="sm">
          {t('lineDetail.backToOverview', 'Quay lại Tổng quan')}
        </Button>
      </Link>
    </div>
  );
}

function LineDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}
