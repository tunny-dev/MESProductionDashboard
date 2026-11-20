import { http } from '@/lib/http';
import { ENDPOINTS } from '@/config/api';

/**
 * Lấy toàn bộ số liệu thời gian thực cho Bảng Sản Lượng Chuyền (Production Board).
 * @param {{ line: string, date?: string, shift?: string, mo?: string, station?: string }} params
 */
export async function getLineProductionBoard({ line, date, shift, mo, station } = {}) {
  return await http.get(ENDPOINTS.productionBoard.lineBoard, {
    params: {
      line,
      date,
      shift,
      mo,
      station,
    },
  });
}
