import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { ENDPOINTS } from '@/config/api';
import {
  getMoSummaryPart,
  getWipReportPart,
  getChartOutputPart,
  getChartUphPart,
  getFlowPart,
} from '@/features/production-dashboard/api/dashboard-parts';
import {
  SHIFT_CODES,
  getDeptCode,
  mergeDashboardData,
  normalizeFlowRows,
  normalizeMoSummaryRows,
  normalizeWipReportRows,
} from '@/features/production-dashboard/api/dashboard';
import { getTargetUph } from '@/features/production-dashboard/lib/dashboard-target-uph';
import {
  DASHBOARD_CONFIG,
  getActiveSlots,
} from '@/features/production-dashboard/lib/dashboard-config';

const REFRESH_MS = DASHBOARD_CONFIG.refreshIntervalSec * 1000;
const PREVIEW_ROWS = 5;

/**
 * @param {object} args
 * @param {string|null} args.lineId Mã chuyền (từ ?line=).
 * @param {string|null} args.group Công đoạn ('SMT' | 'DIP' | 'FA') — để tính DEPT.
 * @param {string} args.model Model đang chọn ('ALL' = tất cả).
 * @param {string|null} args.mo WO đang chọn — để tải flow (null khi ALL).
 * @param {string} args.date Ngày 'yyyy-MM-dd'.
 * @param {string|null} args.shift Ca UI ('day' | 'night').
 * @param {boolean} args.enabled Đủ chuyền + ca mới fetch.
 */
export function useDashboardData({
  lineId,
  group,
  model = 'ALL',
  mo = null,
  date,
  shift,
  scope = 'DAY',
  enabled = false,
} = {}) {
  const dateStr = typeof date === 'string' ? date.replace(/-/g, '') : '';
  const dept = group ? getDeptCode(group) : null;
  const shiftCode = SHIFT_CODES[shift] || '1';
  const scopeCode = scope === 'WO' ? 'WO' : 'DAY';
  const ready = Boolean(enabled && lineId && dateStr && shift && dept);
  const flowReady = ready && Boolean(mo);
  const args = { dateStr, dept, shift: shiftCode, lineId, mo, model, scope: scopeCode };

  const [moSummaryQ, wipQ, hourlyQ, uphQ, flowQ] = useQueries({
    queries: [
      {
        queryKey: [
          'production-dashboard',
          'part',
          'moSummary',
          mo,
          lineId,
          dateStr,
          dept,
          shiftCode,
          scopeCode,
        ],
        queryFn: () => getMoSummaryPart(args),
        enabled: flowReady,
        retry: false,
        refetchInterval: REFRESH_MS,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: [
          'production-dashboard',
          'part',
          'wipReport',
          mo,
          lineId,
          dateStr,
          dept,
          shiftCode,
          model,
          scopeCode,
        ],
        queryFn: () => getWipReportPart(args),
        enabled: flowReady,
        retry: false,
        refetchInterval: REFRESH_MS,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: [
          'production-dashboard',
          'part',
          'chartOutput',
          mo,
          lineId,
          dateStr,
          dept,
          shiftCode,
          model,
          scopeCode,
        ],
        queryFn: () => getChartOutputPart(args),
        enabled: flowReady,
        retry: false,
        refetchInterval: REFRESH_MS,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: [
          'production-dashboard',
          'part',
          'chartUph',
          mo,
          lineId,
          dateStr,
          dept,
          shiftCode,
          model,
          scopeCode,
        ],
        queryFn: () => getChartUphPart(args),
        enabled: flowReady,
        retry: false,
        refetchInterval: REFRESH_MS,
        refetchOnWindowFocus: false,
      },
      {
        queryKey: ['production-dashboard', 'part', 'flow', mo, lineId, dateStr, dept, shiftCode],
        queryFn: () => getFlowPart(args),
        enabled: flowReady,
        retry: false,
        refetchInterval: REFRESH_MS,
        refetchOnWindowFocus: false,
      },
    ],
  });

  const parts = useMemo(
    () => [
      toPartView('moSummary', 'Tổng nhập/xuất WO', moSummaryQ, () => argsFor('moSummary', args)),
      toPartView('wipReport', 'WIP report trạm', wipQ, () => argsFor('wipReport', args)),
      toPartView('hourly', 'Biểu đồ output & đạt kế hoạch', hourlyQ, () =>
        argsFor('chartOutput', args)
      ),
      toPartView('uphTrend', 'Biểu đồ xu hướng UPH', uphQ, () => argsFor('chartUph', args)),
      toPartView('flow', 'Quy trình theo WO', flowQ, () => argsFor('flow', args)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      moSummaryQ.data,
      moSummaryQ.error,
      moSummaryQ.isLoading,
      moSummaryQ.isFetching,
      wipQ.data,
      wipQ.error,
      wipQ.isLoading,
      wipQ.isFetching,
      hourlyQ.data,
      hourlyQ.error,
      hourlyQ.isLoading,
      hourlyQ.isFetching,
      uphQ.data,
      uphQ.error,
      uphQ.isLoading,
      uphQ.isFetching,
      flowQ.data,
      flowQ.error,
      flowQ.isLoading,
      flowQ.isFetching,
      dateStr,
      dept,
      shiftCode,
      lineId,
      mo,
      ready,
      model,
      scopeCode,
    ]
  );

  const flowStations = useMemo(
    () => (flowQ.data ? normalizeFlowRows(flowQ.data.rows) : []),
    [flowQ.data]
  );

  const slots = useMemo(() => {
    const summary = normalizeMoSummaryRows(moSummaryQ.data?.rows);
    return getActiveSlots({
      scope: scopeCode,
      shift: DASHBOARD_CONFIG.shifts.find((item) => item.id === shift),
      woStartDate: summary?.woStartDate,
      woDayCount: summary?.woDayCount,
    });
  }, [scopeCode, shift, moSummaryQ.data]);

  const data = useMemo(() => {
    if (!wipQ.data && !moSummaryQ.data) return null;
    const stations = wipQ.data ? normalizeWipReportRows(wipQ.data.rows, slots) : [];
    return {
      ...mergeDashboardData({
        chartOutputRows: hourlyQ.data?.rows ?? [],
        chartUphRows: uphQ.data?.rows ?? [],
        slots,
        fallbackTargetUph: getTargetUph({
          process: group,
          line: lineId,
          op: stations.at(-1)?.stationId,
        }),
        moSummary: moSummaryQ.data ? normalizeMoSummaryRows(moSummaryQ.data.rows) : null,
        wipStations: stations,
        errors: {
          moSummary: moSummaryQ.error?.message,
          wipReport: wipQ.error?.message,
          hourly: hourlyQ.error?.message,
          uphTrend: uphQ.error?.message,
          stations: wipQ.error?.message,
        },
      }),
      model,
    };
  }, [
    moSummaryQ.data,
    moSummaryQ.error,
    wipQ.data,
    wipQ.error,
    hourlyQ.data,
    hourlyQ.error,
    uphQ.data,
    uphQ.error,
    model,
    group,
    lineId,
    slots,
  ]);

  const queries = [moSummaryQ, wipQ, hourlyQ, uphQ, flowQ];

  return {
    parts,
    flowStations,
    data,
    slots,
    scope: scopeCode,
    isLoading: wipQ.isLoading || moSummaryQ.isLoading,
    isFetching: queries.some((q) => q.isFetching),
    isError: wipQ.isError || moSummaryQ.isError,
    isRefetchError: queries.some((q) => q.isRefetchError),
    failureReason: wipQ.error ?? moSummaryQ.error ?? null,
    refetch: () => queries.forEach((q) => q.refetch()),
  };
}

function argsFor(key, args) {
  const base = {
    sDate: args.dateStr,
    mo: args.mo,
    line: args.lineId,
    dept: args.dept,
    shift: args.shift,
  };
  const withModel = { ...base, model: args.model };
  const scope = args.scope === 'WO' ? { scope: 'WO' } : {};

  switch (key) {
    case 'chartOutput':
    case 'chartUph':
    case 'wipReport':
      return { ...withModel, ...scope };
    case 'moSummary':
      return { ...base, ...scope };
    case 'flow':
      return base;
    default:
      return base;
  }
}

const PART_ENDPOINTS = () => ({
  moSummary: ENDPOINTS.production.moSummary,
  wipReport: ENDPOINTS.production.wipReport,
  hourly: ENDPOINTS.production.achievement,
  uphTrend: ENDPOINTS.production.uphTrend,
  flow: ENDPOINTS.production.flowByMo,
});

function toPartView(key, label, query, getArgs) {
  const payload = query.data;
  const params = payload?.params ?? getArgs();
  const rows = payload?.rows ?? [];
  const status =
    !query.isFetched && !query.isFetching && !query.error
      ? 'idle'
      : query.error
        ? 'error'
        : query.data
          ? 'success'
          : 'loading';
  return {
    key,
    label,
    endpoint: payload?.endpoint ?? PART_ENDPOINTS()[key],
    params,
    status,
    isFetching: query.isFetching,
    rowCount: rows.length,
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    errorMessage: query.error?.message ?? null,
    previewRows: rows.slice(0, PREVIEW_ROWS),
  };
}
