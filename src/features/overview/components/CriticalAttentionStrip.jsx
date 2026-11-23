import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/core/utils/utils';

export function CriticalAttentionStrip({ lines = [] }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // Lọc các chuyền cần chú ý khẩn cấp: dừng hoặc trễ
  const attentionLines = lines.filter((l) => ['stopped', 'behind'].includes(l.status?.key));

  if (attentionLines.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 shadow-2xs transition-all dark:bg-amber-500/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-6.5 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3.5" />
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
            {t('overview.attentionTitle', 'Chuyền cần chú ý xử lý')}
          </span>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            {t('overview.attentionCount', { count: attentionLines.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex size-6.5 cursor-pointer items-center justify-center rounded-md text-amber-700 hover:bg-amber-500/15 dark:text-amber-300 outline-hidden transition-colors"
          aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="scrollbar-clean mt-2.5 flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
          {attentionLines.map((line) => {
            const isStopped = line.status?.key === 'stopped';
            const detailHref = `/overview/line/${encodeURIComponent(line.lineId)}`;
            const displayName = line.lineName || line.lineId;

            return (
              <Link
                key={line.lineId}
                to={detailHref}
                className={cn(
                  'group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all hover:shadow-xs',
                  isStopped
                    ? 'border-error/40 bg-surface text-error-strong hover:border-error-strong'
                    : 'border-amber-500/40 bg-surface text-amber-700 hover:border-amber-600 dark:text-amber-300'
                )}
              >
                <span>{displayName}</span>
                <span className="text-[10px] font-normal opacity-75">
                  (
                  {isStopped
                    ? t('overview.stoppedBadge', 'Dừng chuyền')
                    : t('overview.behindBadge', 'Trễ tiến độ')}
                  )
                </span>
                <ArrowUpRight className="size-3 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
