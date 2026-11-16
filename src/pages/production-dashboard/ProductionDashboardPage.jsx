import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DataDownScreen } from '@/components/common/DataDownScreen';
import { MAX_CONSECUTIVE_FAILURES, useConsecutiveFailures } from '@/hooks/useConsecutiveFailures';
import { useStages } from '@/hooks/useProduction';
import { useLines, useMoByLine, useMoInfo, useMfgByLine } from '@/hooks/useLine';
import { useDashboardData } from '@/hooks/useDashboardData';
import { findBottleneck, getSlotState } from '@/pages/production-dashboard/utils/calc';
import { resolveUphTargetState } from '@/pages/production-dashboard/utils/dashboardTargetUph';
import {
  DASHBOARD_CONFIG,
  getDashboardThemeStyle,
  getModelProfile,
  getModelStations,
} from '@/pages/production-dashboard/utils/dashboardConfig';
import { buildLineConfig } from '@/pages/production-dashboard/utils/lineConfig';
import { buildStationRows } from '@/pages/production-dashboard/utils/stationRows';
import { useTheme } from '@/hooks/useTheme';
import { getDashboardCopy } from '@/pages/production-dashboard/utils/dashboardStrings';
import { readPreference, writePreference } from '@/core/utils/preferences';
import { cn } from '@/core/utils/utils';
import { toast } from '@/components/ui/toast';
import { CascadeGate } from '@/pages/production-dashboard/_components/CascadeGate';
import { DashboardCharts } from '@/pages/production-dashboard/_components/DashboardCharts';
import { DashboardHeader } from '@/pages/production-dashboard/_components/DashboardHeader';
import { DashboardPartsInspector } from '@/pages/production-dashboard/_components/DashboardPartsInspector';
import { FlowStrip } from '@/pages/production-dashboard/_components/FlowStrip';
import { KpiCards } from '@/pages/production-dashboard/_components/KpiCards';
import { LinePickerDialog } from '@/pages/production-dashboard/_components/LinePickerDialog';
import { ScopeBar } from '@/pages/production-dashboard/_components/ScopeBar';
import { StationTable } from '@/pages/production-dashboard/_components/StationTable';
import '@/pages/production-dashboard/styles/production-dashboard.css';

const INITIAL_LOADING_OVERLAY_DELAY_MS = 0;
const INITIAL_LOADING_OVERLAY_MIN_VISIBLE_MS = 500;

const CHART_LAYOUTS = ['compact', 'balanced', 'stacked'];
const DEFAULT_CHART_LAYOUT = 'compact';

function getStoredChartLayout() {
  return readPreference('chart-layout', CHART_LAYOUTS, DEFAULT_CHART_LAYOUT);
}

export function ProductionDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'vi';

  const copy = useMemo(() => getDashboardCopy(t), [t]);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const themeStyle = useMemo(() => getDashboardThemeStyle(resolvedTheme), [resolvedTheme]);

  const urlLineId = searchParams.get('line');
  const debugMode = searchParams.get('debug') === '1';
  const [processChoice, setProcessChoice] = useState(null);
  const lineId = urlLineId || null;

  const [woValue, setWoValue] = useState(null);
  const [shiftId, setShiftId] = useState('day');
  const [scopeId, setScopeId] = useState('DAY');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const shift =
    DASHBOARD_CONFIG.shifts.find((item) => item.id === shiftId) || DASHBOARD_CONFIG.shifts[0];
  const [clockTime, setClockTime] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenUnsupported, setFullscreenUnsupported] = useState(false);
  const [chartLayout, setChartLayoutState] = useState(getStoredChartLayout);

  const [linePickerOpen, setLinePickerOpen] = useState(() => !searchParams.has('line'));
  const [loadingOverlayVisible, setLoadingOverlayVisible] = useState(false);
  const loadingOverlayStartedAt = useRef(null);

  const setChartLayout = useCallback(
    (nextLayout) => {
      setChartLayoutState((current) => {
        if (nextLayout === current) return current;
        writePreference('chart-layout', nextLayout);
        return nextLayout;
      });
    },
    [setChartLayoutState]
  );

  const { data: stageList } = useStages();
  const processes =
    Array.isArray(stageList) && stageList.length > 0
      ? stageList.map((s) => (typeof s === 'string' ? s : s.id))
      : DASHBOARD_CONFIG.processes;

  const { data: mfgInfo } = useMfgByLine(lineId);
  const process = processChoice ?? mfgInfo?.mfgType ?? null;

  const deptCode = useMemo(() => {
    if (mfgInfo?.mfgCode) return mfgInfo.mfgCode;
    if (!process || !Array.isArray(stageList)) return null;
    const found = stageList.find((s) => (typeof s === 'string' ? s : s.id) === process);
    return found?.deptCode ?? null;
  }, [mfgInfo?.mfgCode, process, stageList]);

  const { data: lines = [], isLoading: linesLoading } = useLines(deptCode);
  const { data: woList = [], isLoading: woLoading } = useMoByLine(
    lineId,
    dateKey.replace(/-/g, '')
  );
  const selectedWo = woValue ? (woList.find((w) => w.mo === woValue) ?? null) : null;
  const model = selectedWo?.partNumber ?? 'ALL';

  const group = process ?? mfgInfo?.mfgType ?? null;
  const [applied, setApplied] = useState(null);
  const canSearch = Boolean(lineId && shift && group && deptCode && woValue);

  const query = useDashboardData({
    lineId: applied?.lineId ?? null,
    dept: applied?.dept ?? null,
    process: applied?.group ?? null,
    model,
    mo: applied?.mo ?? null,
    date: applied?.date ?? null,
    shift: applied?.shift ?? null,
    scope: scopeId,
    enabled: Boolean(applied),
  });

  const {
    viewData,
    slots,
    isLoading,
    isFetching,
    isError,
    isRefetchError,
    failureReason,
    refetch,
    parts,
    flowStations,
    cycleTimeTargetMap,
  } = query;

  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

  const routingMode = scopeId === 'ROUTING';
  const displayScope = routingMode ? 'WO' : scopeId;

  const lineConfig = useMemo(
    () => buildLineConfig(flowStations, viewData?.stations ?? [], applied),
    [flowStations, viewData?.stations, applied]
  );

  const flowLoading = parts.some((p) => p.key === 'flow' && p.status === 'loading');

  const { data: moInfo } = useMoInfo(applied?.mo ?? null, Boolean(applied));
  const displayWo = moInfo ?? selectedWo;

  const lineLabel = useMemo(() => {
    if (!lineId) return '';
    return lines.find((l) => l.id === lineId)?.name ?? lineConfig?.name ?? lineId;
  }, [lineId, lines, lineConfig]);

  const woLabel = !woValue ? '' : (selectedWo?.mo ?? woValue);
  const modelProfile = lineConfig ? getModelProfile(lineConfig, model) : null;
  const modelStations = useMemo(
    () => (lineConfig ? getModelStations(lineConfig, model) : []),
    [lineConfig, model]
  );
  const activeLineConfig = useMemo(
    () => (lineConfig ? { ...lineConfig, stations: modelStations } : null),
    [lineConfig, modelStations]
  );

  const clockMinuteKey = Math.floor(clockTime.getTime() / 60000);
  const clockMinuteDate = useMemo(() => new Date(clockMinuteKey * 60000), [clockMinuteKey]);
  const todayKey = useMemo(() => format(clockMinuteDate, 'yyyy-MM-dd'), [clockMinuteDate]);
  const isViewingCurrentShift = useMemo(() => dateKey === todayKey, [dateKey, todayKey]);
  const shiftEndDate = useMemo(() => {
    const slotList = shift?.slots ?? [];
    const endMinute = slotList.at(-1)?.endMinute ?? 1440;
    const end = new Date(`${dateKey}T00:00:00`);
    end.setMinutes(endMinute);
    return end;
  }, [dateKey, shift]);

  const slotStates = useMemo(() => {
    const slotList = slots ?? [];
    if (!slotList.length) return [];
    if (scopeId === 'WO' || scopeId === 'ROUTING') return slotList.map(() => 'complete');
    if (dateKey < todayKey) return slotList.map(() => 'complete');
    if (dateKey > todayKey) return slotList.map(() => 'future');
    return slotList.map((slot) => getSlotState(slot, clockMinuteDate, shift));
  }, [clockMinuteDate, shift, dateKey, todayKey, slots, scopeId]);

  const lastCompletedSlotIndex = useMemo(() => {
    const current = slotStates.indexOf('current');
    if (current > 0) return current - 1;
    return slotStates.lastIndexOf('complete');
  }, [slotStates]);

  const stationRows = useMemo(
    () =>
      buildStationRows({
        apiStations: viewData?.stations ?? [],
        activeLineConfig,
        lineConfig,
        model,
        modelProfile,
        process,
        lineId,
        lastCompletedSlotIndex,
        isViewingCurrentShift,
        clockMinuteDate,
        shiftEndDate,
        cycleTimeTargetMap,
        scopeId,
        summary: viewData?.summary,
      }),
    [
      viewData?.stations,
      viewData?.summary,
      activeLineConfig,
      lineConfig,
      model,
      modelProfile,
      process,
      lineId,
      lastCompletedSlotIndex,
      isViewingCurrentShift,
      clockMinuteDate,
      shiftEndDate,
      cycleTimeTargetMap,
      scopeId,
    ]
  );

  const bottleneckId = useMemo(() => findBottleneck(stationRows), [stationRows]);

  const uphTargetState = useMemo(() => {
    const cyclePart = parts.find((part) => part.key === 'cycleTime');
    // Chỉ kiểm tra cảnh báo khi cả bảng trạm VÀ query cycleTime đã tải xong hoàn toàn (tránh race condition báo động giả)
    const isReady =
      Boolean(viewData) &&
      stationRows.length > 0 &&
      cyclePart?.status !== 'loading' &&
      cyclePart?.status !== 'idle';
    if (!isReady) return null;

    return resolveUphTargetState({
      hasData: isReady,
      hasTarget: stationRows.some((station) => Number(station.targetUph) > 0),
      cycleTimeStatus: cyclePart?.status,
    });
  }, [parts, viewData, stationRows]);

  const finalStationId = useMemo(() => {
    const apiStations = viewData?.stations ?? [];
    if (apiStations.length > 0) return apiStations.at(-1)?.stationId;
    if (flowStations.length > 0) return flowStations.at(-1)?.id;
    return stationRows.at(-1)?.stationId ?? null;
  }, [viewData?.stations, flowStations, stationRows]);

  const lastUpdated =
    viewData?.updatedAt && Number.isFinite(new Date(viewData.updatedAt).getTime())
      ? format(new Date(viewData.updatedAt), 'HH:mm:ss')
      : '—';

  const globalError = isError && !viewData;
  const isDisconnected = isRefetchError || globalError;

  const woToastFiredRef = useRef(false);
  useEffect(() => {
    if (!woLoading && applied && Boolean(lineId)) {
      if (woList.length === 0 && !woToastFiredRef.current) {
        woToastFiredRef.current = true;
        toast.add({
          title: copy.kpi.moInfo,
          description: copy.kpi.noWo,
          type: 'warning',
          timeout: 5000,
        });
      }
      if (woList.length > 0) woToastFiredRef.current = false;
    }
  }, [woLoading, applied, lineId, woList.length, copy.kpi.moInfo, copy.kpi.noWo]);

  const uphTargetToastRef = useRef({ key: null, state: null });
  useEffect(() => {
    if (!applied) {
      uphTargetToastRef.current = { key: null, state: null };
      return;
    }
    const key = [applied.mo, applied.lineId, applied.date, applied.shift].join('|');
    if (!uphTargetState) {
      uphTargetToastRef.current = { key, state: null };
      return;
    }
    if (uphTargetToastRef.current.key === key && uphTargetToastRef.current.state === uphTargetState)
      return;
    uphTargetToastRef.current = { key, state: uphTargetState };
    toast.add(
      uphTargetState === 'error'
        ? {
            title: copy.kpi.cycleTimeErrorTitle,
            description: copy.kpi.cycleTimeErrorDesc,
            type: 'warning',
            timeout: 6000,
          }
        : {
            title: copy.kpi.cycleTimeMissingTitle,
            description: copy.kpi.cycleTimeMissingDesc,
            type: 'warning',
            timeout: 6000,
          }
    );
  }, [applied, uphTargetState, copy]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === document.documentElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!DASHBOARD_CONFIG.autoRotate.enabled || !lineConfig || DASHBOARD_CONFIG.lines.length < 2)
      return undefined;
    const timer = window.setInterval(() => {
      const currentIndex = DASHBOARD_CONFIG.lines.findIndex((line) => line.id === lineConfig.id);
      const nextLine = DASHBOARD_CONFIG.lines[(currentIndex + 1) % DASHBOARD_CONFIG.lines.length];
      setWoValue(null);
      setProcessChoice(nextLine.group);
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.set('line', nextLine.id);
          return n;
        },
        { replace: true }
      );
    }, DASHBOARD_CONFIG.autoRotate.intervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [lineConfig, setSearchParams]);

  useEffect(() => {
    if (isLoading) {
      if (loadingOverlayVisible) return undefined;
      const t = window.setTimeout(() => {
        loadingOverlayStartedAt.current = Date.now();
        setLoadingOverlayVisible(true);
      }, INITIAL_LOADING_OVERLAY_DELAY_MS);
      return () => window.clearTimeout(t);
    }
    if (!loadingOverlayVisible) return undefined;
    const elapsed =
      loadingOverlayStartedAt.current === null ? 0 : Date.now() - loadingOverlayStartedAt.current;
    const remaining = Math.max(0, INITIAL_LOADING_OVERLAY_MIN_VISIBLE_MS - elapsed);
    const t = window.setTimeout(() => setLoadingOverlayVisible(false), remaining);
    return () => window.clearTimeout(t);
  }, [isLoading, loadingOverlayVisible]);

  function handleLineChangeFromHeader(nextLineId) {
    if (!nextLineId || typeof nextLineId !== 'string') return;
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('line', nextLineId);
        return n;
      },
      { replace: true }
    );
  }

  function handleLineChange(nextLineId, nextProcess) {
    if (!nextLineId || typeof nextLineId !== 'string') return;
    if (nextProcess && typeof nextProcess === 'string' && nextProcess !== process) {
      setProcessChoice(nextProcess);
    }
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('line', nextLineId);
        return n;
      },
      { replace: true }
    );
  }

  function handleProcessChange(nextProcess) {
    if (!nextProcess || nextProcess === process) return;
    setProcessChoice(nextProcess);
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.delete('line');
        return n;
      },
      { replace: true }
    );
  }

  function handleDateChange(date) {
    if (!date) return;
    if (format(date, 'yyyy-MM-dd') !== dateKey) {
      setWoValue(null);
      woToastFiredRef.current = false;
      setApplied(null);
    }
    setSelectedDate(date);
  }

  function handleWoChange(nextWo) {
    setWoValue(nextWo);
    setApplied(null);
  }

  function handleShiftChange(nextShiftId) {
    setShiftId(nextShiftId);
    setApplied(null);
  }

  function handleScopeChange(nextScopeId) {
    setScopeId(nextScopeId);
  }

  function handleSearch() {
    if (!lineId || !shift || !group || !deptCode || !woValue) return;
    const next = { lineId, group, dept: deptCode, mo: woValue, date: dateKey, shift: shift.id };
    const unchanged =
      applied !== null &&
      applied.lineId === next.lineId &&
      applied.dept === next.dept &&
      applied.mo === next.mo &&
      applied.date === next.date &&
      applied.shift === next.shift;
    setApplied(next);
    if (unchanged) refetch();
  }

  function handleLinePickerApply(nextLineId, nextProcess) {
    handleLineChange(nextLineId, nextProcess);
    setLinePickerOpen(false);
  }

  function handleRetry() {
    resetFailures();
    refetch();
  }

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (!document.documentElement.requestFullscreen) {
        setFullscreenUnsupported(true);
        return;
      }
      setFullscreenUnsupported(false);
      await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenUnsupported(true);
    }
  }, [setFullscreenUnsupported]);

  return (
    <TooltipProvider delay={180}>
      <main
        className="production-dashboard fixed inset-0 overflow-x-hidden overflow-y-auto bg-background text-foreground"
        style={themeStyle}
        aria-busy={isLoading}
      >
        <div className="production-dashboard__layout mx-auto flex min-h-dvh w-full max-w-[2200px] flex-col gap-2.5 p-3 sm:p-4 xl:gap-3 xl:p-4">
          <DashboardHeader
            lineType={lineConfig?.type ?? process ?? ''}
            language={language}
            process={process}
            processes={processes}
            lines={lines}
            linesLoading={linesLoading}
            lineId={lineId}
            lineLabel={lineLabel}
            wo={woValue}
            woLabel={woLabel}
            woList={woList}
            woLoading={woLoading}
            shiftId={shift?.id ?? null}
            selectedDate={selectedDate}
            dateDisabled={!lineId}
            clockTime={clockTime}
            lastUpdated={lastUpdated}
            isFetching={isFetching && !isLoading}
            isSearching={isLoading || isFetching}
            isDisconnected={isDisconnected}
            isFullscreen={isFullscreen}
            fullscreenUnsupported={fullscreenUnsupported}
            theme={theme}
            themeStyle={themeStyle}
            copy={copy}
            onProcessChange={handleProcessChange}
            onLineChange={handleLineChangeFromHeader}
            onWoChange={handleWoChange}
            onShiftChange={handleShiftChange}
            onDateChange={handleDateChange}
            onSearch={handleSearch}
            canSearch={canSearch}
            onThemeChange={setTheme}
            onToggleFullscreen={toggleFullscreen}
            onRetry={handleRetry}
          />

          {debugMode ? <DashboardPartsInspector parts={parts} /> : null}

          {!applied ? (
            <CascadeGate title={copy.cascade.searchTitle} hint={copy.cascade.searchHint} />
          ) : !lineConfig ? (
            flowLoading ? (
              <CascadeGate
                title={copy.cascade.flowLoadingTitle}
                hint={copy.cascade.flowLoadingHint}
                loading
              />
            ) : (
              <CascadeGate
                title={copy.cascade.flowTitle}
                hint={copy.cascade.flowHint}
                action={
                  <Button type="button" variant="outline" onClick={handleRetry}>
                    {copy.retry}
                  </Button>
                }
              />
            )
          ) : !viewData && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? (
            <DataDownScreen onRetry={handleRetry} />
          ) : !viewData && isError ? (
            <CascadeGate
              title={copy.errors.initial}
              hint={copy.errors.allSources}
              action={
                <Button type="button" variant="outline" onClick={handleRetry}>
                  {copy.retry}
                </Button>
              }
            />
          ) : (
            <>
              <ScopeBar
                scope={scopeId}
                onScopeChange={handleScopeChange}
                summary={viewData?.summary}
                copy={copy}
              />
              <div
                className={cn(
                  'grid flex-1 grid-cols-1 items-start gap-2.5 xl:gap-3',
                  chartLayout === 'compact'
                    ? 'xl:grid-rows-[auto_auto_minmax(200px,1fr)_auto]'
                    : 'xl:grid-rows-none'
                )}
              >
                <KpiCards
                  summary={viewData?.summary}
                  selectedWo={displayWo}
                  loading={isLoading}
                  error={Boolean(viewData?.errors?.summary) || globalError}
                  uphTargetState={uphTargetState}
                  scope={displayScope}
                  onRetry={handleRetry}
                  copy={copy}
                />
                <FlowStrip
                  lineConfig={activeLineConfig}
                  stations={stationRows}
                  summary={viewData?.summary}
                  bottleneckId={bottleneckId}
                  statusError={Boolean(viewData?.errors?.stationStatus)}
                  themeStyle={themeStyle}
                  copy={copy}
                />
                <StationTable
                  lineConfig={activeLineConfig}
                  stations={stationRows}
                  summary={viewData?.summary}
                  slots={slots}
                  slotStates={slotStates}
                  bottleneckId={bottleneckId}
                  loading={isLoading}
                  error={Boolean(viewData?.errors?.stations) || globalError}
                  hourlyError={Boolean(viewData?.errors?.hourly)}
                  statusError={Boolean(viewData?.errors?.stationStatus)}
                  uphTargetState={uphTargetState}
                  onRetry={handleRetry}
                  copy={copy}
                />
                <DashboardCharts
                  hourly={viewData?.hourly}
                  uphTrend={viewData?.uphTrend}
                  stations={stationRows}
                  finalStationId={finalStationId}
                  slots={slots}
                  slotStates={slotStates}
                  loading={isLoading}
                  hourlyError={Boolean(viewData?.errors?.hourly)}
                  uphTrendError={Boolean(viewData?.errors?.uphTrend)}
                  stationsError={Boolean(viewData?.errors?.stations)}
                  globalError={globalError}
                  bottleneckId={bottleneckId}
                  copy={copy}
                  scope={displayScope}
                  lineType={lineConfig.type}
                  chartLayout={chartLayout}
                  onChartLayoutChange={setChartLayout}
                  onRetry={handleRetry}
                />
              </div>
            </>
          )}
        </div>
        <LoadingOverlay active={loadingOverlayVisible} label={copy.loading} />
        {linePickerOpen ? (
          <LinePickerDialog
            open
            onOpenChange={setLinePickerOpen}
            stageList={stageList ?? []}
            onApply={handleLinePickerApply}
            copy={copy}
          />
        ) : null}
      </main>
    </TooltipProvider>
  );
}
