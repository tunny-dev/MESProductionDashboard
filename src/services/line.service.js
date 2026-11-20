import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';
import { toIsoDate, toIsoDateOr } from '@/lib/api-params';
import { toNum, toText } from '@/core/utils/coerce';

/** Lấy danh sách chuyền theo mã bộ phận (deptCode). */
export async function getProductionLine(deptCode) {
  if (!deptCode) return [];
  const rows = await http.get(ENDPOINTS.cim.line, {
    params: { deptCode },
  });

  if (!Array.isArray(rows)) return [];
  return rows.map((l) => ({
    id: l.lineId ?? l.id ?? null,
    name: l.lineName ?? l.name ?? null,
    group: l.deptCode ?? deptCode,
  }));
}

/** Lấy danh sách model có lệnh sản xuất trên chuyền trong ngày. */
export async function getModelByLine(lineId) {
  if (!lineId) return [];

  const today = toIsoDate(new Date());
  const rows = await http.get(ENDPOINTS.mo.modelByLine, {
    params: {
      line: lineId,
      from: today,
      to: today,
    },
  });

  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      code: toText(r.code ?? r.partNumber),
      name: toText(r.name ?? r.modelName ?? r.code),
    }))
    .filter((r) => r.code);
}

/** Lấy danh sách MO đang chạy trên chuyền theo ngày. */
export async function getMoByLine(lineId, dateStr) {
  if (!lineId || !dateStr) return [];

  const date = toIsoDateOr(dateStr, null);
  if (!date) return [];

  const rows = await http.get(ENDPOINTS.mo.byLine, {
    params: { line: lineId, date },
  });

  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r.mo).map(toMoRow);
}

/** Lấy thông tin chi tiết một lệnh sản xuất MO. */
export async function getMoInfo(mo) {
  if (!mo) return null;

  const r = await http.get(ENDPOINTS.mo.info, {
    params: { mo },
  });

  return r ? toMoRow(r, mo) : null;
}

function toMoRow(r, fallbackMo = null) {
  return {
    mo: r.mo ?? fallbackMo,
    partNumber: r.partNumber ?? null,
    modelName: r.modelName ?? null,
    planQty: toNum(r.planQty),
    status: toText(r.status, null),
    todayQty: toNum(r.todayQty) ?? 0,
    lastScanTime: r.lastScanTime ? String(r.lastScanTime).trim() : null,
    isActiveToday: Boolean(r.isActiveToday || toNum(r.todayQty) > 0),
  };
}

/** Lấy thông tin công đoạn (MfgType) theo chuyền. */
export async function getMfgByLine(lineId) {
  if (!lineId) return null;

  const r = await http.get(ENDPOINTS.cim.mfgByLine, {
    params: { line: lineId },
  });

  if (!r) return null;

  return {
    stage: r.stage ?? lineId,
    stageDes: r.stageDes ?? '',
    factory: r.factory ?? '',
    mfgCode: r.mfgCode ?? '',
    mfgType: r.mfgType ?? '',
  };
}
