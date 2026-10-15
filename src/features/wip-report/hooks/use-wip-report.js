import { useQuery } from '@tanstack/react-query';

import {
  getWipReport,
  getWipByStation,
  getLineOptions,
  getModelOptions,
  getMoOptions,
} from '@/features/wip-report/api/wip-report';

const queryKeys = {
  report: (params) => ['wip-report', 'list', params],
  byStation: (params) => ['wip-report', 'by-station', params],
  lines: (mfgType) => ['wip-report', 'lines', mfgType ?? ''],
  models: (mfgType, line) => ['wip-report', 'models', mfgType ?? '', line ?? ''],
  mos: (mfgType, line) => ['wip-report', 'mos', mfgType ?? '', line ?? ''],
};

/**
 * Thực thi query WIP Report — chỉ fetch khi `enabled` = true (sau khi bấm Query).
 * `queryKey` (number) có thể tăng dần để bắt buộc re-fetch kể cả khi params không đổi.
 */
export function useWipReport({ params, enabled = false, queryKey: bumpKey = 0 }) {
  return useQuery({
    queryKey: [...queryKeys.report(params), bumpKey],
    queryFn: () => getWipReport(params),
    enabled,
    retry: 0,
    staleTime: 0,
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
