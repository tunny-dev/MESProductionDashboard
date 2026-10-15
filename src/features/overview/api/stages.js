import { MES_S_CODES } from '@/config/api';
import { mesPost } from '@/lib/mes-http';
import { unwrapList } from '@/lib/unwrap-response';

const PRODUCTION_SYSTEM = 'sfcs';

export const DEFAULT_FACTORY = import.meta.env.VITE_MES_FACTORY || 'VN';

/**
 * Danh mục công đoạn qua GET_MFG_TYPE.
 * Request:  { P_DC003: factory }  (vd: "VN")
 * Response: [{ MfgCode: "VN001", MfgType: "SMT", Factory: "VN" }, ...]
 */
export async function getStages({ factory = DEFAULT_FACTORY } = {}) {
  const rows = await mesPost(
    MES_S_CODES.production.stages,
    { P_DC003: factory ?? DEFAULT_FACTORY },
    PRODUCTION_SYSTEM
  );
  return normalizeStageRows(unwrapList(rows));
}

/**
 * Chuẩn hoá về [{ id: 'SMT', deptCode: 'VN001', factory: 'VN' }]
 * để downstream dùng `id` hiển thị và `deptCode` làm payload MD004
 * cho GET_PRODUCTION_LINE. Giữ tương thích ngược với payload cũ
 * MGMT_11_SELECT ({ DC001, DC002 }) và string trần (legacy).
 */
function normalizeStageRows(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    // Legacy: BE trả về plain string — wrap lại, deptCode unknown
    if (typeof row === 'string') {
      const id = row.trim();
      if (id && !seen.has(id.toUpperCase())) {
        seen.add(id.toUpperCase());
        out.push({ id, deptCode: null, factory: null });
      }
      continue;
    }
    if (typeof row !== 'object' || row === null) continue;

    // Mới: MfgType = tên công đoạn (SMT/DIP/FA), MfgCode = mã dept (VN001/...)
    // Cũ (MGMT_11_SELECT): DC002 = tên công đoạn, DC001 = mã dept
    const rawId =
      row.mfgType ??
      row.MfgType ??
      row.dc002 ??
      row.DC002 ??
      row.stage ??
      row.STAGE ??
      row.process ??
      row.PROCESS ??
      row.code ??
      row.CODE ??
      row.name ??
      row.NAME;
    const rawDept = row.mfgCode ?? row.MfgCode ?? row.dc001 ?? row.DC001;
    const rawFactory = row.factory ?? row.Factory ?? null;

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
