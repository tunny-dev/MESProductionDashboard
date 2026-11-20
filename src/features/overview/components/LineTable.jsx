import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ArrowUpRight } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { EMPTY_DASH, formatInt, formatNumber, formatPercent } from '@/core/utils/format';
import { AchievementBar } from '@/features/overview/components/StatusBadge';

export function LineTable({ lines, className }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-border bg-surface shadow-xs',
        className
      )}
    >
      <table className="w-full min-w-7xl table-fixed border-collapse border border-border text-sm">
        <caption className="sr-only">{t('table.caption')}</caption>
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-xs">
          <tr>
            <th className="w-[4%] border border-border px-2 py-2.5 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.stt', 'STT')}
            </th>
            <th className="w-[8%] border border-border px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.stage', 'Công đoạn')}
            </th>
            <th className="w-[14%] border border-border px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.line', 'Line')}
            </th>
            <th className="w-[18%] border border-border px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.model', 'Model')} / SKU
            </th>
            <th className="w-[13%] border border-border px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.workOrder', 'Công lệnh')}
            </th>
            <th className="w-[8%] border border-border px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.actual', 'Thực tế')}
            </th>
            <th className="w-[8%] border border-border px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.target', 'Target đến giờ')}
            </th>
            <th className="w-[12%] border border-border px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.achievement', '% Đạt')}
            </th>
            <th className="w-[7%] border border-border px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.uph', 'Giờ này / UPH')}
            </th>
            <th className="w-[6%] border border-border px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.yield', 'Yield')}
            </th>
            <th className="w-[5%] border border-border px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.failures', 'Lỗi')}
            </th>
            <th className="w-[5%] border border-border px-3 py-2.5 text-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {t('table.actions', 'Thao tác')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <LineRow key={line.lineId} line={line} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineRow({ line, index }) {
  const { t } = useTranslation();
  const detailHref = `/overview/line/${encodeURIComponent(line.lineId)}`;
  const dashboardHref = `/production-dashboard?line=${encodeURIComponent(line.lineId)}${
    line.workOrderNo ? `&mo=${encodeURIComponent(line.workOrderNo)}` : ''
  }`;

  const displayName = line.lineName || line.lineId;
  const hasDistinctCode = line.lineName && line.lineName !== line.lineId;

  return (
    <tr className="relative h-13 transition-colors hover:bg-muted/40">
      {/* Cột 1: STT */}
      <td className="relative border border-border px-2 py-2 text-center table-nums text-xs font-semibold text-muted-foreground">
        {index + 1}
      </td>

      {/* Cột 2: Công đoạn (Khu vực / Area) */}
      <td className="relative border border-border px-3 py-2">
        <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-muted px-2 py-0.5 text-xs font-semibold text-foreground">
          {line.areaName || line.areaId}
        </span>
      </td>

      {/* Cột 3: Tên Chuyền + Mã Chuyền */}
      <td className="relative border border-border px-3 py-2">
        <div className="flex flex-col">
          <Link
            to={detailHref}
            className="flex items-center gap-1.5 font-semibold text-foreground underline-offset-4 outline-hidden hover:text-primary hover:underline"
          >
            <span>{displayName}</span>
            {hasDistinctCode && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                {line.lineId}
              </span>
            )}
          </Link>
          {line.minutesSinceLastScan !== null && line.minutesSinceLastScan !== undefined && (
            <span className="text-[11px] text-muted-foreground">
              {line.minutesSinceLastScan <= 1
                ? t('freshness.justNow', 'Vừa xong')
                : `${line.minutesSinceLastScan} ${t('units.minutesAgo', 'phút trước')}`}
            </span>
          )}
        </div>
      </td>

      {/* Cột 4: Model / SKU */}
      <td
        className="relative border border-border px-3 py-2"
        title={line.productName || line.model}
      >
        <div className="flex flex-col">
          <span className="font-mono text-xs font-semibold text-foreground">
            {line.model || <span className="text-muted-foreground">{EMPTY_DASH}</span>}
          </span>
          {line.productName && (
            <span className="truncate text-[11px] text-muted-foreground">{line.productName}</span>
          )}
        </div>
      </td>

      {/* Cột 5: Công lệnh (Work Order) */}
      <td className="relative border border-border px-3 py-2">
        <div className="flex flex-col">
          <span className="font-mono text-xs font-medium text-foreground">
            {line.workOrderNo ?? <span className="text-muted-foreground">{EMPTY_DASH}</span>}
          </span>
          {line.workOrder?.planQty > 0 && (
            <span className="text-[11px] text-muted-foreground table-nums">
              {t('table.plan', 'Kế hoạch')}: {formatInt(line.workOrder.planQty)}
            </span>
          )}
        </div>
      </td>

      {/* Cột 6: Thực tế (Actual) */}
      <td className="relative border border-border px-3 py-2 text-right table-nums">
        <span className="text-sm font-bold text-foreground">{formatInt(line.passCount)}</span>
      </td>

      {/* Cột 7: Target đến giờ */}
      <td className="relative border border-border px-3 py-2 text-right table-nums text-muted-foreground font-medium">
        {formatInt(line.targetSoFar)}
      </td>

      {/* Cột 8: Tỷ lệ đạt (% Achievement) */}
      <td className="relative border border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-right table-nums text-xs font-semibold text-foreground">
            {formatPercent(line.achievement)}
          </span>
          <AchievementBar
            achievement={line.achievement}
            lineId={line.lineId}
            className="min-w-8 flex-1"
          />
        </div>
      </td>

      {/* Cột 9: UPH */}
      <td className="relative border border-border px-3 py-2 text-right table-nums font-medium text-foreground">
        {line.currentUph === null ? EMPTY_DASH : formatNumber(line.currentUph, 1)}
      </td>

      {/* Cột 10: Yield */}
      <td className="relative border border-border px-3 py-2 text-right table-nums font-medium text-foreground">
        {formatPercent(line.yield)}
      </td>

      {/* Cột 11: Lỗi (Failures) */}
      <td className="relative border border-border px-3 py-2 text-right table-nums">
        {line.failCount > 0 ? (
          <span className="rounded bg-error/10 px-1.5 py-0.5 text-xs font-bold text-error-strong">
            {formatInt(line.failCount)}
          </span>
        ) : (
          <span className="text-muted-foreground">{EMPTY_DASH}</span>
        )}
      </td>

      {/* Cột 12: Thao tác */}
      <td className="relative z-20 border border-border px-3 py-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <Link
            to={dashboardHref}
            onClick={(e) => e.stopPropagation()}
            title={t('table.viewDashboard', 'Xem Production Dashboard')}
            aria-label={t('table.viewDashboard')}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <LayoutDashboard className="size-3.5" />
          </Link>
          <Link
            to={detailHref}
            title={t('table.viewDetail', 'Chi tiết')}
            aria-label={t('table.viewDetail')}
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
