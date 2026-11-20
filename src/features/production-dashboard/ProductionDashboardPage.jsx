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
import { findBottleneck, getSlotState } from '@/features/production-dashboard/utils/calc';
import { resolveUphTargetState } from '@/features/production-dashboard/utils/dashboardTargetUph';
import {
  DASHBOARD_CONFIG,
  getDashboardThemeStyle,
  getModelProfile,
  getModelStations,
} from '@/features/production-dashboard/utils/dashboardConfig';
import { buildLineConfig } from '@/features/production-dashboard/utils/lineConfig';
import { buildStationRows } from '@/features/production-dashboard/utils/stationRows';
import { useTheme } from '@/hooks/useTheme';
import { getDashboardCopy } from '@/features/production-dashboard/utils/dashboardStrings';
import { readPreference, writePreference } from '@/core/utils/preferences';
import { cn } from '@/core/utils/utils';
import { toast } from '@/components/ui/toast';
import { CascadeGate } from '@/features/production-dashboard/components/CascadeGate';
import { DashboardCharts } from '@/features/production-dashboard/components/DashboardCharts';
import { DashboardHeader } from '@/features/production-dashboard/components/DashboardHeader';
import { FlowStrip } from '@/features/production-dashboard/components/FlowStrip';
import { KpiCards } from '@/features/production-dashboard/components/KpiCards';
import { LinePickerDialog } from '@/features/production-dashboard/components/LinePickerDialog';
import { ScopeBar } from '@/features/production-dashboard/components/ScopeBar';
import { StationTable } from '@/features/production-dashboard/components/StationTable';
import { useStationColumns } from '@/features/production-dashboard/hooks/useStationColumns';
import { useWipLimit } from '@/features/production-dashboard/hooks/useWipLimit';
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
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'vi';

  const copy = useMemo(() => getDashboardCopy(t), [t]);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const themeStyle = useMemo(() => getDashboardThemeStyle(resolvedTheme), [resolvedTheme]);
  const columnSettings = useStationColumns();

  const urlLineId = searchParams.get('line');
  const urlMo = searchParams.get('mo') || searchParams.get('wo');
  const urlDate = searchParams.get('date');
  const urlShift = searchParams.get('shift');
  const [processChoice, setProcessChoice] = useState(null);
  const lineId = urlLineId || null;

  const [woValue, setWoValue] = useState(urlMo || null);
  const [shiftId, setShiftId] = useState(() => {
    if (urlShift === '1' || urlShift === 'day') return 'day';
    if (urlShift === '2' || urlShift === 'night') return 'night';
    return 'day';
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    if (urlDate) {
      const clean = urlDate.replace(/-/g, '');
      if (clean.length === 8) {
        const y = parseInt(clean.substring(0, 4), 10);
        const m = parseInt(clean.substring(4, 6), 10) - 1;
        const d = parseInt(clean.substring(6, 8), 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
    return new Date();
  });
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

  const {
    wipLimit,
    updateWipLimit,
    resetWipLimit,
    defaultLimit: defaultWipLimit,
  } = useWipLimit(process);

  const [woPickerOpen, setWoPickerOpen] = useState(false);

  // Chỉ kích hoạt query danh sách WO khi Modal chọn WO đang mở HOẶC khi đã có woValue (để lấy metadata model/partNumber)
  const shouldFetchWoList = Boolean(lineId && dateKey) && (woPickerOpen || Boolean(woValue));

  const { data: lines = [], isLoading: linesLoading } = useLines(deptCode);
  const { data: woList = [], isLoading: woLoading } = useMoByLine(
    lineId,
    dateKey.replace(/-/g, ''),
    { enabled: shouldFetchWoList }
  );
  const selectedWo = woValue ? (woList.find((w) => w.mo === woValue) ?? null) : null;
  const model = selectedWo?.partNumber ?? 'ALL';

  const group = process ?? mfgInfo?.mfgType ?? null;
  const [applied, setApplied] = useState(() => {
    if (urlLineId && urlMo && deptCode) {
      return {
        lineId: urlLineId,
        group: processChoice ?? null,
        dept: deptCode,
        mo: urlMo,
        date: dateKey,
        shift: shift.id,
      };
    }
    return null;
  });
  const canSearch = Boolean(lineId && shift && group && deptCode && woValue);

  // Lần đầu vào trang: nếu có URL mo nhưng chưa applied, nạp vào applied đúng 1 lần duy nhất lúc mount
  const isInitialMountRef = useRef(true);
  useEffect(() => {
    if (!isInitialMountRef.current) return;
    if (urlMo && !applied && lineId && shift && group && deptCode) {
      isInitialMountRef.current = false;
      setWoValue(urlMo);
      setApplied({
        lineId,
        group,
        dept: deptCode,
        mo: urlMo,
        date: dateKey,
        shift: shift.id,
      });
    }
  }, [urlMo, applied, lineId, shift, group, deptCode, dateKey]);

  useEffect(() => {
    if (!urlMo) {
      isInitialMountRef.current = false;
    }
  }, [urlMo]);

  const query = useDashboardData({
    lineId: applied?.lineId ?? null,
    dept: applied?.dept ?? null,
    process: applied?.group ?? null,
    model,
    mo: applied?.mo ?? null,
    date: applied?.date ?? null,
    shift: applied?.shift ?? null,
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
    flowStations,
  } = query;

  const { count: consecutiveFailures, reset: resetFailures } =
    useConsecutiveFailures(failureReason);

  const lineConfig = useMemo(
    () => buildLineConfig(flowStations, viewData?.stations ?? [], applied),
    [flowStations, viewData?.stations, applied]
  );

  const flowLoading = isLoading && !viewData;

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
    if (dateKey < todayKey) return slotList.map(() => 'complete');
    if (dateKey > todayKey) return slotList.map(() => 'future');
    return slotList.map((slot) => getSlotState(slot, clockMinuteDate, shift));
  }, [clockMinuteDate, shift, dateKey, todayKey, slots]);

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
    ]
  );

  const bottleneckId = useMemo(() => findBottleneck(stationRows), [stationRows]);

  const uphTargetState = useMemo(() => {
    const isReady = Boolean(viewData) && stationRows.length > 0 && !isLoading;
    if (!isReady) return null;

    return resolveUphTargetState({
      hasData: isReady,
      hasTarget: stationRows.some((station) => Number(station.targetUph) > 0),
      cycleTimeStatus: isError ? 'error' : 'success',
    });
  }, [viewData, stationRows, isLoading, isError]);

  const finalStationId = useMemo(() => {
    // Ưu tiên stationId được backend trả về trực tiếp trong hourly / uphTrend (trạm có sản lượng thực tế của ca)
    const backendStationId =
      viewData?.hourly?.find((h) => h.finalStationOutput?.stationId)?.finalStationOutput
        ?.stationId ?? viewData?.uphTrend?.find((u) => u.stationId)?.stationId;
    if (backendStationId) return backendStationId;

    // ìm trạm cuối cùng có sản lượng (actualOutput > 0) trong danh sách trạm
    const apiStations = viewData?.stations ?? [];
    const lastActiveStation = [...apiStations]
      .reverse()
      .find((s) => Number(s.actualOutput || 0) > 0);
    if (lastActiveStation?.stationId) return lastActiveStation.stationId;

    // Fallback: trạm cuối cùng của quy trình
    if (apiStations.length > 0) return apiStations.at(-1)?.stationId;
    if (flowStations.length > 0) return flowStations.at(-1)?.id;
    return stationRows.at(-1)?.stationId ?? null;
  }, [viewData?.hourly, viewData?.uphTrend, viewData?.stations, flowStations, stationRows]);

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
    isInitialMountRef.current = false;
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('line', nextLineId);
        n.delete('mo');
        n.delete('wo');
        return n;
      },
      { replace: true }
    );
  }

  function handleLineChange(nextLineId, nextProcess) {
    if (!nextLineId || typeof nextLineId !== 'string') return;
    isInitialMountRef.current = false;
    if (nextProcess && typeof nextProcess === 'string' && nextProcess !== process) {
      setProcessChoice(nextProcess);
    }
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('line', nextLineId);
        n.delete('mo');
        n.delete('wo');
        return n;
      },
      { replace: true }
    );
  }

  function handleProcessChange(nextProcess) {
    if (!nextProcess || nextProcess === process) return;
    isInitialMountRef.current = false;
    setProcessChoice(nextProcess);
    setWoValue(null);
    setApplied(null);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.delete('line');
        n.delete('mo');
        n.delete('wo');
        return n;
      },
      { replace: true }
    );
  }

  function handleDateChange(date) {
    if (!date) return;
    isInitialMountRef.current = false;
    const newDateKey = format(date, 'yyyy-MM-dd');
    woToastFiredRef.current = false;
    // Khi chọn Ngày: Reset ô WO về trạng thái chưa chọn, xóa applied để chờ người dùng bấm chọn WO hoặc bấm tìm kiếm
    setWoValue(null);
    setApplied(null);
    setSelectedDate(date);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('date', newDateKey);
        n.delete('mo');
        n.delete('wo');
        return n;
      },
      { replace: true }
    );
  }

  function handleWoChange(nextWo) {
    isInitialMountRef.current = false;
    setWoValue(nextWo);
    if (lineId && shift && group && deptCode && nextWo) {
      setApplied({
        lineId,
        group,
        dept: deptCode,
        mo: nextWo,
        date: dateKey,
        shift: shift.id,
      });
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.set('mo', nextWo);
          return n;
        },
        { replace: true }
      );
    }
  }

  function handleShiftChange(nextShiftId) {
    isInitialMountRef.current = false;
    setShiftId(nextShiftId);
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('shift', nextShiftId);
        return n;
      },
      { replace: true }
    );
    // Khi đổi ca: xóa applied để không tự động query, chỉ khi bấm tìm kiếm hoặc chọn MO mới query
    setApplied(null);
  }

  function handleSearch() {
    isInitialMountRef.current = false;
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
    setSearchParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set('mo', woValue);
        return n;
      },
      { replace: true }
    );
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
            stations={modelStations}
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
            woPickerOpen={woPickerOpen}
            onWoPickerOpenChange={setWoPickerOpen}
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

          {!applied ? (
            <CascadeGate
              title={copy.cascade.selectWoTitle || 'Vui lòng chọn lệnh sản xuất (WO)'}
              hint={
                copy.cascade.selectWoHint ||
                'Bấm vào ô Lệnh sản xuất (WO) ở trên để chọn đơn và theo dõi tiến độ.'
              }
            />
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
                summary={viewData?.summary}
                copy={copy}
                lineId={applied?.lineId || lineId}
                lineLabel={applied?.lineId || lineId}
                date={applied?.date || dateKey}
                shift={applied?.shift || shift}
                mo={applied?.mo}
                deptCode={applied?.deptCode}
                stations={modelStations}
                columnSettings={columnSettings}
                wipLimit={wipLimit}
                onWipLimitChange={updateWipLimit}
                onResetWipLimit={resetWipLimit}
                defaultWipLimit={defaultWipLimit}
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
                  onRetry={handleRetry}
                  copy={copy}
                />
                <FlowStrip
                  lineConfig={activeLineConfig}
                  stations={stationRows}
                  summary={viewData?.summary}
                  bottleneckId={bottleneckId}
                  wipLimit={wipLimit}
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
                  clockTime={clockMinuteDate}
                  shift={shift}
                  bottleneckId={bottleneckId}
                  wipLimit={wipLimit}
                  loading={isLoading}
                  error={Boolean(viewData?.errors?.stations) || globalError}
                  hourlyError={Boolean(viewData?.errors?.hourly)}
                  statusError={Boolean(viewData?.errors?.stationStatus)}
                  uphTargetState={uphTargetState}
                  onRetry={handleRetry}
                  copy={copy}
                  appliedFilters={{
                    mo: applied?.mo,
                    line: applied?.lineId,
                    sDate: applied?.date ? String(applied.date).replace(/-/g, '') : '',
                    shift: applied?.shift === 'night' ? '2' : '1',
                  }}
                  visibleColumns={columnSettings.columns}
                  themeStyle={themeStyle}
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

export default ProductionDashboardPage;
