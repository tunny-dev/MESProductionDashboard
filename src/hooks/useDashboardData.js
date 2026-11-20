import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getDashboardDetail } from '@/services/dashboard.service';
import {
  DASHBOARD_CONFIG,
  SHIFT_CODES,
  getActiveSlots,
} from '@/features/production-dashboard/utils/dashboardConfig';

const REFRESH_MS = DASHBOARD_CONFIG.refreshIntervalSec * 1000;

/**
 * Query Key Factory chuẩn hóa cho phân hệ Production Dashboard.
 * Quản lý duy nhất cache dữ liệu tính toán hợp nhất từ Backend API.
 */
export const dashboardKeys = {
  all: ['production-dashboard'],
  detail: (params) => [...dashboardKeys.all, 'detail', params],
};

/**
 * Hook tải dữ liệu tổng hợp cho Production Dashboard từ REST API Backend.
 * @param {object} params
 * @param {string|null} params.lineId Mã chuyền
 * @param {string|null} [params.dept] Phân xưởng (SMT, DIP, FA)
 * @param {string} [params.model] Mã Model
 * @param {string|null} [params.mo] Lệnh sản xuất (WO)
 * @param {string} params.date Ngày làm việc YYYYMMDD hoặc YYYY-MM-DD
 * @param {string|null} params.shift Ca làm việc ('1' | '2' | 'day' | 'night')
 * @param {boolean} [params.enabled] Cho phép query chạy
 */
export function useDashboardData({
  lineId,
  dept = null,
  model = 'ALL',
  mo = null,
  date,
  shift,
  enabled = false,
} = {}) {
  const dateStr = typeof date === 'string' ? date.replace(/-/g, '') : '';
  const shiftCode = SHIFT_CODES[shift] || '1';

  const ready = Boolean(enabled && dateStr && shift && lineId && dept);
  const flowReady = ready && Boolean(mo);

  const queryParams = useMemo(
    () => ({
      mo: mo ?? '',
      lineId: lineId ?? '',
      dateStr,
      dept: dept ?? '',
      shiftCode,
      model,
    }),
    [mo, lineId, dateStr, dept, shiftCode, model]
  );

  const detailQuery = useQuery({
    queryKey: dashboardKeys.detail(queryParams),
    queryFn: async () => {
      const data = await getDashboardDetail({
        dateStr,
        dept,
        shift: shiftCode,
        lineId,
        mo,
        model,
      });
      return data ?? null;
    },
    enabled: flowReady,
    retry: 1,
    retryDelay: 800,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
  });

  const viewData = useMemo(() => {
    if (!detailQuery.data) return null;
    const d = detailQuery.data;
    return {
      summary: d.summary,
      stations: d.stations || [],
      flow: d.flow || [],
      hourly: d.hourly || [],
      uphTrend: d.uphTrend || [],
      stationUph: d.stationUph || [],
      bottleneckId: d.bottleneckStationId,
      updatedAt: d.updatedAt,
      model,
    };
  }, [detailQuery.data, model]);

  const flowStations = useMemo(() => {
    if (viewData?.flow?.length > 0) {
      return viewData.flow.map((f) => ({
        id: f.stage,
        name: f.stageDes || f.stage,
        shortName: f.stageDes || f.stage,
        seq: f.seqRaw || String(f.seq),
        line: f.line,
        qty: f.qty,
        isBottleneck: f.isBottleneck,
      }));
    }
    return [];
  }, [viewData]);

  const slots = useMemo(() => {
    return getActiveSlots({
      shift: DASHBOARD_CONFIG.shifts.find((item) => item.id === shift),
    });
  }, [shift]);

  return {
    viewData,
    flowStations,
    slots,
    isLoading: detailQuery.isLoading,
    isFetching: detailQuery.isFetching,
    isError: detailQuery.isError,
    isRefetchError: detailQuery.isRefetchError,
    failureReason: detailQuery.error ?? null,
    refetch: detailQuery.refetch,
  };
}
