import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sun,
  Moon,
  Calendar,
  Clock,
  Languages,
  Activity,
} from 'lucide-react';

import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useLineProductionBoard } from '@/hooks/useProductionBoard';
import { useTheme } from '@/hooks/useTheme';
import { changeLanguage } from '@/core/i18n/i18n';
import { formatNumber } from '@/core/utils/format';
import { cn } from '@/core/utils/utils';

export function ProductionBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { resolvedTheme, toggleTheme } = useTheme();

  const hasLineParam = Boolean(searchParams.get('line'));
  const lineParam = searchParams.get('line') || 'A101';
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyyMMdd');
  const shiftParam =
    searchParams.get('shift') ||
    (new Date().getHours() >= 8 && new Date().getHours() < 20 ? '1' : '2');
  const moParam = searchParams.get('mo') || '';
  const stationParam = searchParams.get('station') || '';

  // Khi truy cập /production-board mà không có line, tự động điều hướng về production-dashboard
  useEffect(() => {
    if (!hasLineParam) {
      navigate('/production-dashboard?line=A101', { replace: true });
    }
  }, [hasLineParam, navigate]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [clockTime, setClockTime] = useState(new Date());

  // Trạng thái LoadingOverlay chuẩn theo production-dashboard
  const [loadingOverlayVisible, setLoadingOverlayVisible] = useState(false);
  const loadingOverlayStartedAt = useRef(null);

  // Đồng hồ thực tế mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dữ liệu
  const {
    data: boardData,
    isLoading,
    refetch,
    isFetching,
  } = useLineProductionBoard(
    {
      line: lineParam,
      date: dateParam,
      shift: shiftParam,
      mo: moParam,
      station: stationParam,
    },
    {
      refetchInterval: 30_000,
    }
  );

  const handleSelectStation = useCallback(
    (stId) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (stId) {
          next.set('station', stId);
        } else {
          next.delete('station');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // LoadingOverlay
  useEffect(() => {
    if (isLoading || (!boardData && isFetching)) {
      if (loadingOverlayVisible) return undefined;
      loadingOverlayStartedAt.current = Date.now();
      setLoadingOverlayVisible(true);
      return undefined;
    }
    if (!loadingOverlayVisible) return undefined;
    const elapsed =
      loadingOverlayStartedAt.current === null ? 0 : Date.now() - loadingOverlayStartedAt.current;
    const remaining = Math.max(0, 500 - elapsed);
    const timeoutId = window.setTimeout(() => setLoadingOverlayVisible(false), remaining);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, isFetching, boardData, loadingOverlayVisible]);

  // Đếm ngược 30 giây làm mới
  useEffect(() => {
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [boardData]);

  // Xử lý bật/tắt toàn màn hình
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Chuyển đổi ngôn ngữ vòng tròn (vi -> en -> zh -> vi)
  const handleToggleLanguage = useCallback(() => {
    const current = i18n.resolvedLanguage || i18n.language || 'vi';
    const next = current === 'vi' ? 'en' : current === 'en' ? 'zh' : 'vi';
    changeLanguage(next);
  }, [i18n]);

  const perf = boardData?.performance ?? {};
  const curMo = boardData?.currentMo ?? {};

  // Số liệu tính toán lấy từ API
  const curMoProgressPct = Number(curMo.completedPercent ?? 0);
  const outputPlan = perf.outputPlan ?? 0;
  const gap = perf.gap ?? 0;
  const isGapPositive = gap >= 0;
  const efficiencyRate = Number(perf.uphEfficiencyPercent ?? perf.achievementPercent ?? 0);

  // Format ngày hiển thị: YYYY-MM-DD
  const formattedDate = useMemo(() => {
    if (!dateParam || dateParam.length !== 8) return format(clockTime, 'yyyy-MM-dd');
    return `${dateParam.substring(0, 4)}-${dateParam.substring(4, 6)}-${dateParam.substring(6, 8)}`;
  }, [dateParam, clockTime]);

  const shiftLabel =
    shiftParam === '1' || shiftParam === 'day'
      ? t('productionBoard.dayShift')
      : t('productionBoard.nightShift');

  return (
    <div className="relative flex min-h-screen lg:h-screen w-full flex-col overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-[#eef2f6] dark:bg-[#07090e] font-sans text-foreground antialiased select-none transition-colors duration-200">
      <LoadingOverlay active={loadingOverlayVisible} label={t('productionBoard.loading')} />

      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/80 bg-white/95 dark:bg-[#090d14]/95 backdrop-blur-sm px-2.5 sm:px-4 gap-2 shadow-xs z-10">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/production-dashboard')}
            className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
            title={t('productionBoard.backToDashboard')}
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="hidden md:inline">{t('productionBoard.backToDashboard')}</span>
          </Button>

          <div className="hidden sm:block h-4 w-px bg-border/80 shrink-0" />

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shrink-0 shadow-2xs">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('productionBoard.line')}:
            </span>
            <strong className="text-foreground font-black text-xs sm:text-sm tracking-tight">
              {boardData?.lineCode || lineParam}
            </strong>
          </div>

          {boardData?.isHistorical ? (
            <Badge
              variant="outline"
              className="hidden xl:inline-flex border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            >
              {t('productionBoard.historicalBadge', 'LỊCH SỬ (CA ĐÃ ĐÓNG)')}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="hidden xl:inline-flex border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            >
              {t('productionBoard.liveBadge')}
            </Badge>
          )}

          <div className="hidden lg:flex items-center gap-1.5 shrink-0 ml-1">
            <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-50/80 dark:bg-zinc-900/80 px-2.5 py-1 text-xs font-medium text-foreground whitespace-nowrap shadow-2xs">
              <Clock className="size-3 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap font-bold text-xs">
                {boardData?.shiftName || shiftLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-slate-50/80 dark:bg-zinc-900/80 px-2.5 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap shadow-2xs">
              <Calendar className="size-3 text-indigo-500 shrink-0" />
              <span className="font-semibold text-xs">{formattedDate}</span>
            </div>
          </div>

          {boardData?.stations?.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase hidden sm:inline">
                {t('productionBoard.station')}:
              </span>
              <Select
                value={stationParam || '__DEFAULT__'}
                onValueChange={(val) => handleSelectStation(val === '__DEFAULT__' ? '' : val)}
              >
                <SelectTrigger
                  className="h-7.5 min-w-35 max-w-50 sm:max-w-65 md:max-w-75 px-2.5 py-0.5 text-xs font-bold rounded-lg border-border/80 bg-slate-50/90 dark:bg-zinc-900/90 shadow-2xs"
                  aria-label={t('productionBoard.selectStation')}
                >
                  <SelectValue placeholder={t('productionBoard.selectStation')} />
                </SelectTrigger>
                <SelectContent align="start" className="min-w-60 max-h-72">
                  <SelectItem value="__DEFAULT__">
                    <span className="font-bold text-production-blue">
                      {t('productionBoard.allStations', {
                        name:
                          boardData?.stations?.find(
                            (s) =>
                              s.stationId ===
                              (boardData?.selectedStationCode ||
                                boardData?.performance?.finalStationCode)
                          )?.stationName || 'Trạm cuối',
                      })}
                    </span>
                  </SelectItem>
                  {boardData.stations.map((st) => (
                    <SelectItem key={st.stationId} value={st.stationId}>
                      <span className="font-medium">
                        {st.seq} · {st.stationId} - {st.stationName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {!boardData?.isHistorical && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              <span className="hidden sm:inline font-semibold text-[11px] text-amber-700 dark:text-amber-300">
                {t('productionBoard.refreshIn', { seconds: countdown }).split(':')[0]}:
              </span>
              <span className="font-black tabular-nums text-amber-600 dark:text-amber-400 text-xs">
                {countdown}s
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title={t('productionBoard.refreshNow')}
            className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-white dark:bg-zinc-900 text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw
              className={cn('size-3.5', isFetching && 'animate-spin text-production-blue')}
            />
          </button>

          <button
            type="button"
            onClick={handleToggleLanguage}
            title={`Ngôn ngữ: ${i18n.language?.toUpperCase() || 'VI'} (Nhấn để chuyển)`}
            className="flex h-7.5 px-2.5 items-center gap-1.5 rounded-lg border border-border bg-white dark:bg-zinc-900 text-xs font-bold text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors uppercase shadow-2xs cursor-pointer"
          >
            <Languages className="size-3.5 text-muted-foreground" />
            <span>{i18n.resolvedLanguage || i18n.language || 'vi'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            title={
              resolvedTheme === 'dark'
                ? t('productionBoard.lightMode')
                : t('productionBoard.darkMode')
            }
            className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-white dark:bg-zinc-900 text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="size-3.5 text-amber-400" />
            ) : (
              <Moon className="size-3.5 text-slate-600" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={
              isFullscreen ? t('productionBoard.exitFullscreen') : t('productionBoard.fullscreen')
            }
            className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-white dark:bg-zinc-900 text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-2 sm:p-2.5 md:p-3 overflow-y-auto lg:overflow-hidden">
        <div className="grid h-auto lg:h-full grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12 pb-6 lg:pb-0">
          <div className="flex h-auto lg:h-full flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-zinc-800/90 bg-white dark:bg-[#090d14] p-3 sm:p-4 lg:col-span-5 shadow-xs transition-colors min-h-0">
            <div className="flex items-center justify-between border-b border-border/70 dark:border-zinc-800/80 pb-2.5 text-xs font-semibold text-muted-foreground gap-2 shrink-0">
              <span className="tabular-nums shrink-0 font-bold text-foreground text-xs flex items-center gap-1.5">
                <Clock className="size-3 text-slate-400" />
                {format(clockTime, 'yyyy/MM/dd HH:mm:ss')}
              </span>
              <span
                className="text-foreground text-xs sm:text-sm font-black uppercase truncate flex-1 text-center px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/60 dark:border-zinc-800"
                title={`${boardData?.lineCode || lineParam} · ${boardData?.selectedStationCode || perf.finalStationCode} - ${boardData?.selectedStationName || perf.finalStationName} · ${curMo.model || ''}`}
              >
                {boardData?.lineCode || lineParam} ·{' '}
                <span className="text-production-blue">
                  {boardData?.selectedStationCode || perf.finalStationCode} (
                  {boardData?.selectedStationName || perf.finalStationName || 'Trạm cuối'})
                </span>
                {curMo.model ? ` · ${curMo.model}` : ''}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0 font-medium text-[11px]">
                {t('productionBoard.countdown', { seconds: countdown })}
              </span>
            </div>

            <div className="flex flex-col justify-between py-2 sm:py-2.5 flex-1 min-h-0 gap-y-2 sm:gap-y-2.5">
              <div className="group relative flex items-center justify-between rounded-xl px-3.5 sm:px-4 py-2 sm:py-3 flex-1 min-h-[56px] sm:min-h-[70px] bg-gradient-to-r from-lime-500/[0.07] via-lime-500/[0.02] to-transparent border-l-4 border-l-lime-500 border border-lime-500/20 shadow-2xs transition-all hover:border-lime-500/40">
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-lime-600 dark:text-[#a3e635]">
                    {t('productionBoard.outputPlan')}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-lime-500/15 text-lime-700 dark:text-lime-300 uppercase tracking-wider">
                    Kế hoạch ca
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tabular-nums tracking-tight text-lime-600 dark:text-[#a3e635] cursor-pointer drop-shadow-2xs">
                      {formatNumber(outputPlan)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="flex flex-col items-start gap-0.5 px-2.5 py-1.5 text-xs"
                  >
                    <p className="font-bold">Kế hoạch ca: {formatNumber(outputPlan)} PCS</p>
                    {perf.targetUph > 0 && (
                      <p className="text-[11px] opacity-90 mt-0.5">
                        (Định mức UPH trạm{' '}
                        {boardData?.selectedStationCode || perf.finalStationCode || 'cuối'}:{' '}
                        {perf.targetUph} PCS/H × 10h ca)
                      </p>
                    )}
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Tổng kế hoạch đơn (WO): {formatNumber(curMo.planQty ?? 0)} PCS
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="group relative flex items-center justify-between rounded-xl px-3.5 sm:px-4 py-2 sm:py-3 flex-1 min-h-[56px] sm:min-h-[70px] bg-gradient-to-r from-amber-500/[0.07] via-amber-500/[0.02] to-transparent border-l-4 border-l-amber-500 border border-amber-500/20 shadow-2xs transition-all hover:border-amber-500/40">
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-amber-500 dark:text-[#facc15]">
                    {t('productionBoard.actual')}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    {boardData?.selectedStationCode
                      ? `Trạm ${boardData.selectedStationCode}`
                      : perf.finalStationCode
                        ? `Trạm ${perf.finalStationCode}`
                        : 'Trạm cuối'}{' '}
                    · Lũy kế: {formatNumber(perf.cumOutput ?? curMo.completedQty ?? 0)} PCS
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tabular-nums tracking-tight text-amber-500 dark:text-[#facc15] cursor-pointer drop-shadow-2xs">
                      {formatNumber(perf.actualOutput ?? 0)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="flex flex-col items-start gap-0.5 px-2.5 py-1.5 text-xs"
                  >
                    <p className="font-bold">
                      {t('productionBoard.tooltipShiftOutput', {
                        count: formatNumber(perf.actualOutput ?? 0),
                        defaultValue: `Đầu ra ca này (${boardData?.selectedStationCode || perf.finalStationCode || 'trạm cuối'}): ${formatNumber(perf.actualOutput ?? 0)} PCS`,
                      })}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {t('productionBoard.tooltipCumOutput', 'Lũy kế hoàn thành toàn đơn:')}{' '}
                      <strong className="font-semibold">
                        {formatNumber(perf.cumOutput ?? curMo.completedQty ?? 0)} PCS
                      </strong>{' '}
                      ({t('productionBoard.tooltipPrevShift', 'Trước ca:')}{' '}
                      {formatNumber(perf.prevOutput ?? 0)} PCS)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div
                className={cn(
                  'group relative flex items-center justify-between rounded-xl px-3.5 sm:px-4 py-2 sm:py-3 flex-1 min-h-[56px] sm:min-h-[70px] shadow-2xs transition-all',
                  isGapPositive
                    ? 'bg-gradient-to-r from-lime-500/[0.07] via-lime-500/[0.02] to-transparent border-l-4 border-l-lime-500 border border-lime-500/20 hover:border-lime-500/40'
                    : 'bg-gradient-to-r from-rose-500/[0.07] via-rose-500/[0.02] to-transparent border-l-4 border-l-rose-500 border border-rose-500/20 hover:border-rose-500/40'
                )}
              >
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t('productionBoard.gap')}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider',
                      isGapPositive
                        ? 'bg-lime-500/15 text-lime-700 dark:text-lime-300'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    )}
                  >
                    Còn lại: {formatNumber(curMo.pendingOutput ?? Math.abs(gap))} PCS
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tabular-nums tracking-tight cursor-pointer drop-shadow-2xs',
                        isGapPositive
                          ? 'text-lime-600 dark:text-[#a3e635]'
                          : 'text-rose-600 dark:text-[#ef4444]'
                      )}
                    >
                      {isGapPositive ? `+${gap}` : `${gap}`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="flex flex-col items-start gap-0.5 px-2.5 py-1.5 text-xs"
                  >
                    <p className="font-bold">
                      Độ lệch: {isGapPositive ? `Vượt +${gap} PCS` : `Chậm ${gap} PCS`}
                    </p>
                    <p className="text-[11px] opacity-80">
                      Thực tế ca ({perf.actualOutput ?? 0}) - Kế hoạch ca ({outputPlan})
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="group relative flex items-center justify-between rounded-xl px-3.5 sm:px-4 py-2 sm:py-3 flex-1 min-h-[56px] sm:min-h-[70px] bg-gradient-to-r from-sky-500/[0.07] via-sky-500/[0.02] to-transparent border-l-4 border-l-sky-500 border border-sky-500/20 shadow-2xs transition-all hover:border-sky-500/40">
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t('productionBoard.fpy')}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                    First-pass yield
                  </span>
                </div>
                <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black tabular-nums tracking-tight text-sky-600 dark:text-[#38bdf8] drop-shadow-2xs">
                  {perf.fpyPercent != null ? `${perf.fpyPercent}%` : '100%'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/80 dark:divide-zinc-800 rounded-xl border border-border/80 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/80 py-2 sm:py-2.5 text-center text-xs shrink-0 shadow-xs">
              <div className="py-1 sm:py-0 px-1.5">
                <span className="block text-muted-foreground font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  {t('productionBoard.targetUph')}
                </span>
                <span className="font-black text-foreground dark:text-zinc-200 text-xs sm:text-sm tabular-nums">
                  {perf.targetUph && perf.targetUph > 0 ? `${perf.targetUph} PCS/H` : '—'}
                </span>
              </div>
              <div className="py-1 sm:py-0 px-1.5">
                <span className="block text-muted-foreground font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  {t('productionBoard.actualUph')}
                </span>
                <span className="font-black text-amber-600 dark:text-[#facc15] text-xs sm:text-sm tabular-nums">
                  {perf.actualUph ?? '0'} PCS/H
                </span>
              </div>
              <div className="py-1 sm:py-0 px-1.5">
                <span className="block text-muted-foreground font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  {t('productionBoard.efficiency', { defaultValue: 'HIỆU SUẤT' })}
                </span>
                <span
                  className={cn(
                    'font-black text-xs sm:text-sm tabular-nums',
                    efficiencyRate >= 100
                      ? 'text-lime-600 dark:text-[#a3e635]'
                      : efficiencyRate >= 80
                        ? 'text-sky-600 dark:text-[#38bdf8]'
                        : 'text-rose-600 dark:text-[#ef4444]'
                  )}
                >
                  {efficiencyRate > 0 ? `${efficiencyRate}%` : '—'}
                </span>
              </div>
              <div className="py-1 sm:py-0 px-1.5">
                <span className="block text-muted-foreground font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  {t('productionBoard.ngCount', 'LỖI (NG)')}
                </span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm tabular-nums">
                  {formatNumber(perf.ngCount ?? 0)} PCS
                </span>
              </div>
              <div className="py-1 sm:py-0 px-1.5">
                <span className="block text-muted-foreground font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  {t('productionBoard.lineWip')}
                </span>
                <span className="font-black text-emerald-600 dark:text-[#a3e635] text-xs sm:text-sm tabular-nums">
                  {formatNumber(perf.wip ?? 0)} PCS
                </span>
              </div>
            </div>
          </div>

          <div className="flex h-auto lg:h-full flex-col lg:col-span-7 min-h-0">
            <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800/90 bg-white dark:bg-[#090d14] shadow-xs h-full min-h-0 flex flex-col overflow-hidden transition-colors">
              <div className="bg-slate-50/90 dark:bg-zinc-900/90 px-3.5 sm:px-4 py-2.5 border-b border-border/80 shrink-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity className="size-4 text-emerald-500 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground truncate">
                    {t('productionBoard.currentMoInfo', { line: boardData?.lineCode || lineParam })}
                  </h2>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 flex-1 flex flex-col min-h-0">
                <div className="rounded-xl border border-border/80 dark:border-zinc-800 overflow-hidden divide-y divide-border/80 dark:divide-zinc-800 bg-white dark:bg-zinc-950 flex-1 flex flex-col min-h-0 shadow-2xs">
                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.mo')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-black text-foreground font-mono h-full flex items-center">
                      {curMo.mo || '—'}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.customer')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-semibold text-foreground h-full flex items-center truncate">
                      {curMo.customer || 'Senao'}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.model')}
                    </div>
                    <div
                      className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-bold text-foreground h-full flex items-center truncate"
                      title={curMo.model}
                    >
                      {curMo.model || '—'}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.pn')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-mono font-semibold text-foreground h-full flex items-center">
                      {curMo.partNumber || '—'}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.qty')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-black text-foreground h-full flex items-center tabular-nums">
                      {formatNumber(curMo.planQty ?? 0)} PCS
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.completedQty', { defaultValue: 'ĐÃ HOÀN THÀNH' })}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 h-full flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="tabular-nums font-black">
                          {formatNumber(curMo.completedQty ?? 0)} PCS
                        </span>
                        {(curMo.shiftCompletedQty != null || curMo.prevCompletedQty != null) && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            (Ca này:{' '}
                            {formatNumber(curMo.shiftCompletedQty ?? perf.actualOutput ?? 0)} ·
                            Trước đó: {formatNumber(curMo.prevCompletedQty ?? 0)})
                          </span>
                        )}
                      </div>
                      {curMo.planQty > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                          {curMoProgressPct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pending Output */}
                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider bg-rose-50/70 dark:bg-rose-950/20 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.pendingOutput')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 bg-rose-50/30 dark:bg-rose-950/10 h-full flex items-center">
                      <span className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatNumber(curMo.pendingOutput ?? 0)} PCS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.estimatedFinish')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 h-full flex items-center">
                      <span className="inline-flex items-center px-3 py-0.5 rounded-md text-xs sm:text-sm font-black bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 tabular-nums shadow-2xs">
                        {curMo.countdownFormatted || '00H 00Min'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.actualUph')} / {t('productionBoard.targetUph')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-semibold text-foreground h-full flex items-center gap-2">
                      <span className="font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {perf.actualUph ?? '0'} PCS/H
                      </span>
                      <span className="text-muted-foreground text-xs">/</span>
                      <span className="text-muted-foreground tabular-nums text-xs font-bold">
                        {perf.targetUph > 0 ? `${perf.targetUph} PCS/H` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center flex-1 min-h-8.5">
                    <div className="col-span-4 sm:col-span-3 px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-slate-50/80 dark:bg-zinc-900/50 border-r border-border/80 dark:border-zinc-800 h-full flex items-center">
                      {t('productionBoard.efficiency')} · {t('productionBoard.fpy')}
                    </div>
                    <div className="col-span-8 sm:col-span-9 px-3 py-1 text-xs sm:text-sm font-semibold text-foreground h-full flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <span
                        className={cn(
                          'font-black tabular-nums',
                          efficiencyRate >= 100
                            ? 'text-lime-600 dark:text-[#a3e635]'
                            : efficiencyRate >= 80
                              ? 'text-sky-600 dark:text-[#38bdf8]'
                              : 'text-rose-600 dark:text-[#ef4444]'
                        )}
                      >
                        {efficiencyRate}%
                      </span>
                      <span className="text-border/80">|</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold tabular-nums">
                        FPY: {perf.fpyPercent != null ? `${perf.fpyPercent}%` : '100%'}
                      </span>
                      {perf.ngCount != null && (
                        <>
                          <span className="text-border/80">|</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                            NG: {perf.ngCount}
                          </span>
                        </>
                      )}
                      <span className="text-border/80">|</span>
                      <span className="text-muted-foreground tabular-nums text-xs">
                        WIP:{' '}
                        <strong className="text-emerald-600 dark:text-[#a3e635] font-black">
                          {formatNumber(perf.wip ?? 0)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductionBoardPage;
