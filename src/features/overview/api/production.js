import { MES_S_CODES, DEFAULT_FACTORY } from '@/config/api';
import { mesRows, mesRow } from '@/lib/mes-http';

export { DEFAULT_FACTORY };

function toOptions(rows, { idKey, nameKey, extra }) {
  const idUpper = idKey.toUpperCase();
  const nameUpper = nameKey.toUpperCase();
  return (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const id = r[idKey] ?? r[idUpper] ?? null;
      return {
        id,
        name: r[nameKey] ?? r[nameUpper] ?? id,
        ...(extra ? extra(r) : null),
      };
    })
    .filter((o) => o.id !== null && o.id !== undefined && o.id !== '');
}

/**
 * Danh mục "khu vực sản xuất" — sCode `getProductionAreaList`.
 * Response `[{ dept, deptName, factory }]` → `{ id, name, factory }`.
 * SP tự lọc theo nhà máy (`factory`)
 */
export async function getProductionAreaList() {
  const rows = await mesRows(MES_S_CODES.production.getProductionAreaList, {
    ...(DEFAULT_FACTORY ? { factory: DEFAULT_FACTORY } : {}),
  });
  return toOptions(rows, {
    idKey: 'dept',
    nameKey: 'deptName',
    extra: (r) => ({ factory: r.factory ?? r.FACTORY ?? null }),
  }).filter(
    (a) =>
      !DEFAULT_FACTORY ||
      !a.factory ||
      String(a.factory).toUpperCase() === String(DEFAULT_FACTORY).toUpperCase()
  );
}

/** Danh mục ca — sCode `getProductionShiftList` → `[{ id, name }]`. */
export async function getProductionShiftList() {
  const rows = await mesRows(MES_S_CODES.production.getProductionShiftList, {});
  return toOptions(rows, { idKey: 'shift', nameKey: 'shiftName' });
}

/** Danh mục lý do dừng — sCode `getProductionStopReasonList` → `[{ id, name }]`. */
export async function getProductionStopReasonList() {
  const rows = await mesRows(MES_S_CODES.production.getProductionStopReasonList, {});
  return toOptions(rows, { idKey: 'code', nameKey: 'name' });
}

/**
 * Ảnh chụp KPI của ca — sCode `getProductionSnapshot`.
 * Payload `{ shiftId }`. Response 1 dòng `{ totalInput, totalOutput }`.
 */
export async function getProductionSnapshot({ shiftId }) {
  return mesRow(MES_S_CODES.production.getProductionSnapshot, { shiftId });
}

/**
 * Chi tiết theo trạm của 1 chuyền trong ca — sCode `getProductionLineDetail`.
 * Payload `{ shiftId, lineId }`.
 */
export async function getProductionLineDetail({ shiftId, lineId }) {
  return mesRows(MES_S_CODES.production.getProductionLineDetail, { shiftId, lineId });
}

export function currentMinutesOfDay(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}
