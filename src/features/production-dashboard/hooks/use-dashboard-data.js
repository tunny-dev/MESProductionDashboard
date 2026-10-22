import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { DASHBOARD_PARTS, getPart } from '@/features/production-dashboard/api/dashboard-parts';
import {
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
import { SHIFT_CODES } from '@/config/mes-codes';

const REFRESH_MS = DASHBOARD_CONFIG.refreshIntervalSec * 1000;
const PREVIEW_ROWS = 5;

/** Khoá cache của 1 nguồn (gồm `scope` để tránh dùng lại flow cũ). */
function partQueryKey(part, { mo, lineId, dateStr, dept, shiftCode, model, scopeCode }) {
  return [
    'production-dashboard',
    'part',
    part.key,
    mo,
    lineId,
    dateStr,
    dept,
    shiftCode,
    ...(part.usesModel ? [model] : []),
    scopeCode,
  ];
}

/**
 * @param {object} args
 * @param {string|null} args.lineId Mã chuyền (từ ?line=).
 * @param {string|null} args.dept MÃ BỘ PHẬN (`SSFDC.DC001` = `CMSMD.MD004`, VD VN001) — lấy từ
 *   `getMfgType`/`getMfgByLine` ở trang, gửi thẳng xuống SP `dept`.
 * @param {string|null} args.process TÊN công đoạn ('SMT' | 'DIP' | 'FA') — chỉ để HIỂN THỊ/tra
 *   bảng UPH mục tiêu ở FE, KHÔNG gửi xuống SP.
 * @param {string} args.model Model đang chọn ('ALL' = tất cả).
 * @param {string|null} args.mo WO đang chọn — để tải flow (null khi ALL).
 * @param {string} args.date Ngày 'yyyy-MM-dd'.
 * @param {string|null} args.shift Ca UI ('day' | 'night').
 * @param {boolean} args.enabled Đủ chuyền + ca mới fetch.
 */
export function useDashboardData({
  lineId,
  dept = null,
  process = null,
  model = 'ALL',
  mo = null,
  date,
  shift,
  scope = 'DAY',
  enabled = false,
} = {}) {
  const dateStr = typeof date === 'string' ? date.replace(/-/g, '') : '';
  const shiftCode = SHIFT_CODES[shift] || '1';

  const routing = scope === 'ROUTING';
  const scopeCode = routing ? 'ROUTING' : scope === 'WO' ? 'WO' : 'DAY';
  const queryLine = routing ? '' : lineId;
  const queryDept = routing ? '' : dept;

  // Routing không phụ thuộc chuyền đang chọn — chỉ cần WO + ngày + ca.
  const ready = Boolean(enabled && dateStr && shift && (routing ? lineId && mo : lineId && dept));
  const flowReady = ready && Boolean(mo);
  const args = {
    dateStr,
    dept: queryDept,
    shift: shiftCode,
    lineId: queryLine,
    mo,
    model,
    scope: scopeCode,
  };

  // Thứ tự query = thứ tự trong DASHBOARD_PARTS .
  const queries = useQueries({
    queries: DASHBOARD_PARTS.map((part) => ({
      queryKey: partQueryKey(part, {
        mo,
        lineId: queryLine,
        dateStr,
        dept: queryDept,
        shiftCode,
        model,
        scopeCode,
      }),
      queryFn: () => getPart(part.key, args),
      enabled: flowReady,
      retry: 1,
      retryDelay: 800,
      refetchInterval: REFRESH_MS,
      refetchOnWindowFocus: false,
    })),
  });

  const [moSummaryQ, wipQ, hourlyQ, uphQ, flowQ, cycleTimeQ] = queries;

  const parts = useMemo(
    () =>
      DASHBOARD_PARTS.map((part, index) =>
        toPartView(part, queries[index], part.buildParams(args))
      ),
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
      scope: routing ? 'WO' : scopeCode,
      shift: DASHBOARD_CONFIG.shifts.find((item) => item.id === shift),
      woStartDate: summary?.woStartDate,
      woDayCount: summary?.woDayCount,
    });
  }, [scopeCode, routing, shift, moSummaryQ.data]);

  const data = useMemo(() => {
    if (!wipQ.data && !moSummaryQ.data) return null;
    const stations = wipQ.data ? normalizeWipReportRows(wipQ.data.rows, slots) : [];
    return {
      ...mergeDashboardData({
        chartOutputRows: hourlyQ.data?.rows ?? [],
        chartUphRows: uphQ.data?.rows ?? [],
        slots,
        fallbackTargetUph: getTargetUph({
          process,
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
    process,
    lineId,
    slots,
  ]);

  return {
    parts,
    flowStations,
    data,
    slots,
    cycleTime: cycleTimeQ.data ? (cycleTimeQ.data.rows ?? []) : [],
    scope: scopeCode,
    isLoading: wipQ.isLoading || moSummaryQ.isLoading,
    isFetching: queries.some((q) => q.isFetching),
    isError: wipQ.isError || moSummaryQ.isError,
    isRefetchError: queries.some((q) => q.isRefetchError),
    failureReason: wipQ.error ?? moSummaryQ.error ?? null,
    refetch: () => queries.forEach((q) => q.refetch()),
  };
}

/**
 * View cho panel debug `?debug=1`. `endpoint`/`params` lấy từ chính response đã
 * gọi (không dựng lại), nên không thể lệch với request thật.
 */
function toPartView(part, query, params) {
  const payload = query.data;
  const rows = payload?.rows ?? [];
  const status =
    !query.isFetched && !query.isFetching && !query.error
      ? 'idle'
      : query.error
        ? 'error'
        : payload
          ? 'success'
          : 'loading';
  return {
    key: part.key,
    label: part.label,
    endpoint: payload?.endpoint ?? part.sCode,
    params: payload?.params ?? params,
    status,
    isFetching: query.isFetching,
    rowCount: rows.length,
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    errorMessage: query.error?.message ?? null,
    previewRows: rows.slice(0, PREVIEW_ROWS),
  };
}
