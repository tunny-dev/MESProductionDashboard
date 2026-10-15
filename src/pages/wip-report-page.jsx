import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { WipQueryTab } from '@/features/wip-report/components/wip-query-tab';
import { WipSummaryTab } from '@/features/wip-report/components/wip-summary-tab';
import { WipStationsTab } from '@/features/wip-report/components/wip-stations-tab';
import { useWipReport, useWipByStation } from '@/features/wip-report/hooks/use-wip-report';

const TABS = [
  { value: 'query',        label: 'Query' },
  { value: 'summary',      label: 'Summary' },
  { value: 'stations',     label: 'Stations' },
  { value: 'unit-sn-list', label: 'Unit S/N List' },
];

export function WipReportPage() {
  const [activeTab, setActiveTab] = useState('query');
  const [queryParams, setQueryParams] = useState(null);
  const [queryKey, setQueryKey] = useState(0); // bump to force re-fetch
  const [reportTime, setReportTime] = useState(null);

  const enabled = queryParams !== null;
  const { data, isLoading, refetch } = useWipReport({
    params: queryParams,
    enabled,
    // bump queryKey so re-fetches triggered by countdown also register
    queryKey,
  });
  // WIP theo trạm — cùng params, gọi song song để pivot cột trạm động.
  const { data: stationData } = useWipByStation({
    params: queryParams,
    enabled,
    queryKey,
  });

  function handleQuery(params) {
    setQueryParams(params);
    setReportTime(format(new Date(), 'yyyy/MM/dd HH:mm:ss'));
    setActiveTab('summary');
  }

  const handleRefetch = useCallback(() => {
    setReportTime(format(new Date(), 'yyyy/MM/dd HH:mm:ss'));
    setQueryKey((k) => k + 1);
    refetch();
  }, [refetch]);

  return (
    // overflow-x-clip ở root: không có gì trong trang này được phép làm
    // BODY scroll ngang (thanh scroll thứ 2 ở đáy màn hình).
    <div className="flex min-w-0 flex-col gap-0 overflow-x-clip">      {/* Page heading */}
      <div className="mb-3 flex shrink-0 items-center gap-1.5">
        <Star className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">WIP Report</h2>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border">
        <nav className="flex gap-0" aria-label="WIP Report tabs" role="tablist">
          {TABS.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`tabpanel-${tab.value}`}
                id={`tab-${tab.value}`}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t after:bg-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab panels ──────────────────────────────────────────────────── */}
      {/* overflow-x-clip: bảng rộng chỉ được scroll BÊN TRONG khung bảng,
        không cho scroll ngang cả trang làm vỡ layout. */}
      <div className="mt-4 min-w-0 overflow-x-clip">
        {/* Query */}
        <div
          id="tabpanel-query"
          role="tabpanel"
          aria-labelledby="tab-query"
          className={activeTab !== 'query' ? 'hidden' : ''}
        >
          <div className="rounded-lg border border-border bg-surface px-5 py-4">
            <WipQueryTab onQuery={handleQuery} />
          </div>
        </div>

        {/* Summary */}
        <div
          id="tabpanel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          className={activeTab !== 'summary' ? 'hidden' : ''}
        >
          <WipSummaryTab
            data={data}
            stationData={stationData}
            mfgType={queryParams?.mfgType}
            isLoading={isLoading}
            reportTime={reportTime}
            moCreateDateFrom={queryParams?.moCreateDateFrom}
            moCreateDateTo={queryParams?.moCreateDateTo}
            onRefetch={handleRefetch}
          />
        </div>

        {/* Stations (fixed config) */}
        <div
          id="tabpanel-stations"
          role="tabpanel"
          aria-labelledby="tab-stations"
          className={activeTab !== 'stations' ? 'hidden' : ''}
        >
          <WipStationsTab />
        </div>

        {/* Unit S/N List */}
        <div
          id="tabpanel-unit-sn-list"
          role="tabpanel"
          aria-labelledby="tab-unit-sn-list"
          className={activeTab !== 'unit-sn-list' ? 'hidden' : ''}
        >
          <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-surface">
            <p className="text-sm text-muted-foreground">Unit S/N List — coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
