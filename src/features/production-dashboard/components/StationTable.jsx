import { memo, useState, useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { StationSerialsDialog } from '@/features/production-dashboard/components/StationSerialsDialog';
import { StationPassNgDialog } from '@/features/production-dashboard/components/StationPassNgDialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/core/utils/utils';
import {
  calculateYield,
  getAchievementSlotBadgeStyle,
  getStatusTone,
  getStationWip,
  getWipLimit,
} from '@/features/production-dashboard/utils/calc';
import { formatNumber, formatPercent } from '@/core/utils/format';

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
    return <span className="text-muted-foreground font-medium">—</span>;
  }

  const displayPercent = Math.min(100, Math.round(Number(value)));
  if (!Number.isFinite(displayPercent)) {
    return <span className="text-muted-foreground font-medium">—</span>;
  }

  const isCurrent = slotState === 'current';
  const tooltipTitle = isCurrent
    ? `${label} (Khung giờ hiện tại): ${displayPercent}%`
    : `${label}: ${displayPercent}%`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              'flex h-6 w-full cursor-help items-center justify-center rounded-sm px-1 text-[11px] font-bold tabular-nums 2xl:text-xs tracking-tight transition-transform select-none',
              getAchievementSlotBadgeStyle(displayPercent),
              isCurrent && 'ring-2 ring-production-blue ring-offset-1 ring-offset-[var(--surface)]'
            )}
          />
        }
      >
        {displayPercent}%
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        <span>{tooltipTitle}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function NgCell({ station, copy }) {
  const unresolvedNg = station.unresolvedNg ?? station.ngQty ?? 0;
  const totalNg = station.totalNg ?? station.ngQty ?? 0;
  const ngAll = station.ngAll;
  const tip = copy?.table?.ngTip ?? {
    current: 'NG tồn đọng',
    totalInShift: 'Tổng phát sinh ca',
    events: 'Lượt NG',
    all: 'Lũy kế WO',
    rate: 'Tỷ lệ NG',
  };
  const parts = [];

  if (unresolvedNg !== null && unresolvedNg !== undefined)
    parts.push(`${tip.current}: ${formatNumber(unresolvedNg)}`);
  if (totalNg !== null && totalNg !== undefined)
    parts.push(`${tip.totalInShift ?? 'Tổng phát sinh ca'}: ${formatNumber(totalNg)}`);
  if (station.ngEvents !== null && station.ngEvents !== undefined)
    parts.push(`${tip.events}: ${formatNumber(station.ngEvents)}`);
  if (ngAll !== null && ngAll !== undefined && ngAll > 0)
    parts.push(`${tip.all}: ${formatNumber(ngAll)}`);
  if (station.ngRate !== null && station.ngRate !== undefined)
    parts.push(`${tip.rate}: ${formatPercent(station.ngRate)}`);

  const hasNg = (unresolvedNg ?? 0) > 0 || (totalNg ?? 0) > 0 || (station.ngEvents ?? 0) > 0;

  return (
    <span
      className={cn(
        'inline-flex items-baseline justify-center',
        unresolvedNg > 0 ? 'font-bold text-danger-text' : 'text-muted-foreground font-normal'
      )}
      title={hasNg && parts.length ? parts.join(' · ') : undefined}
    >
      <span>{formatNumber(unresolvedNg)}</span>
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
  clockTime,
  shift,
  bottleneckId,
  wipLimit: customWipLimit,
  loading,
  error,
  hourlyError,
  statusError,
  uphTargetState = null,
  onRetry,
  copy,
  appliedFilters,
  visibleColumns,
  themeStyle,
}) {
  const [serialsDialog, setSerialsDialog] = useState({
    open: false,
    station: null,
    stationName: null,
    category: 'FINISH',
    wipDiff: null,
  });

  const [passNgDialog, setPassNgDialog] = useState({
    open: false,
    station: null,
    type: 'PASS',
  });

  const cols = useMemo(
    () => ({
      planInput: visibleColumns?.planInput ?? true,
      actualInput: visibleColumns?.actualInput ?? true,
      planOutput: visibleColumns?.planOutput ?? true,
      actualOutput: visibleColumns?.actualOutput ?? true,
      targetUph: visibleColumns?.targetUph ?? true,
      actualUph: visibleColumns?.actualUph ?? true,
      wip: visibleColumns?.wip ?? true,
      hourlyAchievement: visibleColumns?.hourlyAchievement ?? true,
      yield: visibleColumns?.yield ?? true,
      ngQty: visibleColumns?.ngQty ?? true,
      totalPass: visibleColumns?.totalPass ?? true,
      totalNg: visibleColumns?.totalNg ?? true,
      status: visibleColumns?.status ?? true,
    }),
    [visibleColumns]
  );

  const openPassSerials = (station) => {
    setPassNgDialog({
      open: true,
      station: {
        stationId: station.stationId,
        stationName: station.name || station.stationName || station.stationId,
      },
      type: 'PASS',
    });
  };

  const openNgSerials = (station) => {
    setPassNgDialog({
      open: true,
      station: {
        stationId: station.stationId,
        stationName: station.name || station.stationName || station.stationId,
      },
      type: 'NG',
    });
  };

  const openSerials = (station, category = 'FINISH', extra = {}) => {
    setSerialsDialog({
      open: true,
      station: station.stationId,
      stationName: station.name || station.stationId,
      category,
      wipDiff: extra.wipDiff ?? null,
    });
  };

  const slotColumns = (slots ?? [])
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => !slot.empty);
  const slotColumnCount = cols.hourlyAchievement ? Math.max(1, slotColumns.length) : 0;

  // Tính số lượng cột động
  let dynamicBase = 3; // Thứ tự, Trạm, Công đoạn (luôn hiển thị cố định)
  if (cols.planInput) dynamicBase++;
  if (cols.actualInput) dynamicBase++;
  if (cols.planOutput) dynamicBase++;
  if (cols.actualOutput) dynamicBase++;
  if (cols.targetUph) dynamicBase++;
  if (cols.actualUph) dynamicBase++;
  if (cols.wip) dynamicBase++;
  if (cols.yield) dynamicBase++;
  if (cols.ngQty) dynamicBase++;
  if (cols.totalPass) dynamicBase++;
  if (cols.totalNg) dynamicBase++;
  if (cols.status) dynamicBase++;

  const totalColumns = dynamicBase + (cols.hourlyAchievement ? slotColumns.length : 0);
  const tableMinWidth = Math.max(
    800,
    dynamicBase * 75 + (cols.hourlyAchievement ? SLOT_MIN_WIDTH * slotColumns.length : 0) + 160
  );

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
                  className="sticky left-0 z-30 w-16 border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-center text-[10px] font-bold text-foreground 2xl:text-xs"
                >
                  {copy.table.seq ?? 'Thứ tự'}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="sticky left-16 z-30 w-16 border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-left text-[10px] text-foreground 2xl:text-xs"
                >
                  {copy.table.station}
                </TableHead>
                <TableHead
                  rowSpan={2}
                  className="sticky left-32 z-30 w-35 border-r border-border/70 bg-[var(--surface-overlay)] px-1.5 text-left text-[10px] text-foreground 2xl:text-xs"
                >
                  {copy.table.process}
                </TableHead>
                {cols.planInput && (
                  <TableHead
                    rowSpan={2}
                    className="w-22 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                  >
                    {copy.table.planInput}
                  </TableHead>
                )}
                {cols.actualInput && (
                  <TableHead
                    rowSpan={2}
                    className="w-23 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                  >
                    {copy.table.actualInput}
                  </TableHead>
                )}
                {cols.planOutput && (
                  <TableHead
                    rowSpan={2}
                    className="w-22 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                  >
                    {copy.table.planOutput}
                  </TableHead>
                )}
                {cols.actualOutput && (
                  <TableHead
                    rowSpan={2}
                    className="w-23 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                  >
                    {copy.table.actualOutput}
                  </TableHead>
                )}
                {cols.targetUph && (
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
                )}
                {cols.actualUph && (
                  <TableHead
                    rowSpan={2}
                    className="w-18 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                  >
                    {copy.table.actualUph}
                  </TableHead>
                )}
                {cols.wip && (
                  <TableHead
                    rowSpan={2}
                    className="w-17 bg-[var(--surface-overlay)] px-1 text-center text-foreground"
                  >
                    {copy.table.wip}
                  </TableHead>
                )}
                {cols.hourlyAchievement && (
                  <TableHead
                    colSpan={slotColumnCount}
                    className="h-8 border-b border-border-strong/80 bg-[var(--surface-overlay)] px-1 text-center text-[10px] font-bold tracking-wide uppercase text-foreground 2xl:text-xs"
                  >
                    <span>{copy.table.achievement}</span>
                    {hourlyError ? (
                      <span className="ml-2 text-[9px] text-danger-text">{copy.errors.hourly}</span>
                    ) : null}
                  </TableHead>
                )}
                {cols.yield && (
                  <TableHead
                    rowSpan={2}
                    className="w-16 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                  >
                    {copy.table.yield}
                  </TableHead>
                )}
                {cols.ngQty && (
                  <TableHead
                    rowSpan={2}
                    className="w-18 bg-[var(--surface-overlay)] px-1 text-center text-[10px] leading-tight text-foreground 2xl:text-xs"
                    title="Số lượng máy hiện tại còn đang lỗi tại trạm (chưa qua test lại đạt hoặc sửa xong)"
                  >
                    {copy.table.ng ?? 'NG còn đọng'}
                  </TableHead>
                )}
                {cols.totalPass && (
                  <TableHead
                    rowSpan={2}
                    className="w-18 bg-[var(--surface-overlay)] px-1 text-center text-[10px] font-bold leading-tight text-emerald-600 dark:text-emerald-400 2xl:text-xs"
                    title="Tổng số sản phẩm đạt (Pass) trong ca (Bấm để xem danh sách Serial theo từng khung giờ)"
                  >
                    {copy.table.totalPass ?? 'Tổng Pass'}
                  </TableHead>
                )}
                {cols.totalNg && (
                  <TableHead
                    rowSpan={2}
                    className="w-18 bg-[var(--surface-overlay)] px-1 text-center text-[10px] font-bold leading-tight text-rose-600 dark:text-rose-400 2xl:text-xs"
                    title="Tổng số sản phẩm phát sinh lỗi (NG) trong ca (Bấm để xem danh sách Serial theo từng khung giờ)"
                  >
                    {copy.table.totalNg ?? 'Tổng NG'}
                  </TableHead>
                )}
                {cols.status && (
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
                )}
              </TableRow>
              {cols.hourlyAchievement && (
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
                        'h-6.5 w-17 bg-[var(--surface-overlay)] px-0.5 text-center text-[10px] font-bold text-foreground/90 2xl:text-[11px]',
                        slotStates[index] === 'current' &&
                          'bg-production-blue/20 text-production-blue border-b-2 border-production-blue'
                      )}
                    >
                      <span>{slot.label}</span>
                      {slotStates[index] === 'current' ? (
                        <span className="sr-only">{copy.table.current}</span>
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {stations.length ? (
                stations.map((station, index) => {
                  const stationConfig =
                    lineConfig?.stations?.find((s) => s.id === station.stationId) ??
                    lineConfig?.stations?.[index] ??
                    station;
                  const wip = getStationWip(station, index, stations, summary);
                  const wipLimit = getWipLimit(stationConfig, customWipLimit);
                  const wipOverLimit = wip !== null && wip > wipLimit;
                  const yieldPercent =
                    station.yield ??
                    calculateYield(
                      station.firstPass,
                      station.actualInput,
                      station.actualOutput,
                      station.ngQty
                    );
                  const isBottleneck = station.stationId === bottleneckId;
                  const isInactive =
                    Number(station.actualInput || 0) === 0 &&
                    Number(station.actualOutput || 0) === 0;

                  return (
                    <TableRow
                      key={station.stationId}
                      className={cn(
                        'group h-6 border-border/50 bg-[var(--surface)] hover:bg-[var(--surface-hover)]',
                        isInactive && 'opacity-65 hover:opacity-100 transition-opacity',
                        isBottleneck && 'bg-danger/5 hover:bg-danger/10'
                      )}
                    >
                      <TableCell className="sticky left-0 z-10 w-16 border-r border-border/70 bg-[var(--surface)] px-1.5 py-0.5 text-center font-mono text-[11px] font-bold text-foreground group-hover:bg-[var(--surface-hover)] select-none">
                        {station.seqRaw ||
                          (station.seq
                            ? String(station.seq).padStart(4, '0')
                            : String((index + 1) * 10).padStart(4, '0'))}
                      </TableCell>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TableCell
                            role="button"
                            tabIndex={0}
                            onClick={() => openSerials(station, 'FINISH')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openSerials(station, 'FINISH');
                              }
                            }}
                            title="Bấm để xem danh sách Serial Number qua trạm này"
                            className="sticky left-16 z-10 w-16 cursor-pointer bg-[var(--surface)] px-1.5 py-0.5 text-left font-semibold text-foreground transition-colors group-hover:bg-[var(--surface-hover)] hover:text-production-blue select-none"
                          >
                            <span className="text-left font-semibold hover:underline">
                              {station.stationId}
                            </span>
                            {isBottleneck ? (
                              <span className="sr-only">{copy.charts.bottleneck}</span>
                            ) : null}
                          </TableCell>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={6}>
                          <p>Bấm để xem danh sách Serial Number qua trạm này</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <TableCell
                            role="button"
                            tabIndex={0}
                            onClick={() => openSerials(station, 'FINISH')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openSerials(station, 'FINISH');
                              }
                            }}
                            className="sticky left-32 z-10 w-35 max-w-35 cursor-pointer border-r border-border-strong/70 bg-[var(--surface)] px-1.5 py-0.5 text-left text-foreground transition-colors group-hover:bg-[var(--surface-hover)] hover:text-production-blue select-none"
                          >
                            <span className="block w-full truncate text-left hover:underline">
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
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={6}>
                          <p>Bấm để xem danh sách Serial Number qua trạm này</p>
                        </TooltipContent>
                      </Tooltip>

                      {cols.planInput && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                          {formatNumber(station.planInput)}
                        </TableCell>
                      )}
                      {cols.actualInput && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-foreground">
                          {station.actualInput > 0 ? (
                            <button
                              type="button"
                              onClick={() => openSerials(station, 'INPUT')}
                              title="Bấm để xem chi tiết Serial đầu vào (INPUT)"
                              className="font-medium hover:text-production-blue hover:underline"
                            >
                              {formatNumber(station.actualInput)}
                            </button>
                          ) : (
                            <span>{formatNumber(station.actualInput)}</span>
                          )}
                        </TableCell>
                      )}
                      {cols.planOutput && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                          {formatNumber(station.planOutput)}
                        </TableCell>
                      )}
                      {cols.actualOutput && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-foreground">
                          {station.cumQty !== null &&
                          station.cumQty !== undefined &&
                          station.cumQty > 0 &&
                          station.cumQty !== station.actualOutput ? (
                            <Tooltip>
                              <TooltipTrigger
                                className="cursor-help"
                                render={
                                  <button
                                    type="button"
                                    onClick={() => openPassSerials(station)}
                                    title="Bấm để xem chi tiết Serial hoàn thành (FINISH)"
                                    className={cn(
                                      isInactive
                                        ? 'text-muted-foreground'
                                        : 'font-medium underline decoration-dotted underline-offset-2 hover:text-production-blue'
                                    )}
                                  />
                                }
                              >
                                {formatNumber(station.actualOutput)}
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>
                                  {copy.table.cumulativeWo ?? 'Lũy kế toàn WO'}:{' '}
                                  {formatNumber(station.cumQty)} PCS
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          ) : station.actualOutput > 0 ? (
                            <button
                              type="button"
                              onClick={() => openPassSerials(station)}
                              title="Bấm để xem chi tiết Serial hoàn thành (FINISH)"
                              className="font-medium hover:text-production-blue hover:underline"
                            >
                              {formatNumber(station.actualOutput)}
                            </button>
                          ) : (
                            <span
                              className={cn(isInactive ? 'text-muted-foreground' : 'font-medium')}
                            >
                              {formatNumber(station.actualOutput)}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {cols.targetUph && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-muted-foreground">
                          {station.targetUph != null && Number(station.targetUph) > 0
                            ? formatNumber(station.targetUph)
                            : '0'}
                        </TableCell>
                      )}
                      {cols.actualUph && (
                        <TableCell
                          className={cn(
                            'px-1 py-0.5 text-center tabular-nums font-semibold text-foreground',
                            isBottleneck && 'text-danger-text'
                          )}
                        >
                          {formatNumber(station.actualUph)}
                        </TableCell>
                      )}
                      {cols.wip && (
                        <TableCell
                          className={cn(
                            'px-1 py-0.5 text-center tabular-nums',
                            wipOverLimit ? 'font-semibold text-danger-text' : 'text-foreground'
                          )}
                        >
                          {wip === null || wip === undefined ? (
                            <span className="text-muted-foreground font-medium">—</span>
                          ) : Number(wip) > 0 ? (
                            <button
                              type="button"
                              onClick={() => openSerials(station, 'WIP', { wipDiff: wip })}
                              title={`WIP theo sản lượng ca: ${formatNumber(wip)} PCS. Bấm để xem chi tiết các Serial Number thực tế đang chờ trạm kế tiếp`}
                              className={cn(
                                'inline-flex items-center justify-center gap-1 cursor-pointer font-semibold hover:underline',
                                wipOverLimit
                                  ? 'text-danger-text hover:text-danger-text/80 font-bold'
                                  : 'text-warning-text hover:text-warning-text/80'
                              )}
                            >
                              <span>{formatNumber(wip)}</span>
                              {wipOverLimit ? (
                                <span
                                  className="inline-block text-xs"
                                  title={`WIP vượt giới hạn (${formatNumber(wipLimit)} PCS)`}
                                >
                                  🔴
                                </span>
                              ) : null}
                            </button>
                          ) : (
                            <span>0</span>
                          )}
                          {wipOverLimit ? (
                            <span className="sr-only">
                              {copy.flow.limit}: {formatNumber(wipLimit)}
                            </span>
                          ) : null}
                        </TableCell>
                      )}
                      {cols.hourlyAchievement &&
                        slotColumns.map(({ slot, index: slotIndex }) => (
                          <TableCell
                            key={`${station.stationId}-${slot.id}`}
                            className={cn(
                              'p-0.5 text-center',
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
                                slot={slot}
                                clockTime={clockTime}
                                shift={shift}
                              />
                            )}
                          </TableCell>
                        ))}
                      {cols.yield && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-success-text">
                          {yieldPercent === null ? '-' : `${formatPercent(yieldPercent)}`}
                        </TableCell>
                      )}
                      {cols.ngQty && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums text-foreground">
                          <NgCell station={station} copy={copy} />
                        </TableCell>
                      )}
                      {/* Cột Tổng Pass (bấm mở modal Pass theo khung giờ) */}
                      {cols.totalPass && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums">
                          {(station.totalPass ?? station.actualOutput) != null &&
                          Number(station.totalPass ?? station.actualOutput) > 0 ? (
                            <button
                              type="button"
                              onClick={() => openPassSerials(station)}
                              title="Bấm để xem danh sách Serial Đạt (Pass) theo từng khung giờ"
                              className="inline-flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-500/10 transition-colors"
                            >
                              {formatNumber(station.totalPass ?? station.actualOutput)}
                            </button>
                          ) : (
                            <span className="text-muted-foreground font-normal">
                              {(station.totalPass ?? station.actualOutput) != null ? '0' : '—'}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {/* Cột Tổng NG (bấm mở modal NG theo khung giờ) */}
                      {cols.totalNg && (
                        <TableCell className="px-1 py-0.5 text-center tabular-nums">
                          {(station.totalNg ?? station.ngQty) != null &&
                          Number(station.totalNg ?? station.ngQty) > 0 ? (
                            <button
                              type="button"
                              onClick={() => openNgSerials(station)}
                              title="Bấm để xem danh sách Serial Lỗi (NG) theo từng khung giờ"
                              className="inline-flex items-center justify-center font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition-colors"
                            >
                              {formatNumber(station.totalNg ?? station.ngQty)}
                            </button>
                          ) : (
                            <span className="text-muted-foreground font-normal">
                              {(station.totalNg ?? station.ngQty) != null ? '0' : '—'}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {cols.status && (
                        <TableCell className="px-1.5 py-0.5 text-center">
                          {isInactive ? (
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                {station.wip && station.wip > 0 ? (
                                  <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-500 dark:text-amber-400">
                                    🟡 Chờ xử lý ({formatNumber(station.wip)})
                                  </span>
                                ) : station.cumQty &&
                                  station.planOutput &&
                                  station.cumQty >= station.planOutput ? (
                                  <span className="inline-flex items-center rounded-full border border-production-blue/30 bg-production-blue/10 px-1.5 py-0.5 text-[9px] font-normal text-production-blue">
                                    🔵 Đã xong trước ca
                                  </span>
                                ) : station.cumQty > 0 ? (
                                  <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0.5 text-[9px] font-normal text-muted-foreground">
                                    ⚪ Chạy trước ca ({formatNumber(station.cumQty)})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0.5 text-[9px] font-normal text-muted-foreground">
                                    ⚪ {copy.table.inactive ?? 'Không chạy'}
                                  </span>
                                )}
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>
                                  {station.wip && station.wip > 0
                                    ? `Trạm chưa quét trong ca này nhưng còn tồn ${formatNumber(station.wip)} PCS đang chờ xử lý / chuyển trạm tiếp theo`
                                    : station.cumQty
                                      ? `Trạm đã chạy từ ca trước (Lũy kế: ${formatNumber(station.cumQty)} / ${formatNumber(station.planOutput || 0)} PCS)`
                                      : (copy.table.inactiveTip ??
                                        'Trạm không phát sinh lượt quét trong ca này')}
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <StatusCell station={station} copy={copy} statusError={statusError} />
                          )}
                        </TableCell>
                      )}
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

      <StationSerialsDialog
        open={serialsDialog.open}
        onOpenChange={(open) => setSerialsDialog((s) => ({ ...s, open }))}
        params={{
          mo: appliedFilters?.mo,
          station: serialsDialog.station,
          stationName: serialsDialog.stationName,
          line: appliedFilters?.line,
          sDate: appliedFilters?.sDate,
          shift: appliedFilters?.shift,
          wipDiff: serialsDialog.wipDiff,
        }}
        initialCategory={serialsDialog.category}
        themeStyle={themeStyle}
      />

      {/* Modal chuyên biệt xem chi tiết Serial PASS / NG theo từng khung giờ */}
      <StationPassNgDialog
        open={passNgDialog.open}
        onOpenChange={(open) => setPassNgDialog((prev) => ({ ...prev, open }))}
        station={passNgDialog.station}
        type={passNgDialog.type}
        params={{
          mo: appliedFilters?.mo,
          line: appliedFilters?.line,
          sDate: appliedFilters?.sDate,
          shift: appliedFilters?.shift,
        }}
        themeStyle={themeStyle}
      />
    </Card>
  );
});
