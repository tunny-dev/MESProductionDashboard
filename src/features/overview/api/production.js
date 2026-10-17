import { http } from '@/lib/http';
import { ENDPOINTS } from '@/config/api';

/**
 * API cho trang Tổng quan.
 */

export function currentMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export async function getAreas() {
  const data = await http.get(ENDPOINTS.cim.productionAreaList);
  return Array.isArray(data) ? data : [];
}

export async function getShifts() {
  const data = await http.get(ENDPOINTS.cim.productionShiftList);
  return Array.isArray(data) ? data : [];
}

export async function getStopReasons() {
  const data = await http.get(ENDPOINTS.cim.productionStopReasonList);
  return Array.isArray(data) ? data : [];
}

export async function getShiftSnapshot({ shiftId, currentMinutes = currentMinutesOfDay() }) {
  return http.get(ENDPOINTS.production.snapshot, {
    params: { shiftId, currentMinutes },
  });
}

export async function getLineDetail({ shiftId, lineId, currentMinutes = currentMinutesOfDay() }) {
  const data = await http.get(ENDPOINTS.production.lineDetail, {
    params: { shiftId, lineId, currentMinutes },
  });
  return Array.isArray(data) ? data : [];
}
