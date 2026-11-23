import { useQuery } from '@tanstack/react-query';
import {
  getProductionLine,
  getModelByLine,
  getMoByLine,
  getMoInfo,
  getMfgByLine,
} from '@/services/line.service';

/**
 * Query Key Factory chuẩn hóa cho phân hệ Line / Chuyền sản xuất.
 * Hỗ trợ hierarchical invalidation: queryClient.invalidateQueries({ queryKey: lineKeys.all })
 */
export const lineKeys = {
  all: ['lines'],
  list: (deptCode) => [...lineKeys.all, 'list', deptCode ?? ''],
  models: (lineId) => [...lineKeys.all, 'models', lineId ?? ''],
  moList: (lineId, dateStr) => [
    ...lineKeys.all,
    'mo-list',
    { lineId: lineId ?? '', dateStr: dateStr ?? '' },
  ],
  moInfo: (mo) => [...lineKeys.all, 'mo-info', mo ?? ''],
  mfg: (lineId) => [...lineKeys.all, 'mfg', lineId ?? ''],
};

/** Danh sách chuyền sản xuất theo mã phân xưởng (deptCode / mfgCode). */
export function useLines(deptCode) {
  return useQuery({
    queryKey: lineKeys.list(deptCode),
    queryFn: () => getProductionLine(deptCode),
    enabled: Boolean(deptCode),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/** Model load sau khi đã chọn chuyền. */
export function useModels(lineId) {
  return useQuery({
    queryKey: lineKeys.models(lineId),
    queryFn: () => getModelByLine(lineId),
    enabled: Boolean(lineId),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/**
 * Danh sách WO/MO đang chạy trên chuyền theo ngày.
 * @param {string|null} lineId
 * @param {string|null} dateStr  YYYYMMDD
 */
export function useMoByLine(lineId, dateStr, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: lineKeys.moList(lineId, dateStr),
    queryFn: () => getMoByLine(lineId, dateStr),
    enabled: Boolean(lineId) && Boolean(dateStr) && enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/**
 * Chi tiết 1 WO cho thẻ thông tin MO — gọi sau khi đã tra cứu.
 * @param {string|null} mo
 * @param {boolean} enabled
 */
export function useMoInfo(mo, enabled = true) {
  return useQuery({
    queryKey: lineKeys.moInfo(mo),
    queryFn: () => getMoInfo(mo),
    enabled: Boolean(mo) && enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/**
 * Lấy thông tin công đoạn theo line - dùng để restore process khi reload với ?line=.
 * @param {string|null} lineId
 */
export function useMfgByLine(lineId) {
  return useQuery({
    queryKey: lineKeys.mfg(lineId),
    queryFn: () => getMfgByLine(lineId),
    enabled: Boolean(lineId),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}
