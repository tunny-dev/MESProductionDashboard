import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getCctMfgTypes,
  getCctLines,
  getCctModels,
  listCimCycleTime,
  createCimCycleTime,
  updateCimCycleTime,
} from '@/services/cimCycleTime.service';

export const cctKeys = {
  mfgTypes: () => ['cct', 'mfg-types'],
  lines: (deptCode) => ['cct', 'lines', deptCode ?? ''],
  models: (lineId) => ['cct', 'models', lineId ?? ''],
  list: (filters) => ['cct', 'list', filters],
};

/** Danh sách MfgType cho <Select>. */
export function useCctMfgTypes() {
  return useQuery({
    queryKey: cctKeys.mfgTypes(),
    queryFn: () => getCctMfgTypes(),
    staleTime: 30 * 60 * 1000,
  });
}

/** Danh sách Line theo deptCode (mã bộ phận VD: VN001). */
export function useCctLines({ deptCode } = {}) {
  return useQuery({
    queryKey: cctKeys.lines(deptCode),
    queryFn: () => getCctLines({ deptCode }),
    enabled: Boolean(deptCode),
    staleTime: 5 * 60 * 1000,
  });
}

/** Danh sách Model (partNumber + modelName) theo lineId. */
export function useCctModels({ lineId } = {}) {
  return useQuery({
    queryKey: cctKeys.models(lineId),
    queryFn: () => getCctModels({ lineId }),
    enabled: Boolean(lineId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Danh sách CimCycleTime với bộ lọc.
 * @param {{ mfgType?: string, partNumber?: string, stage?: string, enabled?: boolean }} options
 */
export function useCctList({ mfgType, partNumber, stage, enabled = true } = {}) {
  const filters = {
    mfgType: mfgType || null,
    partNumber: partNumber || null,
    stage: stage || null,
  };
  return useQuery({
    queryKey: cctKeys.list(filters),
    queryFn: () => listCimCycleTime(filters),
    enabled,
    staleTime: 0,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

/** Tạo bản ghi mới — sau khi thành công invalidate danh sách. */
export function useCctCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, creator }) => createCimCycleTime(payload, creator),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cct', 'list'] });
    },
  });
}

/** Cập nhật bản ghi — sau khi thành công invalidate danh sách. */
export function useCctUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload, modifier }) => updateCimCycleTime(id, payload, modifier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cct', 'list'] });
    },
  });
}
