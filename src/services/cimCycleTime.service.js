import { MES_S_CODES, DEFAULT_FACTORY } from '@/constants/api';
import { mesRows, mesPost } from '@/core/api/mesClient';
import { toText, toNum } from '@/core/utils/coerce';

/**
 * Danh sách MfgType (công đoạn): SMT, DIP, FA, MT …
 * sCode `getMfgType`. Trả `[{ id, deptCode, factory }]`
 */
export async function getCctMfgTypes({ factory = DEFAULT_FACTORY } = {}) {
  const rows = await mesRows(MES_S_CODES.production.getMfgType, {
    factory: factory ?? DEFAULT_FACTORY,
  });
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows.reduce((acc, r) => {
    if (typeof r === 'string') {
      const id = r.trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        acc.push({ id, deptCode: null });
      }
      return acc;
    }
    if (!r || typeof r !== 'object') return acc;
    const id = toText(r.mfgTypeName ?? r.mfgType ?? r.name);
    const deptCode = toText(r.mfgCode ?? r.dc001, null);
    if (!id || seen.has(id)) return acc;
    seen.add(id);
    acc.push({ id, deptCode });
    return acc;
  }, []);
}

/**
 * Danh sách chuyền (line) theo dept.
 * sCode `getProductionLine`. Trả `[{ id, name }]`
 */
export async function getCctLines({ deptCode } = {}) {
  if (!deptCode) return [];
  const rows = await mesRows(MES_S_CODES.production.getProductionLine, { deptCode });
  return rows
    .map((l) => ({
      id: toText(l.lineId ?? l.id),
      name: toText(l.lineName ?? l.name),
    }))
    .filter((l) => l.id);
}

/**
 * Danh sách model theo line.
 * sCode `getModelByLine`. Trả `[{ partNumber, modelName }]`
 *
 * getModelByLine trả về code (= partNumber) + name (= modelName).
 */
export async function getCctModels({ lineId } = {}) {
  if (!lineId) return [];
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;

  const rows = await mesRows(MES_S_CODES.mo.getModelByLine, {
    line: lineId,
    from: dateStr,
    to: dateStr,
  });
  return rows
    .map((r) => ({
      partNumber: toText(r.code ?? r.partNumber),
      modelName: toText(r.name ?? r.modelName),
    }))
    .filter((r) => r.partNumber);
}

/**
 * Lấy danh sách CimCycleTime với bộ lọc tuỳ chọn.
 * sCode `getCimCycleTime` — SELECT * FROM CimCycleTime ORDER BY UpdatedAt DESC
 * Filter phía client vì SP không nhận params.
 * @param {{ mfgType?: string, partNumber?: string, stage?: string }} [params]
 */
export async function listCimCycleTime({ mfgType, partNumber, stage } = {}) {
  const rows = await mesRows(MES_S_CODES.maintain.getCimCycleTime, {});
  const normalized = normalizeCctRows(rows);

  // Client-side filter
  return normalized.filter((r) => {
    if (mfgType && r.mfgType !== mfgType) return false;
    if (partNumber && !r.partNumber.toLowerCase().includes(partNumber.toLowerCase())) return false;
    if (stage && !r.stage.toLowerCase().includes(stage.toLowerCase())) return false;
    return true;
  });
}

/**
 * Tạo bản ghi mới.
 * sCode `createCimCycleTime`.
 */
export async function createCimCycleTime(payload, creator) {
  const body = buildBody(payload, creator);
  return mesPost(MES_S_CODES.maintain.createCimCycleTime, body);
}

/**
 * Cập nhật bản ghi theo Id.
 * sCode `updateCimCycleTime`.
 */
export async function updateCimCycleTime(id, payload, modifier) {
  const body = { ...buildBody(payload, null), id, modifier };
  return mesPost(MES_S_CODES.maintain.updateCimCycleTime, body);
}

function buildBody(payload, creator) {
  return {
    modelName: toText(payload.modelName),
    partNumber: toText(payload.partNumber),
    mfgType: toText(payload.mfgType),
    stage: toText(payload.stage),
    stageDes: toText(payload.stageDes) || '',
    peopleCount:
      payload.peopleCount !== '' && payload.peopleCount != null ? toNum(payload.peopleCount) : null,
    stationCount:
      payload.stationCount !== '' && payload.stationCount != null
        ? toNum(payload.stationCount)
        : null,
    cycleTime:
      payload.cycleTime !== '' && payload.cycleTime != null ? toNum(payload.cycleTime) : null,
    targetUph:
      payload.targetUph !== '' && payload.targetUph != null ? toNum(payload.targetUph) : null,
    effectiveFrom: toText(payload.effectiveFrom),
    effectiveTo: toText(payload.effectiveTo) || '',
    creator: creator || '',
  };
}

export function normalizeCctRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    id: toNum(r.id),
    modelName: toText(r.modelName),
    partNumber: toText(r.partNumber),
    mfgType: toText(r.mfgType),
    stage: toText(r.stage),
    stageDes: toText(r.stageDes),
    peopleCount: r.peopleCount ?? null,
    stationCount: r.stationCount ?? null,
    cycleTime: r.cycleTime ?? null,
    targetUph: r.targetUph ?? r.TargetUph ?? null,
    effectiveFrom: toText(r.effectiveFrom),
    effectiveTo: toText(r.effectiveTo),
    createdBy: toText(r.createdBy),
    updatedBy: toText(r.updatedBy),
    createdAt: toText(r.createdAt),
    updatedAt: toText(r.updatedAt),
  }));
}
