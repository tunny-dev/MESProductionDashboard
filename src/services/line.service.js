import { MES_S_CODES } from '@/constants/api';
import { mesRows, mesRow } from '@/core/api/mesClient';
import { toCompactDate, toCompactDateOr } from '@/core/utils/date';
import { toNum, toText } from '@/core/utils/coerce';

/**
 * Danh sách chuyền theo dept (VD: VN001 — `CMSMD.MD004`).
 * sCode `getProductionLine`.
 * @param {string} deptCode
 * @returns {Promise<Array<{ id: string, name: string, group: string }>>}
 */
export async function getProductionLine(deptCode) {
  if (!deptCode) return [];
  const rows = await mesRows(MES_S_CODES.production.getProductionLine, { deptCode });
  return rows.map((l) => ({
    id: l.lineId ?? null,
    name: l.lineName ?? null,
    group: l.deptCode ?? deptCode,
  }));
}

/**
 * Danh sách model đang có WO trên chuyền, trong ngày hôm nay.
 * sCode `getModelByLine`.
 * @param {string} lineId
 * @returns {Promise<Array<{ code: string, name: string }>>}
 */
export async function getModelByLine(lineId) {
  if (!lineId) return [];
  const today = toCompactDate(new Date());
  const rows = await mesRows(MES_S_CODES.mo.getModelByLine, {
    line: lineId,
    from: today,
    to: today,
  });
  return rows
    .map((r) => ({
      code: toText(r.code),
      name: toText(r.name ?? r.code),
    }))
    .filter((r) => r.code);
}

/**
 * Danh sách WO/MO đang chạy trên chuyền theo ngày.
 * sCode `getMoByLine`.
 * @param {string} lineId
 * @param {string} dateStr  YYYYMMDD
 * @returns {Promise<Array<{ mo: string, partNumber: string|null, modelName: string|null, planQty: number|null, status: string|null }>>}
 */
export async function getMoByLine(lineId, dateStr) {
  if (!lineId || !dateStr) return [];
  const date = toCompactDateOr(dateStr, null);
  if (!date) return [];

  const rows = await mesRows(MES_S_CODES.mo.getMoByLine, { line: lineId, date });
  return rows.filter((r) => r.mo).map(toMoRow);
}

/**
 * Chi tiết 1 WO cho thẻ thông tin MO.
 * sCode `getMoInfo`. Không tìm thấy → `null`.
 * @param {string} mo
 * @returns {Promise<{ mo: string, partNumber: string|null, modelName: string|null, planQty: number|null, status: string|null } | null>}
 */
export async function getMoInfo(mo) {
  if (!mo) return null;
  const r = await mesRow(MES_S_CODES.mo.getMoInfo, { mo });
  return r ? toMoRow(r, mo) : null;
}

function toMoRow(r, fallbackMo = null) {
  return {
    mo: r.mo ?? fallbackMo,
    partNumber: r.partNumber ?? null,
    modelName: r.modelName ?? null,
    planQty: toNum(r.planQty),
    status: toText(r.status, null),
  };
}

/**
 * Thông tin công đoạn (MfgType) theo line — dùng để restore process khi reload.
 * sCode `getMfgByLine`.
 * @param {string} lineId
 * @returns {Promise<{ stage: string, stageDes: string, factory: string, mfgCode: string, mfgType: string } | null>}
 */
export async function getMfgByLine(lineId) {
  if (!lineId) return null;
  const r = await mesRow(MES_S_CODES.production.getMfgByLine, { line: lineId });
  if (!r) return null;
  return {
    stage: r.stage ?? lineId,
    stageDes: r.stageDes ?? '',
    factory: r.factory ?? '',
    mfgCode: r.mfgCode ?? '',
    mfgType: r.mfgType ?? '',
  };
}
