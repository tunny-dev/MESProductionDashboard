import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getWipSummary,
  getWipStation,
  getWipUnitSn,
  getWipNotInputSn,
  getWipStationSn,
  getMfgType,
  getProductionLine,
  getWipModels,
  getWipMos,
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
  lines: (deptCode) => ['wip-report', 'lines', deptCode ?? ''],
  models: (mfgType, line) => ['wip-report', 'models', mfgType ?? '', line ?? ''],
  mos: (mfgType, line) => ['wip-report', 'mos', mfgType ?? '', line ?? ''],
  mfgTypes: () => ['wip-report', 'mfg-types'],
};

/**
 * Thực thi query WIP Report — chỉ fetch khi `enabled` = true (sau khi bấm Query).
 * `queryKey` (number) có thể tăng dần để bắt buộc re-fetch kể cả khi params không đổi.
 */
export function useWipReport({ params, enabled = false, queryKey: bumpKey = 0 }) {
  return useQuery({
    queryKey: [...queryKeys.report(params), bumpKey],
    queryFn: () => getWipSummary(params),
    enabled,
    retry: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * WIP theo (MO, chuyền, trạm) — để pivot cột trạm động.
 * Gọi song song với useWipReport, cùng params.
 */
export function useWipByStation({ params, enabled = false, queryKey: bumpKey = 0 }) {
  return useQuery({
    queryKey: [...queryKeys.byStation(params), bumpKey],
    queryFn: () => getWipStation(params),
    enabled,
    retry: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Danh sách đơn vị của 1 cặp (MO, chuyền) — tab "Unit S/N List".
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
      if (source === STATION) return getWipStationSn({ ...scoped, station });
      if (source === NOT_INPUT) return getWipNotInputSn(scoped);
      return getWipUnitSn(scoped);
    },
    enabled: enabled && Boolean(mo) && Boolean(line),
    retry: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Danh sách bộ phận (MFG Type) cho radio của tab Query — sCode `getMfgType`.
 * `code` (VD: VN001) là giá trị gửi xuống `mfgType` của mọi SP WIP.
 */
export function useWipMfgTypes() {
  return useQuery({
    queryKey: queryKeys.mfgTypes(),
    queryFn: () => getMfgType(),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Danh sách Line của một bộ phận — tự fetch khi bộ phận thay đổi.
 * @param {{ deptCode?: string }} [options] `deptCode` = `SSFDC.DC001` (VD: VN001)
 */
export function useWipLineOptions({ deptCode } = {}) {
  return useQuery({
    queryKey: queryKeys.lines(deptCode),
    queryFn: () => getProductionLine({ deptCode }),
    enabled: Boolean(deptCode),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Danh sách Model theo MfgType + Line.
 */
export function useWipModelOptions({ mfgType, line } = {}) {
  return useQuery({
    queryKey: queryKeys.models(mfgType, line),
    queryFn: () => getWipModels({ mfgType, line }),
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
    queryFn: () => getWipMos({ mfgType, line, models }),
    enabled: Boolean(mfgType),
    staleTime: 5 * 60 * 1000,
  });
}
