import { memo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  calculateYield,
  getAchievementColor,
  getStatusTone,
  getStationWip,
  getWipLimit,
} from '@/features/production-dashboard/lib/calc';
import { formatNumber, formatPercent } from '@/lib/format';

const BASE_COLUMNS = 12;
const BASE_MIN_WIDTH = 1042;
const SLOT_MIN_WIDTH = 68;

function InlineError({ children, action }) {
  return (
    <div
      role="alert"
      className="flex min-h-10 w-full items-center gap-2 px-3 text-xs font-medium text-danger-text"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

function TableLoadingRows({ lineConfig, columns }) {
  return lineConfig.stations.map((station) => (
    <TableRow key={station.id} className="h-6 border-border/50">
      {Array.from({ length: columns }, (_, index) => (
        <TableCell key={`${station.id}-${index}`} className="px-1.5 py-0.5">
          <Skeleton
            className={cn(
              'h-3 bg-foreground/10',
              index >= 2 && 'mx-auto',
              index === 1 ? 'w-24' : 'w-10'
            )}
          />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function AchievementCell({ value, slotState, label }) {
  if (slotState === 'future' || value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span
      className={cn(
        'flex min-h-6 w-full items-center justify-center rounded px-1 font-semibold tabular-nums',
        getAchievementColor(value),
        slotState === 'current' && 'ring-1 ring-inset ring-production-blue/70'
      )}
      aria-label={`${label}: ${Math.round(value)}%`}
    >
      {Math.round(value)}%
    </span>
  );
}

function NgCell({ station, copy }) {
  const ng = station.ngQty;
  const ngAll = station.ngAll;
  const tip = copy.table.ngTip;
  const parts = [];

  if (ng !== null) parts.push(`${tip.current}: ${formatNumber(ng)}`);
  if (station.ngEvents !== null) parts.push(`${tip.events}: ${formatNumber(station.ngEvents)}`);
  if (ngAll !== null && ngAll !== ng) parts.push(`${tip.all}: ${formatNumber(ngAll)}`);
  if (station.ngRate !== null) parts.push(`${tip.rate}: ${formatPercent(station.ngRate)}`);

  const showAll = ngAll !== null && ng !== null && ngAll !== ng;

  // Trạm không có NG thì không cần tooltip toàn số 0.
  const hasNg = (ng ?? 0) > 0 || (station.ngEvents ?? 0) > 0 || (ngAll ?? 0) > 0;

  return (
    <span
      className="inline-flex items-baseline justify-center gap-0.5"
      title={hasNg && parts.length ? parts.join(' · ') : undefined}
    >
      <span>{formatNumber(ng)}</span>
      {showAll ? (
        <span className="text-[9px] font-normal text-muted-foreground">
          ({formatNumber(ngAll)})
        </span>
      ) : null}
    </span>
  );
}

function StatusCell({ station, copy, statusError }) {
  if (statusError) return <span className="text-muted-foreground">—</span>;
  if (!station.status) return <span className="text-muted-foreground">{copy.status.UNKNOWN}</span>;

  const tone = getStatusTone(station.status);

  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
      <Badge variant="outline" className={cn('h-5 max-w-full px-1.5 text-[10px]', tone.badge)}>
        <span className={cn('size-2 shrink-0 rounded-full', tone.dot)} aria-hidden="true" />
        <span className="truncate">{copy.status[station.status] || copy.status.UNKNOWN}</span>
      </Badge>
    </div>
  );
}

export const StationTable = memo(function StationTable({
  lineConfig,
  stations,
  summary,
  slots,
  slotStates,
  bottleneckId,
  loading,
  error,
  hourlyError,
  statusError,
  uphTargetState = null,
  onRetry,
  copy,
}) {
  const slotColumns = (slots ?? [])
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.empty);
  const slotColumnCount = Math.max(1, slotColumns.length);
  const totalColumns = BASE_COLUMNS + slotColumns.length;

  const tableMinWidth = BASE_MIN_WIDTH + SLOT_MIN_WIDTH * slotColumns.length;

  if (loading && !stations.some((station) => station.actualOutput !== undefined)) {
    return (
      <Card className="relative min-h-50 overflow-hidden border border-border-strong bg-card py-0 ring-0">
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/50 backdrop-blur-[1px]">
          <Loader2 className="size-8 animate-spin text-production-blue" />
          <span className="text-xs font-medium text-muted-foreground">{copy.loadingStations}</span>
        </div>
        <CardContent className="min-h-0 p-0">
          <div className="flex h-full min-w-0 flex-col overflow-hidden">
            <div className="scrollbar-clean min-h-0 flex-1 overflow-auto [&_[data-slot=table-container]]:h-full">
              <Table
                className="h-full w-full table-fixed text-[10px] 2xl:text-xs"
                style={{ minWidth: `${tableMinWidth}px` }}
              >
                <TableHeader>
                  <TableRow className="border-border bg-surface-overlay">
                    <TableHead
                      colSpan={totalColumns}
                      className="h-9 text-center text-muted-foreground"
                    >
                      {copy.loading}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableLoadingRows lineConfig={lineConfig} columns={totalColumns} />
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="min-h-0 overflow-hidden border border-danger/30 bg-card py-0 ring-0">
        <CardContent className="flex h-full min-h-14 items-center p-0">
          <InlineError
            action={
              onRetry ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-danger/40 text-danger-text hover:bg-danger/10 hover:text-danger-text"
                  onClick={onRetry}
                >
                  {copy.retry}
                </Button>
              ) : null
            }
          >
            {copy.errors.stations}
          </InlineError>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-0 overflow-hidden border border-border-strong bg-card py-0 ring-0">
      <CardContent className="min-h-0 p-0">
        <div className="scrollbar-clean min-h-0 h-full overflow-auto [&_[data-slot=table-container]]:h-full">
          <Table
            className="h-full w-full table-fixed text-[10px] 2xl:text-xs"
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <TableCaption className="sr-only">{copy.table.caption}</TableCaption>
            <TableHeader className="sticky top-0 z-20 bg-[var(--surface-overlay)] [&_th]:border-l [&_th]:border-border/70 [&_tr:first-of-type_th:first-child]:border-l-0 [&_th]:whitespace-normal [&_th]:break-words [&_th]:leading-tight">
              <TableRow className="border-b border-border-strong bg-[var(--surface-overlay)] hover:bg-[var(--surface-overlay)]">
                <TableHead
                  rowSpan={2}
                  className="sticky left-0 z-30 w-16 border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-left text-[10px] text-foreground 2xl:text-xs"
                >
                  {copy.table.station}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="sticky left-16 z-30 w-35 border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-left text-[10px] text-foreground 2xl:text-xs"
                >
                  {copy.table.process}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-22 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.planInput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-23 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.actualInput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-22 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.planOutput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-23 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.actualOutput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-18 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.targetUph}
                  {uphTargetState ? (
                    <span className="mt-0.5 block text-[8px] font-normal text-warning-text">
                      {uphTargetState === 'error'
                        ? copy.kpi.uphTargetError
                        : copy.kpi.uphTargetMissing}
                    </span>
                  ) : null}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-18 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.actualUph}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-17 bg-[var(--surface-overlay)] px-1 text-center text-foreground"
                >
                  {copy.table.wip}
                </TableHead>
                <TableHead
                  colSpan={slotColumnCount}
                  className="h-8 bg-[var(--surface-overlay)] px-1 text-center text-[10px] text-foreground 2xl:text-xs"
                >
                  <span>{copy.table.achievement}</span>
                  {hourlyError ? (
                    <span className="ml-2 text-[9px] text-danger-text">{copy.errors.hourly}</span>
                  ) : null}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-17 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.yield}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  title={`${copy.table.ng} — ${copy.table.ngTip.current} · (${copy.table.ngTip.all})`}
                  className="w-16 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.ng}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-29 bg-[var(--surface-overlay)] px-1.5 text-center text-[10px] text-foreground 2xl:text-xs"
                >
                  <span>{copy.table.status}</span>
                  {statusError ? (
                    <span className="mt-0.5 block text-[8px] font-normal text-danger-text">
                      {copy.table.statusUnavailable}
                    </span>
                  ) : null}
                </TableHead>
              </TableRow>
              <TableRow className="border-b border-border-strong bg-[var(--surface-overlay)] hover:bg-[var(--surface-overlay)]">
                {slotColumns.map(({ slot, index }) => (
                  <TableHead
                    key={slot.id}
                    scope="col"
                    aria-label={
                      slotStates[index] === 'current'
                        ? `${slot.label}, ${copy.table.current}`
                        : slot.label
                    }
                    className={cn(
                      'h-6 w-17 bg-[var(--surface-overlay)] px-1 text-center text-[10px] text-muted-foreground',
                      slotStates[index] === 'current' &&
                        'bg-production-blue/15 text-production-blue'
                    )}
                  >
                    <span>{slot.label}</span>
                    {slotStates[index] === 'current' ? (
                      <span className="sr-only">{copy.table.current}</span>
                    ) : null}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {stations.length ? (
                stations.map((station, index) => {
                  const stationConfig = lineConfig.stations[index];
                  const wip = getStationWip(station, index, stations, summary);
                  const wipLimit = getWipLimit(stationConfig);
                  const wipOverLimit = wip !== null && wip > wipLimit;
                  const yieldPercent =
                    station.yield ??
                    calculateYield(station.firstPass, station.actualInput, station.actualOutput);
                  const isBottleneck = station.stationId === bottleneckId;

                  return (
                    <TableRow
                      key={station.stationId}
                      className={cn(
                        'group h-6 border-border/50 bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
                        isBottleneck && 'bg-danger/5 hover:bg-danger/10'
                      )}
                    >
                      <TableCell className="sticky left-0 z-10 w-16 bg-[var(--surface)] px-1.5 py-0.5 text-left font-semibold text-foreground group-hover:bg-[var(--surface-hover)]">
                        {station.stationId}
                        {isBottleneck ? (
                          <span className="sr-only">{copy.charts.bottleneck}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="sticky left-16 z-10 w-35 max-w-35 border-r border-border-strong/70 bg-[var(--surface)] px-1.5 py-0.5 text-left text-foreground group-hover:bg-[var(--surface-hover)]">
                        <span className="block truncate text-left" title={stationConfig.name}>
                          {stationConfig.name}
                        </span>
                        {station.lines?.length > 1 ? (
                          <span
                            className="block truncate text-[8px] font-normal text-muted-foreground"
                            title={station.lines.join(', ')}
                          >
                            {station.lines.join(' · ')}
                          </span>
                        ) : null}
                        {isBottleneck ? (
                          <span className="text-[8px] font-semibold text-danger-text">
                            {copy.flow.bottleneck}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                        {formatNumber(station.planInput)}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-foreground">
                        {formatNumber(station.actualInput)}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                        {formatNumber(station.planOutput)}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums font-medium text-foreground">
                        {formatNumber(station.actualOutput)}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                        {formatNumber(station.targetUph)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-1 py-0.5 text-center tabular-nums font-semibold text-foreground',
                          isBottleneck && 'text-danger-text'
                        )}
                      >
                        {formatNumber(station.actualUph)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'px-1 py-0.5 text-center tabular-nums',
                          wipOverLimit ? 'font-semibold text-danger-text' : 'text-foreground'
                        )}
                      >
                        {wip === null ? '—' : formatNumber(wip)}
                        {wipOverLimit ? (
                          <span className="sr-only">
                            {copy.flow.limit}: {formatNumber(wipLimit)}
                          </span>
                        ) : null}
                      </TableCell>
                      {slotColumns.map(({ slot, index: slotIndex }) => (
                        <TableCell
                          key={`${station.stationId}-${slot.id}`}
                          className={cn(
                            'px-1 py-0.5 text-center',
                            slotStates[slotIndex] === 'current' && 'bg-production-blue/5',
                            wipOverLimit && 'border-y border-danger/10'
                          )}
                        >
                          {hourlyError ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <AchievementCell
                              value={station.hourlyAchievement?.[slotIndex]}
                              slotState={slotStates[slotIndex]}
                              label={slot.label}
                            />
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-success-text">
                        {yieldPercent === null ? '-' : `${formatPercent(yieldPercent)}`}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-foreground">
                        <NgCell station={station} copy={copy} />
                      </TableCell>
                      <TableCell className="px-1.5 py-0.5 text-center">
                        <StatusCell station={station} copy={copy} statusError={statusError} />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={totalColumns}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {copy.table.noStations}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});
