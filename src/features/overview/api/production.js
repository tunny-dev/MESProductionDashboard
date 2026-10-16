import { MES_S_CODES } from '@/config/api';
import { mesPost } from '@/lib/mes-http';
import { unwrapList } from '@/lib/unwrap-response';

const PRODUCTION_SYSTEM = 'sfcs';

export function currentMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

export async function getAreas() {
  return unwrapList(
    await mesPost(MES_S_CODES.production.getProductionAreaList, {}, PRODUCTION_SYSTEM)
  );
}

export async function getShifts() {
  return unwrapList(
    await mesPost(MES_S_CODES.production.getProductionShiftList, {}, PRODUCTION_SYSTEM)
  );
}

export async function getStopReasons() {
  return unwrapList(
    await mesPost(MES_S_CODES.production.getProductionStopReasonList, {}, PRODUCTION_SYSTEM)
  );
}

export async function getShiftSnapshot({ shiftId, currentMinutes = currentMinutesOfDay() }) {
  return unwrapList(
    await mesPost(
      MES_S_CODES.production.getProductionSnapshot,
      { P_SHIFT_ID: shiftId, P_CURRENT_MINUTES: currentMinutes },
      PRODUCTION_SYSTEM
    )
  );
}

export async function getLineDetail({ shiftId, lineId, currentMinutes = currentMinutesOfDay() }) {
  return unwrapList(
    await mesPost(
      MES_S_CODES.production.getProductionLineDetail,
      { P_SHIFT_ID: shiftId, P_LINE_ID: lineId, P_CURRENT_MINUTES: currentMinutes },
      PRODUCTION_SYSTEM
    )
  );
}
