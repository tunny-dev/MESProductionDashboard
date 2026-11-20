import { ENDPOINTS, DEFAULT_FACTORY } from '@/config/api';
import { http } from '@/lib/http';

export { DEFAULT_FACTORY };

/** Danh mục công đoạn sản xuất (MfgType). */
export async function getStages({ factory = DEFAULT_FACTORY } = {}) {
  const rows = await http.get(ENDPOINTS.cim.mfgType, {
    params: { factory: factory ?? DEFAULT_FACTORY },
  });
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const id = (row?.mfgTypeName ?? row?.mfgType ?? '').trim();
    if (!id) continue;
    const key = id.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id,
      deptCode: row.mfgCode?.trim() || null,
      factory: row.factory?.trim() || null,
    });
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

/** Danh mục khu vực sản xuất (Area / Dept). */
export async function getProductionAreaList() {
  const rows = await http.get(ENDPOINTS.cim.areaList, {
    params: DEFAULT_FACTORY ? { factory: DEFAULT_FACTORY } : {},
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

/** Danh mục ca sản xuất. */
export async function getProductionShiftList() {
  const rows = await http.get(ENDPOINTS.cim.shiftList);
  return toOptions(rows, { idKey: 'shift', nameKey: 'shiftName' });
}

/** Danh sách chi tiết Serial Number theo trạm (Finish, Input, NotInput, NG). */
export async function getStationSerials(params) {
  return await http.get(ENDPOINTS.productionReport.stationSerials, {
    params,
  });
}
