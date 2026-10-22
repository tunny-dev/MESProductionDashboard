import { memo } from 'react';
import { CalendarRange, Waypoints } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { calculateAchievement } from '@/features/production-dashboard/lib/calc';
import { formatNumber, formatPercent } from '@/lib/format';

/** 'yyyyMMdd' → 'dd/MM'. */
function formatYmdShort(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{8}$/.test(s)) return String(value ?? '');
  return `${s.slice(6, 8)}/${s.slice(4, 6)}`;
}

/** Dải "chế độ xem" — tách khỏi hàng bộ lọc (chỉ đổi cửa sổ nhìn, không thu hẹp dữ liệu). */
export const ScopeBar = memo(function ScopeBar({ scope, onScopeChange, summary, copy }) {
  const span =
    summary?.woStartDate && summary?.woEndDate && summary?.woDayCount
      ? copy.woProgress.span(
          formatYmdShort(summary.woStartDate),
          formatYmdShort(summary.woEndDate),
          summary.woDayCount
        )
      : null;
  const days = Number(summary?.woDayCount) || 0;
  const multiDay = scope === 'DAY' && days > 1;

  const items = [
    { id: 'DAY', label: copy.scopeBar.day, hint: copy.scopeBar.dayHint },
    { id: 'WO', label: copy.scopeBar.wo, hint: copy.scopeBar.woHint },
    { id: 'ROUTING', label: copy.scopeBar.routing, hint: copy.scopeBar.routingHint },
  ];
  const woLike = scope === 'WO' || scope === 'ROUTING';

  return (
    <div
      role="group"
      aria-label={copy.scopeBar.label}
      className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-card px-3 py-2"
    >
      <span
        id="production-scope-label"
        className="shrink-0 text-[10px] font-medium text-muted-foreground xl:text-[11px]"
      >
        {copy.scopeBar.label}
      </span>

      <ToggleGroup
        aria-labelledby="production-scope-label"
        value={[scope]}
        onValueChange={(values) => {
          const next = values[0];
          if (next && next !== scope) onScopeChange(next);
        }}
        variant="outline"
        size="sm"
        spacing={1}
        className="shrink-0"
      >
        {items.map(({ id, label, hint }) => (
          <ToggleGroupItem
            key={id}
            value={id}
            aria-label={hint}
            title={hint}
            className="gap-1.5 px-3 text-xs data-[pressed]:bg-secondary data-[pressed]:text-foreground"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {span ? (
        <p className="flex min-w-0 items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          <span className="truncate">{span}</span>
          {woLike ? (
            <>
              <span className="shrink-0 text-foreground">
                {copy.woProgress.of(
                  formatNumber(summary.totalOutput),
                  formatNumber(summary.planOutput)
                )}
              </span>
              <span className="shrink-0 font-semibold text-foreground">
                {formatPercent(calculateAchievement(summary.totalOutput, summary.planOutput), 1)}
              </span>
            </>
          ) : null}
        </p>
      ) : null}

      {scope === 'ROUTING' ? (
        <p
          title={copy.scopeBar.routingNote}
          className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-medium text-production-blue"
        >
          <Waypoints className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.scopeBar.routingNote}</span>
        </p>
      ) : null}

      {multiDay ? (
        <p
          title={copy.scopeBar.multiDayHint(days)}
          className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-warning-text"
        >
          <CalendarRange className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.scopeBar.multiDayHint(days)}</span>
        </p>
      ) : null}
    </div>
  );
});
