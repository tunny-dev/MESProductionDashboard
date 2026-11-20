import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/core/utils/utils';
import {
  getStatusTone,
  getStationWip,
  getWipLimit,
} from '@/features/production-dashboard/utils/calc';
import { formatNumber } from '@/core/utils/format';

function statusLabel(status, copy) {
  return copy.status[status] || copy.status.UNKNOWN;
}

const FLOW_STATION_MIN_WIDTH = 118;
const FLOW_STATION_GAP = 14;

const STATUS_ACCENT = {
  RUNNING: 'border-l-success',
  WAITING: 'border-l-warning',
  ABNORMAL: 'border-l-danger',
  STOP: 'border-l-neutral',
};

export const FlowStrip = memo(function FlowStrip({
  lineConfig,
  stations,
  summary,
  bottleneckId,
  wipLimit: customWipLimit,
  statusError,
  copy,
}) {
  const stationConfigs = lineConfig.stations;
  const minFlowWidth =
    stationConfigs.length * FLOW_STATION_MIN_WIDTH +
    Math.max(0, stationConfigs.length - 1) * FLOW_STATION_GAP;

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();

    // Hỗ trợ cuộn ngang tự nhiên bằng con lăn chuột (wheel)
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, stationConfigs.length]);

  const handleScrollBy = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section
      aria-label={copy.flow.title(lineConfig.type)}
      className="group relative flex min-h-21 items-stretch gap-2 overflow-hidden rounded-xl border border-border bg-card/80 p-2"
    >
      <div className="flex w-20.5 shrink-0 items-center justify-center rounded-lg border border-production-blue/45 bg-production-blue/10 px-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground 2xl:w-24 2xl:text-xs">
        {copy.flow.title(lineConfig.type)}
      </div>

      <div className="relative min-w-0 flex-1">
        {canScrollLeft && (
          <button
            type="button"
            aria-label="Cuộn sang trái"
            onClick={() => handleScrollBy(-260)}
            className="absolute -left-1 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong/80 bg-background/90 text-foreground shadow-md backdrop-blur-xs transition hover:bg-production-blue hover:text-white"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            aria-label="Cuộn sang phải"
            onClick={() => handleScrollBy(260)}
            className="absolute -right-1 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong/80 bg-background/90 text-foreground shadow-md backdrop-blur-xs transition hover:bg-production-blue hover:text-white"
          >
            <ChevronRight className="size-4" />
          </button>
        )}

        <div ref={scrollRef} className="scrollbar-clean h-full min-w-0 overflow-x-auto pb-1">
          <ol
            className="flow-grid grid h-full w-full items-stretch gap-3"
            style={{
              gridTemplateColumns: `repeat(${stationConfigs.length}, minmax(${FLOW_STATION_MIN_WIDTH}px, 1fr))`,
              minWidth: minFlowWidth,
            }}
          >
            {stationConfigs.map((stationConfig, index) => {
              const station = stations[index] || {};
              const wip = statusError ? null : getStationWip(station, index, stations, summary);
              const isPendingWip =
                wip &&
                wip > 0 &&
                Number(station.actualInput || 0) === 0 &&
                Number(station.actualOutput || 0) === 0;
              const status = statusError
                ? null
                : isPendingWip && (!station.status || station.status === 'STOP')
                  ? 'WAITING'
                  : station.status;
              const tone = getStatusTone(status);
              const isBottleneck = station.stationId === bottleneckId;
              const wipLimit = getWipLimit(stationConfig, customWipLimit);
              const isWipOver = wip !== null && wip > wipLimit;
              const isCritical = isBottleneck && isWipOver;
              const qty = stationConfig.qty ?? station.qty;
              const qtyText =
                qty !== null && qty !== undefined && Number.isFinite(Number(qty))
                  ? `${copy.flow.qty} ${formatNumber(qty)}`
                  : null;

              const tooltipRows = [
                { text: `${stationConfig.id} · ${stationConfig.name}`, emphasis: 'title' },
                { text: statusLabel(status, copy), emphasis: null },
                ...(qtyText ? [{ text: qtyText, emphasis: null }] : []),
                ...(Number.isFinite(Number(station.actualUph))
                  ? [
                      {
                        text: `${copy.table.actualUph}: ${formatNumber(station.actualUph)} PCS/H`,
                        emphasis: null,
                      },
                    ]
                  : []),
                {
                  text: `${copy.flow.wip}: ${wip === null || wip === undefined ? '—' : `${formatNumber(wip)} PCS`}`,
                  emphasis: isWipOver ? 'danger' : null,
                },
                { text: `${copy.flow.limit}: ${formatNumber(wipLimit)} PCS`, emphasis: null },
                { text: copy.flow.bottleneck, emphasis: isBottleneck ? 'danger' : 'hidden' },
              ].filter((row) => row.emphasis !== 'hidden');

              return (
                <li key={stationConfig.id} className="relative min-w-0">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div
                          className={cn(
                            'relative isolate flex h-24 w-full min-w-0 flex-col items-center justify-between rounded-xl border px-2 py-1.5 text-center transition-[box-shadow,border-color]',
                            isCritical || isBottleneck
                              ? 'border-red-500/80 border-l-4 border-l-red-600 bg-linear-to-b from-red-50 via-rose-100/75 to-red-100/90 dark:from-[#2e0e0e] dark:via-[#1e0909] dark:to-[#270b0b] shadow-xs hover:shadow-sm bottleneck-pulse'
                              : isWipOver
                                ? 'border-amber-500/80 border-l-4 border-l-amber-600 bg-linear-to-b from-amber-50 via-amber-100/75 to-amber-100/90 dark:from-[#291c0b] dark:via-[#1c1307] dark:to-[#241809] shadow-xs hover:shadow-sm'
                                : cn(
                                    'border-border-strong/70 border-l-4 bg-linear-to-b from-[var(--surface)] to-[var(--surface-hover)] hover:shadow-md',
                                    STATUS_ACCENT[status] ?? 'border-l-border-strong'
                                  )
                          )}
                        />
                      }
                    >
                      {/* Badge trạng thái cảnh báo phân loại rõ ràng */}
                      <div className="flex h-4 items-center justify-center">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-200/90 dark:bg-red-900/60 px-2 py-0.5 text-[8.5px] font-extrabold tracking-tight text-red-800 dark:text-red-200 shadow-xs">
                            <span className="relative flex size-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-80" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-red-600 dark:bg-red-500" />
                            </span>
                            🚨 {copy.flow.criticalBadge || 'Chậm nhất · WIP cao'}
                          </span>
                        ) : isBottleneck ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-200/90 dark:bg-red-900/60 px-2 py-0.5 text-[8.5px] font-extrabold tracking-tight text-red-800 dark:text-red-200 shadow-xs">
                            <span className="relative flex size-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-80" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-red-600 dark:bg-red-500" />
                            </span>
                            ⚠️ {copy.flow.bottleneckBadge || 'Trạm chậm nhất'}
                          </span>
                        ) : isWipOver ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-200/80 dark:bg-amber-900/50 px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-tight text-amber-800 dark:text-amber-200">
                            🔴 {copy.flow.wipOverBadge || 'WIP cao'}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-col items-center">
                        <span
                          className={cn(
                            'max-w-full truncate text-xs font-black tracking-wide leading-tight 2xl:text-sm',
                            isCritical || isBottleneck
                              ? 'text-red-950 dark:text-red-100'
                              : isWipOver
                                ? 'text-amber-950 dark:text-amber-100'
                                : 'text-foreground'
                          )}
                        >
                          {stationConfig.id}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 max-w-full truncate text-[10px] font-medium leading-tight 2xl:text-[11px]',
                            isCritical || isBottleneck
                              ? 'text-red-900/80 dark:text-red-200/80'
                              : isWipOver
                                ? 'text-amber-900/80 dark:text-amber-200/80'
                                : 'text-muted-foreground'
                          )}
                        >
                          {stationConfig.shortName}
                          {qtyText ? ` · ${qtyText}` : ''}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center justify-center gap-1.5">
                        <span
                          className={cn(
                            'size-2.5 shrink-0 rounded-full ring-2 ring-inset ring-white/50',
                            isCritical || isBottleneck
                              ? 'bg-red-500 ring-2 ring-red-400/50 dark:ring-red-900/60 animate-pulse'
                              : tone.dot
                          )}
                          aria-hidden="true"
                        />
                        <span
                          className={cn(
                            'truncate text-sm font-black tabular-nums 2xl:text-base',
                            isCritical || isBottleneck
                              ? 'text-red-950 dark:text-red-100'
                              : isWipOver
                                ? 'text-amber-950 dark:text-amber-100'
                                : 'text-foreground'
                          )}
                        >
                          {formatNumber(station.actualUph)}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-[9px] font-bold leading-none',
                            isCritical || isBottleneck
                              ? 'text-red-800 dark:text-red-300'
                              : isWipOver
                                ? 'text-amber-800 dark:text-amber-300'
                                : 'text-muted-foreground'
                          )}
                        >
                          UPH
                        </span>
                        <span className="sr-only">{statusLabel(status, copy)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="flex-col items-start gap-0.5 text-xs font-medium"
                    >
                      {tooltipRows.map(({ text, emphasis }) => (
                        <span
                          key={text}
                          className={cn(
                            'whitespace-nowrap text-[11px]',
                            emphasis === 'title' && 'font-bold text-background',
                            emphasis === 'danger' && 'font-bold text-rose-600',
                            !emphasis && 'text-background'
                          )}
                        >
                          {text}
                        </span>
                      ))}
                    </TooltipContent>
                  </Tooltip>

                  {index < stationConfigs.length - 1 ? (
                    <ArrowRight
                      className="flow-arrow absolute -right-1.5 top-1/2 z-20 size-3 translate-x-1/2 -translate-y-1/2 text-production-blue"
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
});
