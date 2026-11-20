import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getProductionAreaList,
  getProductionShiftList,
  getStationSerials,
  getStages,
} from '@/services/production.service';

/**
 * Query Key Factory chuẩn hóa cho phân hệ Production (Khu vực, Ca, Công đoạn, Serial Number).
 */
export const productionKeys = {
  all: ['production'],
  areas: () => [...productionKeys.all, 'areas'],
  shifts: () => [...productionKeys.all, 'shifts'],
  stages: (factory) => [...productionKeys.all, 'stages', factory ?? ''],
  stationSerials: (params) => [...productionKeys.all, 'station-serials', params],
};

export function useAreas() {
  return useQuery({
    queryKey: productionKeys.areas(),
    queryFn: getProductionAreaList,
    staleTime: Infinity,
  });
}

export function useShifts() {
  return useQuery({
    queryKey: productionKeys.shifts(),
    queryFn: getProductionShiftList,
    staleTime: Infinity,
  });
}

/**
 * Lấy dữ liệu công đoạn sản xuất
 */
export function useStages({ factory } = {}) {
  return useQuery({
    queryKey: productionKeys.stages(factory),
    queryFn: () => getStages({ factory }),
    staleTime: Infinity,
  });
}

/**
 * Tra cứu chi tiết Serial Number theo trạm sản xuất (Finish, Input, NotInput, NG).
 * Tối ưu hoá queryKey chuẩn hóa & cache RAM 5 phút (stale 1 phút) giúp UI phản hồi tức thì 0ms,
 * không gửi lại request liên tục khi bấm qua lại giữa các tab hay đóng mở modal.
 */
export function useStationSerials(params, { enabled = true } = {}) {
  const queryParams = useMemo(
    () => ({
      mo: params?.mo ?? '',
      station: params?.station ?? '',
      line: params?.line ?? '',
      sDate: params?.sDate ?? '',
      shift: params?.shift ?? '',
      category: params?.category ?? 'FINISH',
    }),
    [params?.mo, params?.station, params?.line, params?.sDate, params?.shift, params?.category]
  );

  return useQuery({
    queryKey: productionKeys.stationSerials(queryParams),
    queryFn: async () => {
      const res = await getStationSerials(queryParams);
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: enabled && Boolean(queryParams.mo),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
