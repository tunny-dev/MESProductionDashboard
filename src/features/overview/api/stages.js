import { MES_S_CODES, DEFAULT_FACTORY } from '@/config/api';
import { mesRows } from '@/lib/mes-http';

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
function normalizeStageRows(rows) {
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
      row.MfgTypeName ??
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
