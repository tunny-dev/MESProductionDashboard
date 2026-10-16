import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { LoadingOverlay, Spinner } from '@/components/ui/loading-overlay';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DataDownScreen } from '@/components/common/data-down-screen';
import { MAX_CONSECUTIVE_FAILURES, useConsecutiveFailures } from '@/hooks/use-consecutive-failures';
import { useStages } from '@/features/overview/hooks/use-production';
import {
  useLines,
  useMoByLine,
  useMoInfo,
  useMfgByLine,
} from '@/features/production-dashboard/hooks/use-line';
import { useDashboardData } from '@/features/production-dashboard/hooks/use-dashboard-data';
import {
  findBottleneck,
  getSlotState,
  getStationStatus,
} from '@/features/production-dashboard/lib/calc';
import { getTargetUph } from '@/features/production-dashboard/lib/dashboard-target-uph';
import {
  DASHBOARD_CONFIG,
  getDashboardThemeStyle,
  getModelProfile,
  getModelStations,
  getStationTargetUph,
} from '@/features/production-dashboard/lib/dashboard-config';
import { useTheme } from '@/hooks/use-theme';
import { getDashboardCopy } from '@/features/production-dashboard/lib/dashboard-copy';
import { readPreference, writePreference } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { DashboardCharts } from '@/features/production-dashboard/components/dashboard-charts';
import { DashboardHeader } from '@/features/production-dashboard/components/dashboard-header';
import { DashboardPartsInspector } from '@/features/production-dashboard/components/dashboard-parts-inspector';
import { FlowStrip } from '@/features/production-dashboard/components/flow-strip';
import { KpiCards } from '@/features/production-dashboard/components/kpi-cards';
import { LinePickerDialog } from '@/features/production-dashboard/components/line-picker-dialog';
import { ScopeBar } from '@/features/production-dashboard/components/scope-bar';
import { StationTable } from '@/features/production-dashboard/components/station-table';
import '@/features/production-dashboard/styles/production-dashboard.css';

const INITIAL_LOADING_OVERLAY_DELAY_MS = 0;
const INITIAL_LOADING_OVERLAY_MIN_VISIBLE_MS = 500;

const CHART_LAYOUTS = ['compact', 'balanced', 'stacked'];
const DEFAULT_CHART_LAYOUT = 'compact';

function getStoredChartLayout() {
  return readPreference('chart-layout', CHART_LAYOUTS, DEFAULT_CHART_LAYOUT);
}

export function ProductionDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'vi';

  const copy = useMemo(() => getDashboardCopy(language), [language]);
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
  const canSearch = Boolean(lineId && shift && group && woValue);
  const query = useDashboardData({
    lineId: applied?.lineId ?? null,
    group: applied?.group ?? null,
    model,
    mo: applied?.mo ?? null,
    date: applied?.date ?? null,
    shift: applied?.shift ?? null,
    scope: scopeId,
    enabled: Boolean(applied),
  });

  const {
    data,
    slots,
    isLoading,
    isFetching,
    isError,
    isRefetchError,
    failureReason,
    refetch,
    parts,
    flowStations,
  } = query;

  const viewData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      summary: {
        ...data.summary,
        targetUph: data.summary.targetUph ?? getTargetUph({ process, line: lineId }),
      },
    };
  }, [data, process, lineId]);

  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

  const lineConfig = useMemo(() => {
    if (!applied?.lineId) return null;

    const wipIds = new Set((viewData?.stations ?? []).map((s) => s.stationId));
    const flowQty = new Map(flowStations.map((s) => [s.id, s.qty]));
    const stationsFromWip = (viewData?.stations ?? []).map((s) => ({
      id: s.stationId,
      name: s.opName || s.stationName || s.stationId,
      shortName: s.opName || s.stationName || s.stationId,
      qty: flowQty.get(s.stationId) ?? null,
    }));

    const missingInWip = flowStations
      .filter((s) => !wipIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, shortName: s.shortName, qty: s.qty ?? null }));

    const stations = [...stationsFromWip, ...missingInWip];
    if (stations.length > 0) {
      return {
        id: applied.lineId,
        name: applied.lineId,
        type: applied.group ?? '',
        group: applied.group ?? '',
        models: [],
        modelProfiles: {},
        stations,
      };
    }
    return null;
  }, [flowStations, applied, viewData?.stations]);

  const flowLoading = parts.some((p) => p.key === 'flow' && p.status === 'loading');

  const { data: moInfo } = useMoInfo(applied?.mo ?? null, Boolean(applied));
  const displayWo = moInfo ?? selectedWo;

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTime((currentTime) => new Date(currentTime.getTime() + 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === document.documentElement);
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
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
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          nextParams.set('line', nextLine.id);
          return nextParams;
        },
        { replace: true }
      );
    }, DASHBOARD_CONFIG.autoRotate.intervalSec * 1000);

    return () => window.clearInterval(timer);
  }, [lineConfig, setSearchParams]);

  useEffect(() => {
    if (isLoading) {
      if (loadingOverlayVisible) return undefined;

      const showTimer = window.setTimeout(() => {
        loadingOverlayStartedAt.current = Date.now();
        setLoadingOverlayVisible(true);
      }, INITIAL_LOADING_OVERLAY_DELAY_MS);

      return () => window.clearTimeout(showTimer);
    }

    if (!loadingOverlayVisible) return undefined;

    const elapsed =
      loadingOverlayStartedAt.current === null ? 0 : Date.now() - loadingOverlayStartedAt.current;
    const remaining = Math.max(0, INITIAL_LOADING_OVERLAY_MIN_VISIBLE_MS - elapsed);
    const hideTimer = window.setTimeout(() => setLoadingOverlayVisible(false), remaining);

    return () => window.clearTimeout(hideTimer);
  }, [isLoading, loadingOverlayVisible]);

  const globalError = isError && !viewData;
  const isDisconnected = isRefetchError || globalError;

  const clockMinuteKey = Math.floor(clockTime.getTime() / 60000);
  const clockMinuteDate = useMemo(() => new Date(clockMinuteKey * 60000), [clockMinuteKey]);
  const todayKey = useMemo(() => format(clockMinuteDate, 'yyyy-MM-dd'), [clockMinuteDate]);
  const slotStates = useMemo(() => {
    const slotList = slots ?? [];
    if (!slotList.length) return [];
    if (scopeId === 'WO') return slotList.map(() => 'complete');
    if (dateKey < todayKey) return slotList.map(() => 'complete');
    if (dateKey > todayKey) return slotList.map(() => 'future');
    return slotList.map((slot) => getSlotState(slot, clockMinuteDate, shift));
  }, [clockMinuteDate, shift, dateKey, todayKey, slots, scopeId]);
  const lastCompletedSlotIndex = useMemo(() => {
    const current = slotStates.indexOf('current');
    if (current > 0) return current - 1;
    return slotStates.lastIndexOf('complete');
  }, [slotStates]);
  const isViewingCurrentShift = useMemo(() => dateKey === todayKey, [dateKey, todayKey]);
  const shiftEndDate = useMemo(() => {
    const slots = shift?.slots ?? [];
    const endMinute = slots.at(-1)?.endMinute ?? 1440;
    const end = new Date(`${dateKey}T00:00:00`);
    end.setMinutes(endMinute);
    return end;
  }, [dateKey, shift]);

  const stationRows = useMemo(() => {
    const apiStations = viewData?.stations ?? [];
    const statusNow = isViewingCurrentShift ? clockMinuteDate : shiftEndDate;

    if (apiStations.length > 0) {
      return apiStations.map((station) => {
        const name = station.opName || station.stationName || station.stationId;
        return {
          ...station,
          id: station.stationId,
          name,
          shortName: name,
          stationId: station.stationId,
          targetUph: getTargetUph({
            process,
            line: station.line ?? lineId,
            op: station.stationId,
            apiTarget: station.targetUph,
          }),
          ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
          status: getStationStatus(station, {
            lastCompletedSlotIndex,
            isCurrentShift: isViewingCurrentShift,
            now: statusNow,
          }),
        };
      });
    }

    if (!activeLineConfig) return [];
    const metricsById = new Map(apiStations.map((station) => [station.stationId, station]));
    return activeLineConfig.stations.map((stationConfig) => {
      const configuredTargetUph = getStationTargetUph(lineConfig, model, stationConfig.id);
      const metrics = metricsById.get(stationConfig.id) || {};

      return {
        ...stationConfig,
        ...metrics,
        ...(configuredTargetUph !== undefined ? { targetUph: configuredTargetUph } : {}),
        targetUph: getTargetUph({
          process,
          line: metrics.line ?? lineId,
          op: stationConfig.id,
          apiTarget: metrics.targetUph ?? configuredTargetUph,
        }),
        ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
        stationId: stationConfig.id,
        status: getStationStatus(metrics, {
          lastCompletedSlotIndex,
          isCurrentShift: isViewingCurrentShift,
          now: statusNow,
        }),
      };
    });
  }, [
    activeLineConfig,
    viewData?.stations,
    lineConfig,
    model,
    modelProfile,
    process,
    lineId,
    lastCompletedSlotIndex,
    isViewingCurrentShift,
    clockMinuteDate,
    shiftEndDate,
  ]);
  const bottleneckId = useMemo(() => findBottleneck(stationRows), [stationRows]);
  const lastUpdated =
    viewData?.updatedAt && Number.isFinite(new Date(viewData.updatedAt).getTime())
      ? format(new Date(viewData.updatedAt), 'HH:mm:ss')
      : '—';

  function handleLineChangeFromHeader(nextLineId) {
    if (!nextLineId || typeof nextLineId !== 'string') return;
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set('line', nextLineId);
        return nextParams;
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
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.set('line', nextLineId);
        return nextParams;
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
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.delete('line');
        return nextParams;
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
    if (!lineId || !shift || !group || !woValue) return;
    setApplied({
      lineId,
      group,
      mo: woValue,
      date: dateKey,
      shift: shift.id,
    });
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
              <CascadeGate title={copy.loading} hint={copy.cascade.flowHint} loading />
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
            // Sập hẳn: một màn lỗi chung thay vì năm khối đỏ rời rạc.
            <DataDownScreen onRetry={handleRetry} />
          ) : !viewData && isError ? (
            // Hỏng lẻ tẻ, chưa đủ ngưỡng sập: một panel gọn, poll sau tự thử lại.
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
                  scope={scopeId}
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
                  copy={copy}
                />
                <DashboardCharts
                  hourly={viewData?.hourly}
                  uphTrend={viewData?.uphTrend}
                  stations={stationRows}
                  finalStationId={stationRows.at(-1)?.stationId}
                  slots={slots}
                  slotStates={slotStates}
                  loading={isLoading}
                  hourlyError={Boolean(viewData?.errors?.hourly)}
                  uphTrendError={Boolean(viewData?.errors?.uphTrend)}
                  stationsError={Boolean(viewData?.errors?.stations)}
                  globalError={globalError}
                  bottleneckId={bottleneckId}
                  copy={copy}
                  lineType={lineConfig.type}
                  chartLayout={chartLayout}
                  onChartLayoutChange={setChartLayout}
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

function CascadeGate({ title, hint, action, loading = false }) {
  return (
    <Empty className="flex-1 border border-solid border-border bg-surface py-16">
      <EmptyHeader>
        {loading ? <Spinner className="mx-auto mb-2 text-production-blue" label={title} /> : null}
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        <EmptyDescription>{hint}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}
