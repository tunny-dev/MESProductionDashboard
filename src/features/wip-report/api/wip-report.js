import { MES_S_CODES, DEFAULT_FACTORY } from '@/config/api';
import { mesRows } from '@/lib/mes-http';
import { toCompactDate, toCompactDateOr } from '@/lib/date';
import { toNum, toText } from '@/lib/coerce';

const MIN_DATE = '20000101';
const MAX_DATE = '29991231';

/** Kết quả rỗng — `items` giữ nguyên tên để tab Summary không phải đổi. */
export const EMPTY_PAGE = { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0 };

/**
 * Gộp nhiều nguồn (mảng | CSV) thành 1 chuỗi CSV cho tham số SP.
 * Rỗng → 'ALL' (SP hiểu là không lọc).
 */
function toCsv(...values) {
  const out = [];
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const list = Array.isArray(value) ? value : String(value).split(',');
    for (const item of list) {
      const s = String(item ?? '').trim();
      if (s && !out.includes(s)) out.push(s);
    }
  }
  return out.length > 0 ? out.join(',') : 'ALL';
}

/** `maxDays` dạng chuỗi — dùng cho `sp_Get_MO_Line_Status` (`VARCHAR(10)='ALL'`). */
function toMaxDaysString(value) {
  if (value === null || value === undefined || value === '') return 'ALL';
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(Math.trunc(n)) : 'ALL';
}

/** `maxDays` dạng số — dùng cho các SP khai báo `@maxDays INT = 0` (0 = không lọc). */
function toMaxDaysInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
}

/**
 * `mfgType` gửi xuống SP
 */
function toMfgType(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

/**
 * @param {object} params
 * @param {{ maxDaysAsString?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
function baseFilter(params = {}, { maxDaysAsString = false } = {}) {
  const rawMaxDays = params.moDays ?? params.maxDays;
  return {
    mfgType: toMfgType(params.mfgType),
    from: toCompactDateOr(params.moCreateDateFrom ?? params.from, MIN_DATE),
    to: toCompactDateOr(params.moCreateDateTo ?? params.to, MAX_DATE),
    lines: toCsv(params.lines, params.line),
    mos: toCsv(params.mos, params.mo),
    models: toCsv(params.models, params.model, params.upn),
    maxDays: maxDaysAsString ? toMaxDaysString(rawMaxDays) : toMaxDaysInt(rawMaxDays),
  };
}

/**
 * @param {object} params Bộ lọc.
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function getWipSummary(params) {
  const rows = await mesRows(
    MES_S_CODES.wipReport.getWipSummary,
    baseFilter(params, { maxDaysAsString: true })
  );
  return { ...EMPTY_PAGE, items: rows, total: rows.length, pageSize: rows.length };
}

/**
 * WIP theo (MO, chuyền, trạm) — để FE pivot thành cột động.
 * Gọi song song với getWipSummary, cùng bộ lọc (không phân trang).
 */
export async function getWipStation(params) {
  return mesRows(MES_S_CODES.wipReport.getWipStation, baseFilter(params));
}

/**
 * Danh sách serial number đang kẹt (WIP) của MỘT cặp (MO, chuyền).
 */
export async function getWipUnitSn({ mfgType, mo, line, ...rest } = {}) {
  return mesRows(MES_S_CODES.wipReport.getWipUnitSn, baseFilter({ ...rest, mfgType, mo, line }));
}

export async function getWipNotInputSn({ mfgType, mo, line, ...rest } = {}) {
  return mesRows(
    MES_S_CODES.wipReport.getWipNotInputSn,
    baseFilter({ ...rest, mfgType, mo, line })
  );
}

export async function getWipStationSn({ mfgType, mo, line, station, ...rest } = {}) {
  return mesRows(MES_S_CODES.wipReport.getWipStationSn, {
    ...baseFilter({ ...rest, mfgType, mo, line }),
    station,
  });
}

/**
 * Danh sách công đoạn/bộ phận cho radio "MFG Type" — sCode `getMfgType`.
 * @param {{ factory?: string }} [options]
 * @returns {Promise<Array<{ code: string, name: string, factory: string }>>}
 */
export async function getMfgType({ factory = DEFAULT_FACTORY } = {}) {
  const rows = await mesRows(MES_S_CODES.production.getMfgType, factory ? { factory } : {});
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const code = toText(row?.mfgCode ?? row?.MFG_CODE);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      name: toText(row?.mfgTypeName ?? row?.mfgType ?? row?.MFG_TYPE_NAME) || code,
      factory: toText(row?.factory ?? row?.FACTORY),
    });
  }
  return out;
}

/**
 * Danh sách chuyền của một bộ phận.
 * @param {{ deptCode?: string }} [options] `deptCode` = `SSFDC.DC001` (VD: VN001)
 */
export async function getProductionLine({ deptCode } = {}) {
  if (!deptCode) return [];
  return mesRows(MES_S_CODES.production.getProductionLine, { deptCode });
}

/** Khoảng ngày mặc định cho dropdown Model/MO: 90 ngày gần nhất. */
function dropdownRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 90);
  return { from, to };
}

/**
 * Lấy danh sách Model theo MfgType + Line (có log trong 90 ngày gần nhất).
 */
export async function getWipModels({ mfgType, line } = {}) {
  const { from, to } = dropdownRange();
  return mesRows(MES_S_CODES.wipReport.getWipModels, {
    mfgType: toMfgType(mfgType),
    from: toCompactDateOr(toCompactDate(from), MIN_DATE),
    to: toCompactDateOr(toCompactDate(to), MAX_DATE),
    lines: toCsv(line),
  });
}

/**
 * Lấy danh sách MO theo MfgType + Line (+ Models nếu có).
 */
export async function getWipMos({ mfgType, line, models } = {}) {
  const { from, to } = dropdownRange();
  return mesRows(MES_S_CODES.wipReport.getWipMos, {
    mfgType: toMfgType(mfgType),
    from: toCompactDateOr(toCompactDate(from), MIN_DATE),
    to: toCompactDateOr(toCompactDate(to), MAX_DATE),
    lines: toCsv(line),
    models: toCsv(models),
  });
}

/**
 * Chuẩn hoá rows GET_WIP_SUMMARY thành dòng bảng.
 * Cột text thiếu nguồn (upn/customer/...) để '' để UI hiện '—'
 * thay vì 0 (BodyRow hiện `val ?? 0`).
 */
export function normalizeWipSummaryRows(rows, mfgType = '') {
  if (!Array.isArray(rows)) return [];
  const num = (v) => toNum(v, 0);
  return rows.map((r, i) => {
    const input = num(r.input ?? r.INPUT);
    const output = num(r.output ?? r.OUTPUT);
    const plan = num(r.planQty ?? r.PLAN_QTY);
    const wipUnitsRaw = r.wipUnits ?? r.WIP_UNITS ?? r.wip_units;
    const wipUnits = wipUnitsRaw != null ? Math.max(0, num(wipUnitsRaw)) : input - output;

    const partNumber = toText(r.partNumber ?? r.PART_NUMBER);
    return {
      seq: i + 1,
      mo: toText(r.mo ?? r.MO),
      model: toText(r.model ?? r.MODEL),
      partNumber,
      upn: partNumber,
      line: toText(r.line ?? r.LINE),
      lineName: toText(r.lineName ?? r.LINE_NAME),
      moType: toText(mfgType),
      customerUpn: partNumber,
      moDays: num(r.moDays ?? r.MO_DAYS),
      sapLot: num(r.sapLot ?? r.SAP_LOT ?? plan),
      planQty: plan,
      input,
      output,
      wip: wipUnits,
      wipStationTotal: input - output,
      notInput: Math.max(0, plan - input),
      reworkQty: num(r.reworkQty ?? r.REWORK_QTY),
      brokenUn: num(r.brokenUn ?? r.BROKEN_UN),
      stuckSeq: toText(r.stuckSeq ?? r.STUCK_SEQ),
      stuckStation: toText(r.stuckStation ?? r.STUCK_STATION),
      stuckQty: num(r.stuckQty ?? r.STUCK_QTY),
      wiatronSo: '',
      customerSo: '',
      salesOrder: '',
      customer: '',
      customerNumber: '',
      status: toText(r.status ?? r.STATUS),
    };
  });
}

export function normalizeWipUnitSnRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r, i) => ({
    seq: i + 1,
    sn: toText(r.sn ?? r.SN),
    mo: toText(r.mo ?? r.MO),
    model: toText(r.model ?? r.MODEL),
    partNumber: toText(r.partNumber ?? r.PART_NUMBER),
    line: toText(r.line ?? r.LINE),
    lineName: toText(r.lineName ?? r.LINE_NAME),
    station: toText(r.station ?? r.STATION),
    stationName: toText(r.stationName ?? r.STATION_NAME),
  }));
}

export function mergeWipStationColumns(summaryRows, stationRows, stationList = null) {
  const MAX_DYNAMIC_COLS = 10;
  let stationCols;
  let extraCount = 0;
  if (Array.isArray(stationList) && stationList.length > 0) {
    stationCols = stationList.map((s) => ({
      key: `st:${s.code}`,
      label: String(s.code),
      title: s.name ?? String(s.code),
      w: 90,
      align: 'right',
      numeric: true,
      drill: true,
    }));
  } else {
    const seen = new Map();
    for (const r of stationRows ?? []) {
      const station = r.station ?? r.STATION;
      if (!station || seen.has(station)) continue;
      seen.set(station, {
        key: `st:${station}`,
        label: String(station),
        title: r.stationName ?? r.STATION_NAME ?? String(station),
        seq: r.seq ?? r.SEQ ?? '',
      });
    }
    const all = [...seen.values()].sort((a, b) =>
      String(a.seq).localeCompare(String(b.seq), undefined, { numeric: true })
    );
    stationCols = all.slice(0, MAX_DYNAMIC_COLS).map((c) => ({
      ...c,
      w: 90,
      align: 'right',
      numeric: true,
      drill: true,
    }));
    extraCount = all.length - stationCols.length;
  }
  const keys = new Set(stationCols.map((c) => c.key));

  const cellByMoLine = new Map();
  for (const r of stationRows ?? []) {
    const station = r.station ?? r.STATION;
    const key = `st:${station}`;
    if (!keys.has(key)) continue;
    const n = toNum(r.outputQty ?? r.OUTPUT_QTY, 0);
    cellByMoLine.set(`${r.mo ?? r.MO}|${r.line ?? r.LINE}|${key}`, n);
  }
  const rows = (summaryRows ?? []).map((row) => {
    const out = { ...row };
    for (const c of stationCols) {
      out[c.key] = cellByMoLine.get(`${row.mo}|${row.line}|${c.key}`) ?? 0;
    }
    return out;
  });
  return { rows, stationCols, extraCount };
}
