import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  currentMinutesOfDay,
  getAreas,
  getShiftSnapshot,
  getShifts,
  getStopReasons,
} from '@/features/overview/api/production';
import { buildLineDetailView, buildSnapshotView } from '@/features/overview/lib/snapshot-view';
import { getStages } from '@/features/overview/api/stages';

/** Khoá cache: dữ liệu một ca là một ảnh chụp, không dồn số liệu giữa các ca. */
const queryKeys = {
  snapshot: (shiftId) => ['production', 'snapshot', shiftId],
  areas: () => ['production', 'areas'],
  shifts: () => ['production', 'shifts'],
  stopReasons: () => ['production', 'stop-reasons'],
  stages: (factory) => ['production', 'stages', factory ?? ''],
};

/** Chu kỳ polling mặc định. Sản xuất thì 5–10 giây là đủ (doc mục 6). */
export const DEFAULT_POLL_INTERVAL_MS = 10_000;

export const STALE_AFTER_SECONDS = 30;

export function useAreas() {
  return useQuery({ queryKey: queryKeys.areas(), queryFn: getAreas, staleTime: Infinity });
}

export function useShifts() {
  return useQuery({ queryKey: queryKeys.shifts(), queryFn: getShifts, staleTime: Infinity });
}

export function useStopReasons() {
  return useQuery({
    queryKey: queryKeys.stopReasons(),
    queryFn: getStopReasons,
    staleTime: Infinity,
  });
}

/**
 * Lấy dữ liệu công đoạn sản xuất thông qua GET_MFG_TYPE
 */
export function useStages({ factory } = {}) {
  return useQuery({
    queryKey: queryKeys.stages(factory),
    queryFn: () => getStages({ factory }),
    staleTime: Infinity,
  });
}

/**
 * Toàn bộ nhà máy, đã tính toán.
 *
 * @param shiftId       ca đang xem
 * @param currentMinutes mốc "bây giờ". `null` khi xem lại ca đã kết thúc.
 * @param pollInterval  0 để tắt polling (màn TV dùng nhịp riêng)
 */
export function useProductionSnapshot({
  shiftId,
  currentMinutes = currentMinutesOfDay(),
  pollInterval = DEFAULT_POLL_INTERVAL_MS,
} = {}) {
  const query = useQuery({
    queryKey: queryKeys.snapshot(shiftId),
    queryFn: () => getShiftSnapshot({ shiftId, currentMinutes }),
    refetchInterval: pollInterval,
    retry: 0,
    placeholderData: keepPreviousData,
    enabled: Boolean(shiftId),
  });

  const view = useMemo(() => (query.data ? buildSnapshotView(query.data) : null), [query.data]);

  return { ...query, view };
}

/**
 * Chi tiết một line, kèm chuỗi theo giờ và chuỗi lũy tiến cho biểu đồ.
 */
export function useLineDetail({ shiftId, lineId, currentMinutes, pollInterval }) {
  const query = useQuery({
    queryKey: [...queryKeys.snapshot(shiftId), 'line', lineId],
    queryFn: () => getShiftSnapshot({ shiftId, currentMinutes }),
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
