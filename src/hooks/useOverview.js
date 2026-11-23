import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  currentMinutesOfDay,
  getOverviewAreaList,
  getOverviewShiftList,
  getOverviewSnapshot,
} from '@/services/overview.service';
import { buildLineDetailView, buildSnapshotView } from '@/features/overview/utils/snapshotView';

/**
 * Query Key Factory chuẩn hóa cho phân hệ Tổng quan (Overview).
 */
export const overviewKeys = {
  all: ['overview'],
  areas: () => [...overviewKeys.all, 'areas'],
  shifts: () => [...overviewKeys.all, 'shifts'],
  snapshot: (shiftId) => [...overviewKeys.all, 'snapshot', shiftId ?? 'auto'],
  lineDetail: (shiftId, lineId) => [...overviewKeys.snapshot(shiftId), 'line', lineId ?? ''],
};

/** Polling mặc định. */
export const DEFAULT_POLL_INTERVAL_MS = 10_000;

export const STALE_AFTER_SECONDS = 30;

export function useOverviewAreas() {
  return useQuery({
    queryKey: overviewKeys.areas(),
    queryFn: getOverviewAreaList,
    staleTime: Infinity,
  });
}

export function useOverviewShifts() {
  return useQuery({
    queryKey: overviewKeys.shifts(),
    queryFn: getOverviewShiftList,
    staleTime: Infinity,
  });
}

/**
 * Hook lấy dữ liệu toàn bộ nhà máy đã tính toán cho trang Tổng quan (Overview).
 * @param shiftId        Mã ca đang xem (1=ngày, 2=đêm). Nếu không truyền, Backend tự động lấy ca hiện tại.
 * @param currentMinutes Mốc phút hiện tại
 * @param pollInterval   Chu kỳ tự động làm mới (ms)
 * @param enabled        Cho phép query chạy
 */
export function useOverviewSnapshot({
  shiftId,
  currentMinutes = currentMinutesOfDay(),
  pollInterval = DEFAULT_POLL_INTERVAL_MS,
  enabled = true,
} = {}) {
  const query = useQuery({
    queryKey: overviewKeys.snapshot(shiftId ?? 'auto'),
    queryFn: () => getOverviewSnapshot({ shiftId: shiftId || undefined, currentMinutes }),
    refetchInterval: pollInterval,
    retry: 0,
    placeholderData: keepPreviousData,
    enabled,
  });

  const view = useMemo(() => (query.data ? buildSnapshotView(query.data) : null), [query.data]);

  return { ...query, view };
}

/**
 * Chi tiết một line cho trang LineDetailPage trong Overview.
 */
export function useOverviewLineDetail({ shiftId, lineId, currentMinutes, pollInterval }) {
  const query = useQuery({
    queryKey: overviewKeys.lineDetail(shiftId, lineId),
    queryFn: () => getOverviewSnapshot({ shiftId, currentMinutes }),
    refetchInterval: pollInterval ?? DEFAULT_POLL_INTERVAL_MS,
    retry: 0,
    placeholderData: keepPreviousData,
    enabled: Boolean(shiftId && lineId),
    select: (snapshot) => {
      const built = buildSnapshotView(snapshot);
      const raw = built.lines.find((l) => l.lineId === lineId);
      if (!raw) return { ...built, lines: [], detail: null };
      return {
        ...built,
        lines: [raw],
        detail: buildLineDetailView(raw, built.shift, built.currentMinutes),
      };
    },
  });

  return query;
}
