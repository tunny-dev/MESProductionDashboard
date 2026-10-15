/**
 * Dữ liệu dashboard một chuyền — 5 nguồn query ĐỘC LẬP (summary / plan /
 * hourly / uphTrend / flow), hỏng nguồn nào chỉ chết nguồn đó.
 *
 * Trả về view gộp `data` cho UI cũ + `parts` cho màn debug soi từng phần.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { MES_S_CODES } from '@/config/api';
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

  // KHÔNG gọi Production_1_1_4 nữa: câu đó lọc theo (ngày, công đoạn) mà không
  // có MO / chuyền, nên khi bảng trạm lỗi nó lấp vào danh sách trạm và gộp
  // mọi WO của công đoạn vào cùng một bảng. Cũng không gọi Production_1_1_6:
  // kế hoạch lấy từ SSFMF.MF008 ngay trong GET_SUMMARY / GET_WIP_REPORT.
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

  // View-model từng phần cho màn debug — có params ngay cả khi chưa load.
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

  // Stations cho FlowStrip từ GET_FLOW_BY_MO — thay DASH_LINE_CONFIG còn thiếu.
  const flowStations = useMemo(
    () => (flowQ.data ? normalizeFlowRows(flowQ.data.rows) : []),
    [flowQ.data]
  );

  // Bộ 6 khung đang dùng. Tính ra một chỗ rồi đưa vào cả normalize lẫn
  // component, để nhãn trục X và dữ liệu luôn cùng một bộ — lệch nhau là
  // biểu đồ trắng.
  const slots = useMemo(() => {
    // Khoảng ngày lấy thẳng từ rows, chưa qua merge — cần để dựng khung
    // trước khi gộp.
    const summary = normalizeMoSummaryRows(moSummaryQ.data?.rows);
    return getActiveSlots({
      scope: scopeCode,
      shift: DASHBOARD_CONFIG.shifts.find((item) => item.id === shift),
      woStartDate: summary?.woStartDate,
      woDayCount: summary?.woDayCount,
    });
  }, [scopeCode, shift, moSummaryQ.data]);

  // View gộp cho UI — nền là GET_WIP_REPORT (bảng trạm), tổng nhập/xuất lấy
  // từ GET_SUMMARY. Hai nguồn giờ thiếu thì dùng giá trị rỗng.
  const data = useMemo(() => {
    if (!wipQ.data && !moSummaryQ.data) return null;
    const stations = wipQ.data ? normalizeWipReportRows(wipQ.data.rows, slots) : [];
    // Trạm cuối của 2 API biểu đồ = MAX(seq) trong cùng bộ lọc — trùng với
    // `stationRows.at(-1)` mà trang truyền vào `finalStationId`.
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

/** Params sẽ gửi đi của từng phần — tính sẵn để debug dù query chưa chạy. */
function argsFor(key, args) {
  if (key === 'chartOutput' || key === 'chartUph')
    return {
      SDATE: args.dateStr,
      MO: args.mo,
      LINE: args.lineId,
      DEPT: args.dept,
      SHIFT: args.shift,
      MODEL: args.model,
      SCOPE: args.scope,
    };
  if (key === 'moSummary')
    return {
      MO: args.mo,
      SDATE: args.dateStr,
      LINE: args.lineId,
      DEPT: args.dept,
      SHIFT: args.shift,
      SCOPE: args.scope,
    };
  if (key === 'wipReport')
    return {
      SDATE: args.dateStr,
      MO: args.mo,
      LINE: args.lineId,
      DEPT: args.dept,
      SHIFT: args.shift,
      MODEL: args.model,
      SCOPE: args.scope,
    };
  if (key === 'flow')
    return {
      MO: args.mo,
      SDATE: args.dateStr,
      EDATE: args.dateStr,
      DEPT: args.dept,
      LINE: args.lineId,
      SHIFT: args.shift,
    };
  return { DEPT: args.dept, LINE: args.lineId, SDATE: args.dateStr, SHIFT: args.shift };
}

const PART_S_CODES = () => ({
  moSummary: MES_S_CODES.production.moSummary,
  wipReport: MES_S_CODES.production.wipReport,
  hourly: MES_S_CODES.production.chartOutput,
  uphTrend: MES_S_CODES.production.chartUph,
  flow: MES_S_CODES.production.flowByMo,
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
    sCode: payload?.sCode ?? PART_S_CODES()[key],
    params,
    status,
    isFetching: query.isFetching,
    rowCount: rows.length,
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    errorMessage: query.error?.message ?? null,
    previewRows: rows.slice(0, PREVIEW_ROWS),
  };
}
