import { mesPost } from '@/lib/mes-http';
import { unwrapList } from '@/lib/unwrap-response';
import { MES_S_CODES } from '@/config/api';

/**
 * Lấy danh sách chuyền theo dept.
 * @returns {Array<{ id: string, name: string, group: string }>}
 */
export async function getLines(deptCode) {
  if (!deptCode) return [];
  const res = await mesPost(MES_S_CODES.production.getProductionLine, { MD004: deptCode });
  return unwrapList(res).map((l) => ({
    id: l.lineId ?? l.MD001,
    name: l.lineName ?? l.MD002,
    group: l.deptCode ?? l.MD004,
  }));
}

/**
 * Lấy danh sách model đang có WO trên chuyền theo ngày.
 * @returns {Array<{ code: string, name: string }>}
 */
export async function getModels(lineId) {
  if (!lineId) return [];
  const sd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const res = await mesPost(MES_S_CODES.production.getModelByLine, {
    LINE: lineId,
    SDATE: sd,
    EDATE: sd,
  });
  return unwrapList(res)
    .map((r) => ({ code: r.code ?? r.CODE ?? '', name: r.name ?? r.NAME ?? r.code ?? r.CODE ?? '' }))
    .filter((r) => r.code);
}

/**
 * Lấy danh sách WO/MO đang chạy trên chuyền theo ngày.
 * @param {string} lineId
 * @param {string} dateStr  YYYYMMDD
 * @returns {Array<{ mo: string, partNumber: string|null, modelName: string|null, planQty: number|null, status: string|null }>}
 */
export async function getMoByLine(lineId, dateStr) {
  if (!lineId || !dateStr) return [];
  const res = await mesPost(MES_S_CODES.production.getMoByLine, {
    LINE: lineId,
    SDATE: dateStr,
  });
  return unwrapList(res)
    .filter((r) => r.mo ?? r.Mo)
    .map((r) => ({
      mo: r.mo ?? r.Mo,
      partNumber: r.partNumber ?? r.PartNumber ?? null,
      modelName: r.modelName ?? r.ModelName ?? null,
      planQty: (r.planQty ?? r.PlanQty) == null ? null : Number(r.planQty ?? r.PlanQty),
      status: (r.status ?? r.Status) == null ? null : String(r.status ?? r.Status),
    }));
}

/**
 * Chi tiết 1 WO cho thẻ thông tin MO.
 * @param {string} mo
 * @returns {{ mo: string, partNumber: string|null, modelName: string|null, planQty: number|null, status: string|null } | null}
 */
export async function getMoInfo(mo) {
  if (!mo) return null;
  const res = await mesPost(MES_S_CODES.production.getMoInfo, { MO: mo });
  const rows = unwrapList(res);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    mo: r.mo ?? r.Mo ?? mo,
    partNumber: r.partNumber ?? r.PartNumber ?? null,
    modelName: r.modelName ?? r.ModelName ?? null,
    planQty: (r.planQty ?? r.PlanQty) == null ? null : Number(r.planQty ?? r.PlanQty),
    status: (r.status ?? r.Status) == null ? null : String(r.status ?? r.Status),
  };
}

/**
 * Lấy thông tin công đoạn (MfgType) theo line — dùng để restore process khi reload.
 * @param {string} lineId
 * @returns {{ stage: string, stageDes: string, factory: string, mfgCode: string, mfgType: string } | null}
 */
export async function getMfgByLine(lineId) {
  if (!lineId) return null;
  const res = await mesPost(MES_S_CODES.production.getMfgByLine, { LINE: lineId });
  const rows = unwrapList(res);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    stage: (r.stage ?? r.Stage) ?? lineId,
    stageDes: (r.stageDes ?? r.StageDes) ?? '',
    factory: (r.factory ?? r.Factory) ?? '',
    mfgCode: (r.mfgCode ?? r.MfgCode) ?? '', // MfgCode — deptCode
    mfgType: (r.mfgType ?? r.MfgType) ?? '', // SMT / DIP / FA
  };
}
