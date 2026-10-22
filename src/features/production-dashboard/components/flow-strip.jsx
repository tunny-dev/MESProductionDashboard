import { memo } from 'react';
import { ArrowRight } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  getStatusTone,
  getStationWip,
  getWipLimit,
} from '@/features/production-dashboard/lib/calc';
import { formatNumber } from '@/lib/format';

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
  statusError,
  themeStyle,
  copy,
}) {
  const stationConfigs = lineConfig.stations;
  const minFlowWidth =
    stationConfigs.length * FLOW_STATION_MIN_WIDTH +
    Math.max(0, stationConfigs.length - 1) * FLOW_STATION_GAP;

  return (
    <section
      aria-label={copy.flow.title(lineConfig.type)}
      className="flex min-h-21 items-stretch gap-2 overflow-hidden rounded-xl border border-border bg-card/80 p-2"
    >
      <div className="flex w-20.5 shrink-0 items-center justify-center rounded-lg border border-production-blue/45 bg-production-blue/10 px-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground 2xl:w-24 2xl:text-xs">
        {copy.flow.title(lineConfig.type)}
      </div>

      <div className="scrollbar-clean min-w-0 flex-1 overflow-x-auto">
        <ol
          className="flow-grid grid h-full w-full items-stretch gap-3"
          style={{
            gridTemplateColumns: `repeat(${stationConfigs.length}, minmax(${FLOW_STATION_MIN_WIDTH}px, 1fr))`,
            minWidth: minFlowWidth,
          }}
        >
          {stationConfigs.map((stationConfig, index) => {
            const station = stations[index] || {};
            const status = statusError ? null : station.status;
            const tone = getStatusTone(status);
            const isBottleneck = station.stationId === bottleneckId;
            const wip = statusError ? null : getStationWip(station, index, stations, summary);
            const wipLimit = getWipLimit(stationConfig);
            const isWipOver = wip !== null && wip > wipLimit;
            const qty = stationConfig.qty ?? station.qty;
            const qtyText =
              qty !== null && qty !== undefined && Number.isFinite(Number(qty))
                ? `${copy.flow.qty} ${formatNumber(qty)}`
                : null;
            const isAlert = isWipOver || isBottleneck;

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
                text: `${copy.flow.wip}: ${wip === null ? '—' : `${formatNumber(wip)} PCS`}`,
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
                          'relative isolate flex h-24 w-full min-w-0 flex-col items-center justify-center rounded-xl border border-l-4 px-2 py-1.5 text-center shadow-sm transition-[box-shadow,border-color,transform]',
                          isAlert
                            ? 'border-danger bg-danger font-semibold text-white shadow-lg shadow-danger/25 alert-pulse'
                            : cn(
                                'border-border-strong/70 bg-linear-to-b from-[var(--surface)] to-[var(--surface-hover)] hover:shadow-md',
                                STATUS_ACCENT[status] ?? 'border-l-border-strong'
                              )
                        )}
                      />
                    }
                  >
                    <span
                      className={cn(
                        'max-w-full truncate text-xs font-extrabold tracking-wide leading-tight 2xl:text-sm',
                        isAlert ? 'text-white' : 'text-foreground'
                      )}
                    >
                      {stationConfig.id}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 max-w-full truncate text-[10px] font-medium leading-tight 2xl:text-[11px]',
                        isAlert ? 'text-white/85' : 'text-muted-foreground'
                      )}
                    >
                      {stationConfig.shortName}
                      {qtyText ? ` · ${qtyText}` : ''}
                    </span>
                    <div className="mt-1.5 flex min-w-0 items-center justify-center gap-1.5">
                      <span
                        className={cn(
                          'size-2.5 shrink-0 rounded-full ring-2 ring-inset ring-white/40',
                          isAlert ? 'bg-white' : tone.dot
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          'truncate text-sm font-bold tabular-nums 2xl:text-base',
                          isAlert ? 'text-white' : 'text-foreground'
                        )}
                      >
                        {formatNumber(station.actualUph)}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-[9px] font-medium leading-none',
                          isAlert ? 'text-white/80' : 'text-muted-foreground'
                        )}
                      >
                        UPH
                      </span>
                      <span className="sr-only">{statusLabel(status, copy)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    style={themeStyle}
                    className="flex-col items-start gap-0.5 border border-border-strong bg-popover text-popover-foreground"
                  >
                    {tooltipRows.map(({ text, emphasis }) => (
                      <span
                        key={text}
                        className={cn(
                          'whitespace-nowrap text-[11px]',
                          emphasis === 'title' && 'font-semibold',
                          emphasis === 'danger' && 'font-semibold text-danger-text'
                        )}
                      >
                        {text}
                      </span>
                    ))}
                  </TooltipContent>
                </Tooltip>

                {index < stationConfigs.length - 1 ? (
                  <ArrowRight
                    className="flow-arrow absolute -right-1.5 top-1/2 z-10 size-3 translate-x-1/2 -translate-y-1/2 text-production-blue"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
});
