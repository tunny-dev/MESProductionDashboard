import { MES_S_CODES, DEFAULT_FACTORY } from '@/constants/api';
import { mesRows, mesRow } from '@/core/api/mesClient';

export { DEFAULT_FACTORY };

/**
 * Danh mục công đoạn — sCode `getMfgType`.
 * Payload:  `{ factory: 'VN' }`
 * Response: `[{ mfgCode: 'VN001', mfgTypeName: 'SMT', factory: 'VN' }, ...]`
 */
export async function getStages({ factory = DEFAULT_FACTORY } = {}) {
  const rows = await mesRows(MES_S_CODES.production.getMfgType, {
    factory: factory ?? DEFAULT_FACTORY,
  });
  return normalizeStageRows(rows);
}

/**
 * Chuẩn hoá về `[{ id: 'SMT', deptCode: 'VN001', factory: 'VN' }]` để downstream
 * dùng `id` hiển thị và `deptCode` làm payload cho sCode `getProductionLine`.
 */
export function normalizeStageRows(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (typeof row === 'string') {
      const id = row.trim();
      if (id && !seen.has(id.toUpperCase())) {
        seen.add(id.toUpperCase());
        out.push({ id, deptCode: null, factory: null });
      }
      continue;
    }
    if (typeof row !== 'object' || row === null) continue;

    const rawId =
      row.mfgTypeName ??
      row.mfgType ??
      row.dc002 ??
      row.stage ??
      row.process ??
      row.code ??
      row.name;
    const rawDept = row.mfgCode ?? row.dc001;
    const rawFactory = row.factory ?? null;

    const id = typeof rawId === 'string' ? rawId.trim() : rawId;
    if (typeof id !== 'string' || id === '') continue;

    const key = id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const deptCode = typeof rawDept === 'string' ? rawDept.trim() || null : (rawDept ?? null);
    const factory =
      typeof rawFactory === 'string' ? rawFactory.trim() || null : (rawFactory ?? null);

    out.push({ id, deptCode, factory });
  }
  return out;
}

function toOptions(rows, { idKey, nameKey, extra }) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const id = r[idKey] ?? null;
      return {
        id,
        name: r[nameKey] ?? id,
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
    extra: (r) => ({ factory: r.factory ?? null }),
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
