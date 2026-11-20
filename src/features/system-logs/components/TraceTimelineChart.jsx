import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/hooks/useTheme';

export function TraceTimelineChart({ traces = [], timeline = [] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  // Group traces into time buckets (server-side timeline takes priority)
  const chartData = useMemo(() => {
    if (timeline && timeline.length > 0) {
      return timeline.map((b) => ({
        time: b.time,
        ok: b.ok || 0,
        slow: b.slow || 0,
        error: b.error || 0,
        total: b.total || 0,
        avgDuration: b.avgDurationMs || b.avgDuration || 0,
      }));
    }

    if (!traces || traces.length === 0) return [];

    const bucketMap = new Map();

    traces.forEach((trace) => {
      const timeStr = trace.timestamp || (trace.events && trace.events[0]?.time);
      if (!timeStr) return;

      let d;
      try {
        d = new Date(timeStr);
        if (isNaN(d.getTime())) return;
      } catch {
        return;
      }

      // Group by 10-minute intervals
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = Math.floor(d.getMinutes() / 10) * 10;
      const bucketKey = `${hours}:${String(minutes).padStart(2, '0')}`;

      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          time: bucketKey,
          ok: 0,
          slow: 0,
          error: 0,
          total: 0,
          totalDuration: 0,
        });
      }

      const item = bucketMap.get(bucketKey);
      item.total += 1;
      item.totalDuration += trace.totalDurationMs || 0;

      if (trace.hasError || trace.statusCode >= 400) {
        item.error += 1;
      } else if (trace.slowQueryCount > 0 || trace.totalDurationMs >= 1000) {
        item.slow += 1;
      } else {
        item.ok += 1;
      }
    });

    const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    // Compute average duration per bucket
    return sortedBuckets.map((b) => ({
      ...b,
      avgDuration: b.total > 0 ? Math.round(b.totalDuration / b.total) : 0,
    }));
  }, [traces, timeline]);

  if ((!traces || traces.length === 0) && (!timeline || timeline.length === 0)) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded border dark:border-[#22252b] border-[#d8d9da] dark:bg-[#181b1f] bg-white p-3 shadow-sm transition-all">
        <div className="flex items-center justify-between pb-1.5 border-b dark:border-[#22252b] border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 text-xs font-semibold dark:text-[#f4f5f7] text-slate-800 hover:text-[#5794f2] transition cursor-pointer select-none"
            >
              {isCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5 text-[#8e94a0]" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-[#8e94a0]" />
              )}
              <span>Logs volume</span>
            </button>
            <span className="text-[11px] dark:text-[#8e94a0] text-slate-500 hidden sm:inline">
              ({chartData.length} intervals)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-sans">
              <span className="flex items-center gap-1.5 text-[#73bf69]">
                <span className="h-2 w-2 rounded-full bg-[#73bf69]" /> 200 OK
              </span>
              <span className="flex items-center gap-1.5 text-[#faad14]">
                <span className="h-2 w-2 rounded-full bg-[#faad14]" /> Slow (≥ 1s)
              </span>
              <span className="flex items-center gap-1.5 text-[#f2495c]">
                <span className="h-2 w-2 rounded-full bg-[#f2495c]" /> Error
              </span>
            </div>
          </div>
        </div>

        {!isCollapsed && (
          <div className="mt-2 h-32 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="2 2"
                  stroke={isDark ? '#22252b' : '#e2e8f0'}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke={isDark ? '#8e94a0' : '#94a3b8'}
                  tick={{ fontSize: 10, fill: isDark ? '#8e94a0' : '#64748b' }}
                  tickLine={false}
                />
                <YAxis
                  stroke={isDark ? '#8e94a0' : '#94a3b8'}
                  tick={{ fontSize: 10, fill: isDark ? '#8e94a0' : '#64748b' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded border dark:border-[#2c323f] border-slate-300 dark:bg-[#181b1f] bg-white p-2.5 shadow-xl text-xs dark:text-[#f4f5f7] text-slate-800">
                          <div className="font-sans font-bold text-[#5794f2] border-b dark:border-[#2c323f] border-slate-200 pb-1 mb-1.5">
                            Time Window: {label}
                          </div>
                          <div className="space-y-0.5 font-sans text-[11px]">
                            <div className="flex justify-between gap-4 text-[#73bf69]">
                              <span>Success (200 OK):</span>
                              <span className="font-bold">{data.ok}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-[#faad14]">
                              <span>Slow Queries:</span>
                              <span className="font-bold">{data.slow}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-[#f2495c]">
                              <span>Errors:</span>
                              <span className="font-bold">{data.error}</span>
                            </div>
                            <div className="flex justify-between gap-4 dark:text-[#c7d0d9] text-slate-700 border-t dark:border-[#2c323f] border-slate-200 pt-1 mt-1 font-semibold">
                              <span>Total Requests:</span>
                              <span>{data.total}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-[#5794f2]">
                              <span>Avg Latency:</span>
                              <span>{data.avgDuration} ms</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ok" stackId="a" fill="#73bf69" radius={[0, 0, 0, 0]} />
                <Bar dataKey="slow" stackId="a" fill="#faad14" radius={[0, 0, 0, 0]} />
                <Bar dataKey="error" stackId="a" fill="#f2495c" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

TraceTimelineChart.propTypes = {
  traces: PropTypes.array,
  timeline: PropTypes.array,
};
