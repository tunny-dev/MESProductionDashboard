import { memo } from 'react';

import { cn } from '@/lib/utils';
import { WIP_STATIONS_BY_PROCESS } from '@/features/wip-report/lib/wip-station-config';

/**
 * Tab "Stations" — hiển thị danh sách trạm FIX CỨNG theo công đoạn đang dùng
 * để dựng cột trạm của tab Summary (file wip-station-config.js).
 *
 * Tab này chỉ để XEM (read-only): mapping query → cột chạy theo mã trạm,
 * model nào đi qua trạm nào thì fill trạm đó, trạm không đi qua hiện 0.
 * Muốn thêm/bớt trạm thì sửa file config rồi deploy FE, không cần đụng SQL.
 */
export const WipStationsTab = memo(function WipStationsTab() {
  const processes = Object.keys(WIP_STATIONS_BY_PROCESS);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Fixed station list per process, used as Summary table columns. Matching by station code.
      </p>
      {processes.map((process) => {
        const stations = WIP_STATIONS_BY_PROCESS[process];
        return (
          <section
            key={process}
            aria-label={`${process} stations`}
            className="overflow-hidden rounded-lg border border-border bg-surface"
          >
            <header className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2">
              <h3 className="text-sm font-semibold text-foreground">{process}</h3>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs tabular-nums text-primary">
                {stations.length} stations
              </span>
            </header>
            <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
              <caption className="sr-only">{process} station list</caption>
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-3 py-1.5 text-left font-medium text-muted-foreground">#</th>
                  <th className="w-32 px-3 py-1.5 text-left font-medium text-muted-foreground">
                    Station
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s, i) => (
                  <tr
                    key={s.code}
                    className={cn('border-b border-border/50 last:border-0', i % 2 === 1 && 'bg-surface-hover/40')}
                  >
                    <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground">{s.code}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
});
