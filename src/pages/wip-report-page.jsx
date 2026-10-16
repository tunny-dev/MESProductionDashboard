import { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { WipQueryTab } from '@/features/wip-report/components/wip-query-tab';
import { WipSummaryTab } from '@/features/wip-report/components/wip-summary-tab';
import { WipUnitSnTab } from '@/features/wip-report/components/wip-unit-sn-tab';
import { WipStationsTab } from '@/features/wip-report/components/wip-stations-tab';
import { useWipReport, useWipByStation } from '@/features/wip-report/hooks/use-wip-report';
import { drillFromColumnKey } from '@/features/wip-report/lib/wip-drill';

const TABS = [
  { value: 'query', label: 'Query' },
  { value: 'summary', label: 'Summary' },
  { value: 'unit-sn-list', label: 'Unit S/N List' },
  { value: 'stations', label: 'Stations' },
];

export function WipReportPage() {
  const [activeTab, setActiveTab] = useState('query');
  const [queryParams, setQueryParams] = useState(null);
  const [queryKey, setQueryKey] = useState(0); // bump to force re-fetch
  const [reportTime, setReportTime] = useState(null);
  const [snSelection, setSnSelection] = useState(null);

  const enabled = queryParams !== null;
  const { data, isLoading, refetch } = useWipReport({
    params: queryParams,
    enabled,
    queryKey,
  });

  const { data: stationData } = useWipByStation({
    params: queryParams,
    enabled,
    queryKey,
  });

  function handleQuery(params) {
    setQueryParams(params);
    setReportTime(format(new Date(), 'yyyy/MM/dd HH:mm:ss'));
    setSnSelection(null);
    setActiveTab('summary');
  }

  // Trên WIP khi action: NotInput or cột trạm → chuyển sang tab Unit S/N List.
  const handleDrill = useCallback((row, columnKey) => {
    const drillInfo = drillFromColumnKey(columnKey);
    const mode = drillInfo.mode;
    const station = drillInfo.station;
    setSnSelection({
      mode,
      station,
      mo: row.mo,
      line: row.line,
      lineName: row.lineName,
      model: row.model,
      partNumber: row.partNumber,
      value: Number(row[columnKey]) || 0,
    });
    setActiveTab('unit-sn-list');
  }, []);

  const handleRefetch = useCallback(() => {
    setReportTime(format(new Date(), 'yyyy/MM/dd HH:mm:ss'));
    setQueryKey((k) => k + 1);
    refetch();
  }, [refetch]);

  return (
    <div className="flex min-w-0 flex-col gap-0 overflow-x-clip">
      <div className="mb-3 flex shrink-0 items-center gap-1.5">
        <Star className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold text-foreground">WIP Report</h2>
      </div>
      <div className="shrink-0 border-b border-border">
        <nav className="flex gap-0" aria-label="WIP Report tabs" role="tablist">
          {TABS.map((tab) => {
            const active = activeTab === tab.value;
            const locked = tab.value !== 'query' && !enabled;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                aria-disabled={locked || undefined}
                aria-controls={`tabpanel-${tab.value}`}
                id={`tab-${tab.value}`}
                disabled={locked}
                onClick={() => setActiveTab(tab.value)}
                title={locked ? 'Query first to view the report' : undefined}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t after:bg-primary'
                    : 'text-muted-foreground hover:text-foreground',
                  locked && 'cursor-not-allowed opacity-40 hover:text-muted-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-4 min-w-0 overflow-x-clip">
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

        <div
          id="tabpanel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          className={activeTab !== 'summary' ? 'hidden' : ''}
        >
          <WipSummaryTab
            data={data}
            stationData={stationData}
            onBackToQuery={() => setActiveTab('query')}
            mfgType={queryParams?.mfgType}
            isLoading={isLoading}
            reportTime={reportTime}
            moCreateDateFrom={queryParams?.moCreateDateFrom}
            moCreateDateTo={queryParams?.moCreateDateTo}
            onRefetch={handleRefetch}
            onDrill={handleDrill}
          />
        </div>

        <div
          id="tabpanel-unit-sn-list"
          role="tabpanel"
          aria-labelledby="tab-unit-sn-list"
          className={activeTab !== 'unit-sn-list' ? 'hidden' : ''}
        >
          <WipUnitSnTab
            key={`${snSelection?.mode ?? ''}|${snSelection?.mo ?? ''}|${snSelection?.line ?? ''}|${snSelection?.station ?? ''}`}
            selection={snSelection}
            params={queryParams}
            queryKey={queryKey}
            onBackToSummary={() => setActiveTab('summary')}
          />
        </div>

        <div
          id="tabpanel-stations"
          role="tabpanel"
          aria-labelledby="tab-stations"
          className={activeTab !== 'stations' ? 'hidden' : ''}
        >
          <WipStationsTab />
        </div>
      </div>
    </div>
  );
}
