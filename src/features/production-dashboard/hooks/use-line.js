import { useQuery } from '@tanstack/react-query';
import {
  getProductionLine,
  getModelByLine,
  getMoByLine,
  getMoInfo,
  getMfgByLine,
} from '@/features/production-dashboard/api/line';

/** Chuyền load sau khi đã có deptCode (MfgCode từ GET_MFG_TYPE). */
export function useLines(deptCode) {
  return useQuery({
    queryKey: ['production-dashboard', 'lines', deptCode ?? ''],
    queryFn: () => getProductionLine(deptCode),
    enabled: Boolean(deptCode),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/** Model load sau khi đã chọn chuyền. */
export function useModels(lineId) {
  return useQuery({
    queryKey: ['production-dashboard', 'models', lineId ?? ''],
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
export function useMoByLine(lineId, dateStr) {
  return useQuery({
    queryKey: ['production-dashboard', 'mo', lineId ?? '', dateStr ?? ''],
    queryFn: () => getMoByLine(lineId, dateStr),
    enabled: Boolean(lineId) && Boolean(dateStr),
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
    queryKey: ['production-dashboard', 'mo-info', mo ?? ''],
    queryFn: () => getMoInfo(mo),
    enabled: Boolean(mo) && enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

/**
 * Lấy thông tin công đoạn theo line — dùng để restore process khi reload với ?line=.
 * @param {string|null} lineId
 */
export function useMfgByLine(lineId) {
  return useQuery({
    queryKey: ['production-dashboard', 'mfg', lineId ?? ''],
    queryFn: () => getMfgByLine(lineId),
    enabled: Boolean(lineId),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}
