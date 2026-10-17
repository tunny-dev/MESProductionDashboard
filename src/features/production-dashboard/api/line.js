import { http } from '@/lib/http';
import { ENDPOINTS } from '@/config/api';
import { toIsoDate, toIsoDateOr } from '@/lib/api-params';

/**
 * Danh mục chuyền / model / WO cho bộ lọc dashboard.
 * Toàn bộ gọi GET trên API mới — query param bind case-insensitive, nhưng
 * dùng đúng tên camelCase của DTO cho rõ ràng.
 */

/**
 * Lấy danh sách chuyền theo dept (H001/H002/H003).
 * @param {string} deptCode
 * @returns {Promise<Array<{ id: string, name: string, group: string }>>}
 */
export async function getLines(deptCode) {
  if (!deptCode) return [];
  const rows = await http.get(ENDPOINTS.cim.productionLine, { params: { deptCode } });
  return (rows ?? []).map((l) => ({
    id: l.lineId,
    name: l.lineName,
    group: l.deptCode,
  }));
}

/**
 * Lấy danh sách model đang có WO trên chuyền, trong ngày hôm nay.
 * @param {string} lineId
 * @returns {Promise<Array<{ code: string, name: string }>>}
 */
export async function getModels(lineId) {
  if (!lineId) return [];
  const today = toIsoDate(new Date());
  const rows = await http.get(ENDPOINTS.mo.modelByLine, {
    params: { line: lineId, from: today, to: today },
  });
  return (rows ?? [])
    .map((r) => ({ code: r.code ?? '', name: r.name ?? r.code ?? '' }))
    .filter((r) => r.code);
}

/**
 * Lấy danh sách WO/MO đang chạy trên chuyền theo ngày.
 * @param {string} lineId
 * @param {string} dateStr  YYYYMMDD
 * @returns {Promise<Array<{ mo: string, partNumber: string|null, modelName: string|null, planQty: number|null, status: string|null }>>}
 */
export async function getMoByLine(lineId, dateStr) {
  if (!lineId || !dateStr) return [];
  const date = toIsoDateOr(dateStr, null);
  if (!date) return [];

  const rows = await http.get(ENDPOINTS.mo.byLine, { params: { line: lineId, date } });
  return (rows ?? [])
    .filter((r) => r.mo)
    .map((r) => ({
      mo: r.mo,
      partNumber: r.partNumber ?? null,
      modelName: r.modelName ?? null,
      planQty: r.planQty == null ? null : Number(r.planQty),
      status: r.status == null ? null : String(r.status),
    }));
}

/**
 * Chi tiết 1 WO cho thẻ thông tin MO.
 * @param {string} mo
 * @returns {Promise<{ mo: string, partNumber: string|null, modelName: string|null, planQty: number|null, status: string|null } | null>}
 */
export async function getMoInfo(mo) {
  if (!mo) return null;
  try {
    const r = await http.get(ENDPOINTS.mo.info, { params: { mo } });
    if (!r) return null;
    return {
      mo: r.mo ?? mo,
      partNumber: r.partNumber ?? null,
      modelName: r.modelName ?? null,
      planQty: r.planQty == null ? null : Number(r.planQty),
      status: r.status == null ? null : String(r.status),
    };
  } catch (error) {
    // API trả 404 khi không tìm thấy MO — coi như "không có", không phải lỗi.
    if (error.status === 404) return null;
    throw error;
  }
}

/**
 * Lấy thông tin công đoạn (MfgType) theo line — dùng để restore process khi reload.
 * @param {string} lineId
 * @returns {Promise<{ stage: string, stageDes: string, factory: string, mfgCode: string, mfgType: string } | null>}
 */
export async function getMfgByLine(lineId) {
  if (!lineId) return null;
  const r = await http.get(ENDPOINTS.cim.mfgByLine, { params: { line: lineId } });
  if (!r) return null;
  return {
    stage: r.stage ?? lineId,
    stageDes: r.stageDes ?? '',
    factory: r.factory ?? '',
    mfgCode: r.mfgCode ?? '', // deptCode (VD: VN001)
    mfgType: r.mfgType ?? '', // SMT / DIP / FA
  };
}
