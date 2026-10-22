import { MES_S_CODES } from '@/config/api';
import { mesRows, mesRow } from '@/lib/mes-http';
import { toCompactDate, toCompactDateOr } from '@/lib/date';
import { toNum, toText } from '@/lib/coerce';

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
    id: l.lineId ?? l.LINE_ID ?? null,
    name: l.lineName ?? l.LINE_NAME ?? null,
    group: l.deptCode ?? l.DEPT_CODE ?? deptCode,
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
      code: toText(r.code ?? r.CODE),
      name: toText(r.name ?? r.NAME ?? r.code ?? r.CODE),
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
  return rows.filter((r) => r.mo ?? r.MO).map(toMoRow);
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
    mo: r.mo ?? r.MO ?? fallbackMo,
    partNumber: r.partNumber ?? r.PART_NUMBER ?? null,
    modelName: r.modelName ?? r.MODEL_NAME ?? null,
    planQty: toNum(r.planQty ?? r.PLAN_QTY),
    status: toText(r.status ?? r.STATUS, null),
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
    stage: r.stage ?? r.STAGE ?? lineId,
    stageDes: r.stageDes ?? r.STAGE_DES ?? '',
    factory: r.factory ?? r.FACTORY ?? '',
    mfgCode: r.mfgCode ?? r.MFG_CODE ?? '', // deptCode (VD: VN001)
    mfgType: r.mfgType ?? r.MFG_TYPE ?? '', // SMT / DIP / FA
  };
}
