import { useQuery } from '@tanstack/react-query';

import {
  getWipReport,
  getWipByStation,
  getWipUnitSnList,
  getWipNotInputSnList,
  getWipStationSnList,
  getLineOptions,
  getModelOptions,
  getMoOptions,
} from '@/features/wip-report/api/wip-report';
import {
  DRILL_WIP as WIP,
  DRILL_NOT_INPUT as NOT_INPUT,
  DRILL_STATION as STATION,
} from '@/features/wip-report/lib/wip-drill';

const queryKeys = {
  report: (params) => ['wip-report', 'list', params],
  byStation: (params) => ['wip-report', 'by-station', params],
  unitSn: (params, mo, line, source, station) => [
    'wip-report',
    source === NOT_INPUT ? 'not-input-sn' : source === STATION ? 'station-sn' : 'unit-sn',
    params,
    mo ?? '',
    line ?? '',
    station ?? '',
  ],
  lines: (mfgType) => ['wip-report', 'lines', mfgType ?? ''],
  models: (mfgType, line) => ['wip-report', 'models', mfgType ?? '', line ?? ''],
  mos: (mfgType, line) => ['wip-report', 'mos', mfgType ?? '', line ?? ''],
};

/**
 * Thực thi query WIP Report — chỉ fetch khi `enabled` = true (sau khi bấm Query).
 * `queryKey` (number) có thể tăng dần để bắt buộc re-fetch kể cả khi params không đổi.
 *
 * Phân trang SERVER-SIDE: `page` / `pageSize` nằm trong queryKey nên đổi trang
 * là tự fetch. `placeholderData` giữ data trang cũ trong lúc tải trang mới
 * (tránh nhấp nháy bảng).
 */
export function useWipReport({
  params,
  page = 1,
  pageSize = 20,
  enabled = false,
  queryKey: bumpKey = 0,
}) {
  return useQuery({
    queryKey: [...queryKeys.report(params), page, pageSize, bumpKey],
    queryFn: () => getWipReport(params, { page, pageSize }),
    enabled,
    retry: 0,
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
}

/**
 * WIP theo (MO, chuyền, trạm) — để pivot cột trạm động.
 * Gọi song song với useWipReport, cùng params.
 */
export function useWipByStation({ params, enabled = false, queryKey: bumpKey = 0 }) {
  return useQuery({
    queryKey: [...queryKeys.byStation(params), bumpKey],
    queryFn: () => getWipByStation(params),
    enabled,
    retry: 0,
    staleTime: 0,
  });
}

/**
 * Danh sách đơn vị của 1 cặp (MO, chuyền) — tab "Unit S/N List".
 * `source` quyết định gọi API nào:
 *   - WIP       (mặc định): SN đang kẹt giữa các trạm, có serial
 *                thật và có trạm đang kẹt
 *   - NOT_INPUT: đơn vị theo kế hoạch chưa nhập, chưa có SN / chưa qua trạm
 *   - STATION:  SN đã đạt tại một trạm cụ thể, có kèm vị trí hiện tại
 * Chỉ fetch khi `enabled` = true, tức người dùng đã bấm vào ô số ở Summary.
 */
export function useWipUnitSnList({
  params,
  mo,
  line,
  source = WIP,
  station,
  enabled = false,
  queryKey: bumpKey = 0,
}) {
  return useQuery({
    queryKey: [...queryKeys.unitSn(params, mo, line, source, station), bumpKey],
    queryFn: () => {
      const scoped = { ...params, mo, line };
      if (source === STATION) return getWipStationSnList({ ...scoped, station });
      if (source === NOT_INPUT) return getWipNotInputSnList(scoped);
      return getWipUnitSnList(scoped);
    },
    enabled: enabled && Boolean(mo) && Boolean(line),
    retry: 0,
    staleTime: 0,
  });
}

/**
 * Danh sách Line theo MfgType — tự fetch khi mfgType thay đổi.
 */
export function useWipLineOptions({ mfgType } = {}) {
  return useQuery({
    queryKey: queryKeys.lines(mfgType),
    queryFn: () => getLineOptions({ mfgType }),
    enabled: Boolean(mfgType),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Danh sách Model theo MfgType + Line.
 */
export function useWipModelOptions({ mfgType, line } = {}) {
  return useQuery({
    queryKey: queryKeys.models(mfgType, line),
    queryFn: () => getModelOptions({ mfgType, line }),
    enabled: Boolean(mfgType),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Danh sách MO theo MfgType + Line (+ Models đã chọn).
 */
export function useWipMoOptions({ mfgType, line, models } = {}) {
  const modelsKey = Array.isArray(models) ? models.join(',') : (models ?? '');
  return useQuery({
    queryKey: [...queryKeys.mos(mfgType, line), modelsKey],
    queryFn: () => getMoOptions({ mfgType, line, models }),
    enabled: Boolean(mfgType),
    staleTime: 5 * 60 * 1000,
  });
}
