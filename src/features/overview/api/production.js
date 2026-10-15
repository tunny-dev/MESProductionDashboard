import { MES_S_CODES } from '@/config/api';
import { mesGet } from '@/lib/mes-http';
import { unwrapList } from '@/lib/unwrap-response';

const PRODUCTION_SYSTEM = 'sfcs';

export function currentMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export async function getAreas() {
  return unwrapList(await mesGet(MES_S_CODES.production.areas, undefined, PRODUCTION_SYSTEM));
}

export async function getShifts() {
  return unwrapList(await mesGet(MES_S_CODES.production.shifts, undefined, PRODUCTION_SYSTEM));
}

export async function getStopReasons() {
  return unwrapList(await mesGet(MES_S_CODES.production.stopReasons, undefined, PRODUCTION_SYSTEM));
}

export async function getShiftSnapshot({ shiftId, currentMinutes = currentMinutesOfDay() }) {
  return mesGet(
    MES_S_CODES.production.snapshot,
    { P_SHIFT_ID: shiftId, P_CURRENT_MINUTES: currentMinutes },
    PRODUCTION_SYSTEM
  );
}

export async function getLineDetail({ shiftId, lineId, currentMinutes = currentMinutesOfDay() }) {
  return mesGet(
    MES_S_CODES.production.lineDetail,
    { P_SHIFT_ID: shiftId, P_LINE_ID: lineId, P_CURRENT_MINUTES: currentMinutes },
    PRODUCTION_SYSTEM
  );
}
