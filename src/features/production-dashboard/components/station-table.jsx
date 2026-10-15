import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
  formatNumber,
  formatPercent,
  getAchievementColor,
  getStatusTone,
  getStationWip,
  getWipLimit,
} from '@/features/production-dashboard/lib/calc';

const totalColumns = 19;

function InlineError({ children }) {
  return (
    <div
      role="alert"
      className="flex min-h-10 items-center gap-2 px-3 text-xs font-medium text-danger-text"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function TableLoadingRows({ lineConfig }) {
  return lineConfig.stations.map((station) => (
    <TableRow key={station.id} className="h-6 border-border/50">
      {Array.from({ length: totalColumns }, (_, index) => (
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
  copy,
}) {
  if (loading && !stations.some((station) => station.actualOutput !== undefined)) {
    return (
      <Card className="min-h-0 overflow-hidden border border-border-strong bg-card py-0 ring-0">
        <CardContent className="min-h-0 p-0">
          <div className="flex h-full min-w-0 flex-col overflow-hidden">
            <div className="scrollbar-clean min-h-0 flex-1 overflow-auto [&_[data-slot=table-container]]:h-full">
              <Table className="h-full min-w-[1450px] table-fixed text-[10px] 2xl:text-xs">
                <TableHeader>
                  <TableRow className="border-border bg-[var(--surface-overlay)]">
                    <TableHead
                      colSpan={totalColumns}
                      className="h-9 text-center text-muted-foreground"
                    >
                      {copy.loading}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableLoadingRows lineConfig={lineConfig} />
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
          <InlineError>{copy.errors.stations}</InlineError>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-0 overflow-hidden border border-border-strong bg-card py-0 ring-0">
      <CardContent className="min-h-0 p-0">
        <div className="scrollbar-clean min-h-0 h-full overflow-auto [&_[data-slot=table-container]]:h-full">
          <Table className="h-full min-w-[1450px] table-fixed text-[10px] 2xl:text-xs">
            <TableCaption className="sr-only">{copy.table.caption}</TableCaption>
            <TableHeader className="sticky top-0 z-20 bg-[var(--surface-overlay)] [&_th]:border-l [&_th]:border-border/70 [&_tr:first-of-type_th:first-child]:border-l-0 [&_th]:whitespace-normal [&_th]:break-words [&_th]:leading-tight">
              <TableRow className="border-b border-border-strong bg-[var(--surface-overlay)] hover:bg-[var(--surface-overlay)]">
                <TableHead
                  rowSpan={2}
                  className="sticky left-0 z-30 w-[64px] border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-left text-[10px] text-foreground 2xl:text-xs"
                >
                  {copy.table.station}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="sticky left-[64px] z-30 w-[140px] border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-left text-[10px] text-foreground 2xl:text-xs"
                >
                  {copy.table.process}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[88px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.planInput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[92px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.actualInput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[88px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.planOutput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[92px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.actualOutput}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[72px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.targetUph}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[72px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.actualUph}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[68px] bg-[var(--surface-overlay)] px-1 text-center text-foreground"
                >
                  {copy.table.wip}
                </TableHead>
                <TableHead
                  colSpan={6}
                  className="h-8 bg-[var(--surface-overlay)] px-1 text-center text-[10px] text-foreground 2xl:text-xs"
                >
                  <span>{copy.table.achievement}</span>
                  {hourlyError ? (
                    <span className="ml-2 text-[9px] text-danger-text">{copy.errors.hourly}</span>
                  ) : null}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[68px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.yield}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[64px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.ng}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[64px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                >
                  {copy.table.retest}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="w-[116px] bg-[var(--surface-overlay)] px-1.5 text-center text-[10px] text-foreground 2xl:text-xs"
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
                {(slots ?? []).map((slot, index) => (
                  <TableHead
                    key={slot.id}
                    scope="col"
                    aria-label={
                      slotStates[index] === 'current'
                        ? `${slot.label}, ${copy.table.current}`
                        : slot.label
                    }
                    className={cn(
                      'h-6 w-[68px] bg-[var(--surface-overlay)] px-1 text-center text-[10px] text-muted-foreground',
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
                      <TableCell className="sticky left-0 z-10 w-[64px] bg-[var(--surface)] px-1.5 py-0.5 text-left font-semibold text-foreground group-hover:bg-[var(--surface-hover)]">
                        {station.stationId}
                        {isBottleneck ? (
                          <span className="sr-only">{copy.charts.bottleneck}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="sticky left-[64px] z-10 w-[140px] max-w-[140px] border-r border-border-strong/70 bg-[var(--surface)] px-1.5 py-0.5 text-left text-foreground group-hover:bg-[var(--surface-hover)]">
                        <span className="block truncate text-left" title={stationConfig.name}>
                          {stationConfig.name}
                        </span>
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
                      {(slots ?? []).map((slot, slotIndex) => (
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
                        {formatNumber(station.ngQty)}
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                        {formatNumber(station.retestQty)}
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
