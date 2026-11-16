import { useState, useCallback, useMemo } from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/core/utils/utils';
import { WipQueryTab } from '@/pages/wip-report/_components/WipQueryTab';
import { WipSummaryTab } from '@/pages/wip-report/_components/WipSummaryTab';
import { WipUnitSnTab } from '@/pages/wip-report/_components/WipUnitSnTab';
import { WipStationsTab } from '@/pages/wip-report/_components/WipStationsTab';
import { useWipReport, useWipByStation } from '@/hooks/useWipReport';
import { drillFromColumnKey } from '@/pages/wip-report/utils/wipDrill';

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const enabled = queryParams !== null;

  const listParams = queryParams;

  const { data, isLoading, isFetching } = useWipReport({
    params: listParams,
    enabled,
    queryKey,
  });

  const { data: stationData } = useWipByStation({
    params: queryParams,
    enabled,
    queryKey,
  });

  const allRows = useMemo(() => data?.items ?? [], [data]);
  const totalItems = allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const safePage = Math.min(page, totalPages);

  const pagedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return {
      ...(data ?? {}),
      items: allRows.slice(start, start + pageSize),
      total: totalItems,
      page: safePage,
      pageSize,
      totalPages,
    };
  }, [data, allRows, safePage, pageSize, totalItems, totalPages]);

  function handleQuery(params) {
    setQueryParams(params);
    setPage(1);
    setReportTime(format(new Date(), 'yyyy/MM/dd HH:mm:ss'));
    setSnSelection(null);
    setActiveTab('summary');
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setPage(1);
  }

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
  }, []);

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
            data={pagedData}
            stationData={stationData}
            onBackToQuery={() => setActiveTab('query')}
            // Tên công đoạn (SMT/DIP/FA) để hiển thị; mã bộ phận đã gửi xuống SP
            // nằm trong `queryParams.mfgType`.
            mfgType={queryParams?.mfgTypeName}
            isLoading={isLoading}
            isFetching={isFetching}
            reportTime={reportTime}
            moCreateDateFrom={queryParams?.moCreateDateFrom}
            moCreateDateTo={queryParams?.moCreateDateTo}
            page={safePage}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
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
