import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { cn } from '@/core/utils/utils';
import { TableBody, TableCell, TableHead, TableRow } from '@/components/ui/table';
import { EMPTY_DASH, formatInt, formatNumber, formatPercent } from '@/core/utils/format';
import { AchievementBar, StatusBadge } from './StatusBadge';

export function LineTable({ lines, className }) {
  const { t } = useTranslation();

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border bg-surface', className)}>
      <table className="w-full min-w-[1180px] table-fixed border-collapse text-sm">
        <caption className="sr-only">{t('table.caption')}</caption>
        <thead className="sticky top-0 z-10">
          <TableRow className="border-b border-border bg-surface">
            <TableHead className="w-[9%] text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.line')}
            </TableHead>
            <TableHead className="w-[13%] text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.area')}
            </TableHead>
            <TableHead className="w-[10%] text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.model')}
            </TableHead>
            <TableHead className="w-[11%] text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.workOrder')}
            </TableHead>
            <TableHead className="w-[8%] text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.actual')}
            </TableHead>
            <TableHead className="w-[10%] text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.target')}
            </TableHead>
            <TableHead className="w-[14%] text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.achievement')}
            </TableHead>
            <TableHead className="w-[9%] text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.uph')}
            </TableHead>
            <TableHead className="w-[6%] text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.yield')}
            </TableHead>
            <TableHead className="w-[5%] text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.failures')}
            </TableHead>
            <TableHead className="w-[15%] text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('table.status')}
            </TableHead>
          </TableRow>
        </thead>
        <TableBody className="divide-y divide-border">
          {lines.map((line) => (
            <LineRow key={line.lineId} line={line} />
          ))}
        </TableBody>
      </table>
    </div>
  );
}

function LineRow({ line }) {
  const detailHref = `/overview/line/${encodeURIComponent(line.lineId)}`;

  return (
    <TableRow className="relative h-10 border-b border-border transition-colors hover:bg-surface-hover">
      <TableCell className="relative truncate px-2 py-1.5">
        <Link
          to={detailHref}
          className="font-medium text-foreground underline-offset-4 after:absolute after:inset-0 after:content-[''] outline-hidden"
        >
          {line.lineId}
        </Link>
      </TableCell>

      <TableCell
        className="relative truncate px-2 py-1.5 text-muted-foreground"
        title={line.areaName}
      >
        {line.areaName}
      </TableCell>

      <TableCell className="relative truncate px-2 py-1.5 font-mono text-xs" title={line.model}>
        {line.model}
      </TableCell>

      <TableCell className="relative truncate px-2 py-1.5 font-mono text-xs">
        {line.workOrderNo ?? <span className="text-muted-foreground">{EMPTY_DASH}</span>}
      </TableCell>

      <TableCell className="relative px-2 py-1.5 text-right table-nums font-medium">
        {formatInt(line.passCount)}
      </TableCell>

      <TableCell className="relative px-2 py-1.5 text-right table-nums text-muted-foreground">
        {formatInt(line.targetSoFar)}
      </TableCell>

      <TableCell className="relative px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right table-nums font-medium">
            {formatPercent(line.achievement)}
          </span>
          <AchievementBar
            achievement={line.achievement}
            lineId={line.lineId}
            className="min-w-8 flex-1"
          />
        </div>
      </TableCell>

      <TableCell className="relative px-2 py-1.5 text-right table-nums text-muted-foreground">
        {line.currentUph === null ? EMPTY_DASH : formatNumber(line.currentUph, 1)}
      </TableCell>

      <TableCell className="relative px-2 py-1.5 text-right table-nums text-muted-foreground">
        {formatPercent(line.yield)}
      </TableCell>

      <TableCell className="relative px-2 py-1.5 text-right table-nums">
        {line.failCount > 0 ? (
          <span className="font-medium text-error-strong">{formatInt(line.failCount)}</span>
        ) : (
          <span className="text-muted-foreground">{EMPTY_DASH}</span>
        )}
      </TableCell>

      <TableCell className="relative px-2 py-1.5">
        <StatusBadge status={line.status} size="md" />
      </TableCell>
    </TableRow>
  );
}
