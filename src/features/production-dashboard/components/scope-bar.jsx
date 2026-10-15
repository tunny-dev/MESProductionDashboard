import { memo } from 'react';
import { CalendarRange } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  calculateAchievement,
  formatNumber,
  formatPercent,
} from '@/features/production-dashboard/lib/calc';

/** 'yyyyMMdd' → 'dd/MM'. */
function formatYmdShort(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{8}$/.test(s)) return String(value ?? '');
  return `${s.slice(6, 8)}/${s.slice(4, 6)}`;
}

/**
 * Dải "chế độ xem" — tách khỏi hàng bộ lọc.
 *
 * VÌ SAO KHÔNG ĐỂ TRONG HEADER:
 * Header trả lời "chuyền nào, ngày nào, ca nào, WO nào" — đều là BỘ LỌC, đều
 * thu hẹp tập dữ liệu. "Ca này / Cả WO" thì không thu hẹp gì cả, nó chỉ đổi
 * CỬA SỔ đang nhìn trên cùng một tập dữ liệu (6 khung 2 giờ của ca ↔ 6 nhóm
 * ngày của cả WO). Nhồi nó vào hàng bộ lọc thì hoặc thành cột thứ 7 chẳng
 * nói lý do, hoặc phải nhồi vào ô "Ca làm việc" — mà ca thì đúng 2 ca, nhồi
 * "Toàn bộ WO" vào là lệch nghĩa.
 *
 * VÌ SAO ĐẶT TRÊN HÀNG THẺ KPI:
 * Nó nằm ngay trên thứ đổi rõ nhất (4 thẻ KPI + bảng trạm + 3 biểu đồ), và
 * không tốn chiều cao của hàng bộ lọc vốn đã chật. Dải này cũng mang theo
 * khoảng ngày thật của WO — thứ giải thích ngay tại sao ở chế độ "Ca này" mà
 * tỷ lệ đạt lại thấp.
 */
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
  // WO chạy nhiều ngày thì "Ca này" không so được với MF008 (74% WO chạy từ
  // 2 ngày trở lên) — nhắc ngay, không phải đợi người xem tự nhận ra.
  const multiDay = scope === 'DAY' && days > 1;

  const items = [
    { id: 'DAY', label: copy.scopeBar.day, hint: copy.scopeBar.dayHint },
    { id: 'WO', label: copy.scopeBar.wo, hint: copy.scopeBar.woHint },
  ];

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
          {scope === 'WO' ? (
            <span className="shrink-0 text-foreground">
              {copy.woProgress.of(
                formatNumber(summary.totalOutput),
                formatNumber(summary.planOutput)
              )}
              {formatPercent(calculateAchievement(summary.totalOutput, summary.planOutput), 1)}
            </span>
          ) : null}
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
