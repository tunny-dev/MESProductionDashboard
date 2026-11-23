import { http } from '@/lib/http';
import { ENDPOINTS } from '@/config/api';
import {
  getProductionAreaList as getOverviewAreaList,
  getProductionShiftList as getOverviewShiftList,
} from '@/services/production.service';

/** Số phút tính từ nửa đêm của giờ hiện tại trên máy client. */
export function currentMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export { getOverviewAreaList, getOverviewShiftList };

/**
 * Lấy ảnh chụp dữ liệu tổng thể các chuyền trong ca cho Overview.
 */
export async function getOverviewSnapshot({ shiftId }) {
  return await http.get(ENDPOINTS.overview.snapshot, {
    params: { shiftId },
  });
}
