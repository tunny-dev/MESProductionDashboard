import { http } from '@/lib/http';
import { ENDPOINTS, DEFAULT_FACTORY } from '@/config/api';
import { toIsoDateOr, toList, toPositiveInt } from '@/lib/api-params';

/** Khoảng ngày rộng nhất khi người dùng không chọn (không lọc theo ngày). */
const MIN_DATE = '2000-01-01';
const MAX_DATE = '2999-12-31';

/** Kết quả rỗng đúng khuôn `PagedResult` của API. */
export const EMPTY_PAGE = { items: [], total: 0, page: 1, pageSize: 0, totalPages: 0 };

/**
 * Gộp nhiều nguồn danh sách (mảng | CSV) thành một mảng chuỗi duy nhất.
 * @param {...unknown} values
 * @returns {string[]|undefined}
 */
function mergeList(...values) {
  const out = [];
  for (const value of values) {
    const list = toList(value);
    if (!list) continue;
    for (const item of list) {
      if (!out.includes(item)) out.push(item);
    }
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Dựng body lọc chung cho họ endpoint /api/wip (bind từ JSON).
 *
 * Ánh xạ tên gọi: UPN = PartNumber (MF002), Model = modelName (MB002),
 * MoType = mfgType. Ô Model và UPN cùng là part code (MF002) nên dồn chung
 * vào `models`.
 *
 * @param {object} params
 * @returns {Record<string, unknown>}
 */
function baseFilter(params = {}) {
  const filter = {
    mfgType:
      String(params.mfgType ?? 'SMT')
        .trim()
        .toUpperCase() || 'SMT',
    from: toIsoDateOr(params.moCreateDateFrom ?? params.from, MIN_DATE),
    to: toIsoDateOr(params.moCreateDateTo ?? params.to, MAX_DATE),
  };

  const lines = mergeList(params.lines, params.line);
  const mos = mergeList(params.mos, params.mo);
  const models = mergeList(params.models, params.model, params.upn);
  const maxDays = toPositiveInt(params.moDays ?? params.maxDays);

  if (lines) filter.lines = lines;
  if (mos) filter.mos = mos;
  if (models) filter.models = models;
  if (maxDays !== undefined) filter.maxDays = maxDays;

  return filter;
}

/**
 * Tổng hợp WIP theo (MO, chuyền) — 1 dòng / 1 MO-line, có PHÂN TRANG phía server.
 * Trả nguyên `PagedResult`: `{ items, total, page, pageSize, totalPages, ... }`.
 *
 * @param {object} params Bộ lọc + `page` / `pageSize` / `sortBy` / `sortDir`.
 * @returns {Promise<{ items: Array, total: number, page: number, pageSize: number, totalPages: number }>}
 */
export async function getWipReport(params) {
  const body = baseFilter(params);

  const page = toPositiveInt(params?.page);
  const pageSize = toPositiveInt(params?.pageSize);
  if (page !== undefined) body.page = page;
  if (pageSize !== undefined) body.pageSize = pageSize;
  if (params?.sortBy) body.sortBy = params.sortBy;
  if (params?.sortDir) body.sortDir = params.sortDir;

  const data = await http.post(ENDPOINTS.wip.summary, body);
  return data ?? EMPTY_PAGE;
}

/**
 * WIP theo (MO, chuyền, trạm) — để FE pivot thành cột động.
 * Gọi song song với getWipReport, cùng bộ lọc (không phân trang).
 */
export async function getWipByStation(params) {
  const data = await http.post(ENDPOINTS.wip.station, baseFilter(params));
  return Array.isArray(data) ? data : [];
}

/**
 * Danh sách serial number đang kẹt (WIP) của MỘT cặp (MO, chuyền).
 * Gọi khi bấm vào con số cột WIP ở Summary — cùng bộ lọc summary nhưng
 * FE khoá `mos` + `lines` = đúng MO/chuyền của dòng đã bấm.
 */
export async function getWipUnitSnList({ mfgType, mo, line, ...rest } = {}) {
  const data = await http.post(ENDPOINTS.wip.unitSn, baseFilter({ ...rest, mfgType, mo, line }));
  return Array.isArray(data) ? data : [];
}

/**
 * Danh sách đơn vị theo kế hoạch CHƯA NHẬP vào chuyền — cột NotInput ở Summary.
 * Cùng bộ lọc summary, FE khoá `mos` + `lines` = MO/chuyền đã bấm.
 *
 * API sinh serial lúc quét nhập ở trạm đầu, nên các dòng này thường
 * `sn` = null và `station` = null: FE hiện "Chưa có SN" / "N/A" thay vì "—".
 */
export async function getWipNotInputSnList({ mfgType, mo, line, ...rest } = {}) {
  const data = await http.post(
    ENDPOINTS.wip.notInputSn,
    baseFilter({ ...rest, mfgType, mo, line })
  );
  return Array.isArray(data) ? data : [];
}

/**
 * SN đã đạt tại một trạm cụ thể — bấm vào cột trạm ở Summary.
 * Cùng bộ lọc summary, thêm `station` = mã trạm đã bấm.
 */
export async function getWipStationSnList({ mfgType, mo, line, station, ...rest } = {}) {
  const data = await http.post(ENDPOINTS.wip.stationSn, {
    ...baseFilter({ ...rest, mfgType, mo, line }),
    station,
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Tra `deptCode` (VD: VN001) từ `mfgType` (SMT/DIP/FA) qua GET /cim/getMfgType.
 *
 * Không hardcode: mã dept phụ thuộc nhà máy (VN → VN001/VN002/VN003,
 * HY → H001/H002/H003...). Khớp theo `mfgTypeName`, ưu tiên trùng khít rồi
 * tới tiền tố (HY có "DIP 14"/"FA 15" nên không khít tuyệt đối được).
 */
async function resolveDeptCode(mfgType) {
  const key = String(mfgType ?? '')
    .trim()
    .toUpperCase();
  if (!key) return null;

  const data = await http.get(ENDPOINTS.cim.mfgType, {
    params: DEFAULT_FACTORY ? { factory: DEFAULT_FACTORY } : {},
  });
  const rows = Array.isArray(data) ? data : [];
  const nameOf = (r) =>
    String(r?.mfgTypeName ?? '')
      .trim()
      .toUpperCase();

  const row = rows.find((r) => nameOf(r) === key) ?? rows.find((r) => nameOf(r).startsWith(key));

  return row?.mfgCode ?? null;
}

/**
 * Lấy danh sách Line theo MfgType (tra deptCode thật từ getMfgType).
 */
export async function getLineOptions({ mfgType } = {}) {
  const deptCode = await resolveDeptCode(mfgType);
  if (!deptCode) return [];

  const data = await http.get(ENDPOINTS.cim.productionLine, { params: { deptCode } });
  return Array.isArray(data) ? data : [];
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
export async function getModelOptions({ mfgType, line } = {}) {
  const { from, to } = dropdownRange();
  const data = await http.post(ENDPOINTS.wip.models, {
    mfgType:
      String(mfgType ?? 'SMT')
        .trim()
        .toUpperCase() || 'SMT',
    from: toIsoDateOr(from, MIN_DATE),
    to: toIsoDateOr(to, MAX_DATE),
    ...(mergeList(line) ? { lines: mergeList(line) } : {}),
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Lấy danh sách MO theo MfgType + Line (+ Models nếu có).
 */
export async function getMoOptions({ mfgType, line, models } = {}) {
  const { from, to } = dropdownRange();
  const lines = mergeList(line);
  const modelList = mergeList(models);
  const data = await http.post(ENDPOINTS.wip.mos, {
    mfgType:
      String(mfgType ?? 'SMT')
        .trim()
        .toUpperCase() || 'SMT',
    from: toIsoDateOr(from, MIN_DATE),
    to: toIsoDateOr(to, MAX_DATE),
    ...(lines ? { lines } : {}),
    ...(modelList ? { models: modelList } : {}),
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Chuẩn hoá rows GET_WIP_SUMMARY thành dòng bảng.
 * Cột text thiếu nguồn (upn/customer/...) để '' để UI hiện '—'
 * thay vì 0 (BodyRow hiện `val ?? 0`).
 */
export function normalizeWipSummaryRows(rows, mfgType = '') {
  if (!Array.isArray(rows)) return [];
  const num = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (v) => (v === null || v === undefined ? '' : String(v));
  return rows.map((r, i) => {
    const input = num(r.input ?? r.INPUT);
    const output = num(r.output ?? r.OUTPUT);
    const plan = num(r.planQty ?? r.PLAN_QTY);
    // WIP vat ly khong am. input la UNION toan chuyen nen input-output
    // dung; notInput chan duoi 0 vi 2 mat dem 2 SN/set co the vuot plan.
    const partNumber = str(r.partNumber ?? r.PART_NUMBER);
    return {
      seq: i + 1,
      mo: str(r.mo ?? r.MO),
      model: str(r.model ?? r.MODEL),
      partNumber,
      // UPN chính là PartNumber — cột UPN hiện part code.
      upn: partNumber,
      line: str(r.line ?? r.LINE),
      lineName: str(r.lineName ?? r.LINE_NAME),
      // MoType chính là mfgType của lần query (SMT/DIP/FA).
      moType: str(mfgType),
      customerUpn: partNumber,
      moDays: num(r.moDays ?? r.MO_DAYS),
      sapLot: num(r.sapLot ?? r.SAP_LOT ?? plan),
      planQty: plan,
      input,
      output,
      wip: input - output,
      notInput: Math.max(0, plan - input),
      reworkQty: num(r.reworkQty ?? r.REWORK_QTY),
      brokenUn: num(r.brokenUn ?? r.BROKEN_UN),
      // Tram giu hang ket (SN co i='1' ma chua qua tram cuoi, lay mode).
      stuckSeq: str(r.stuckSeq ?? r.STUCK_SEQ),
      stuckStation: str(r.stuckStation ?? r.STUCK_STATION),
      stuckQty: num(r.stuckQty ?? r.STUCK_QTY),
      // text không nguồn trong SFCS
      wiatronSo: '',
      customerSo: '',
      salesOrder: '',
      customer: '',
      customerNumber: '',
      status: str(r.status ?? r.STATUS),
    };
  });
}

/**
 * Chuẩn hoá rows GET_WIP_UNIT_SN thành dòng bảng "Unit S/N List".
 * API đã trả sẵn model + partNumber + lineName + stationName nên FE chỉ
 * ép kiểu, không suy diễn thêm (thiếu thì '' để UI hiện '—').
 */
export function normalizeWipUnitSnRows(rows) {
  if (!Array.isArray(rows)) return [];
  const str = (v) => (v === null || v === undefined ? '' : String(v));
  return rows.map((r, i) => ({
    seq: i + 1,
    sn: str(r.sn ?? r.SN),
    mo: str(r.mo ?? r.MO),
    model: str(r.model ?? r.MODEL),
    partNumber: str(r.partNumber ?? r.PART_NUMBER),
    line: str(r.line ?? r.LINE),
    lineName: str(r.lineName ?? r.LINE_NAME),
    station: str(r.station ?? r.STATION),
    stationName: str(r.stationName ?? r.STATION_NAME),
  }));
}

/**
 * Gộp rows GET_WIP_STATION vào các dòng summary theo danh sách trạm FIX CỨNG
 * của công đoạn (`stationList`, từ file wip-station-config.js).
 *
 * Ô trạm = OUTPUT tại trạm (SN đạt), cùng ngữ nghĩa cột FINISH của màn hình
 * cũ — trạm cuối = output cả tuyến. Hàng kẹt (WIP nằm giữa các trạm) không
 * nằm ở đây mà ở cột "Kẹt tại" (stuckStation/stuckQty của summary).
 * MO nào không đi qua trạm nào thì ô đó null → hiện '—'.
 *
 * Không có stationList (công đoạn lạ) thì lùi về pivot động: hợp trạm từ dữ
 * liệu, xếp theo seq, trần 10 cột.
 *
 * @returns {{ rows, stationCols, extraCount }}
 */
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
    const n = Number(r.outputQty ?? r.OUTPUT_QTY);
    cellByMoLine.set(`${r.mo ?? r.MO}|${r.line ?? r.LINE}|${key}`, Number.isFinite(n) ? n : 0);
  }
  const rows = (summaryRows ?? []).map((row) => {
    const out = { ...row };
    for (const c of stationCols) {
      // MO không đi qua trạm này cũng hiện 0 (không phân biệt với đi qua
      // mà bằng 0) — theo yêu cầu hiển thị, đỡ lẫn với ô lỗi dữ liệu.
      out[c.key] = cellByMoLine.get(`${row.mo}|${row.line}|${c.key}`) ?? 0;
    }
    return out;
  });
  return { rows, stationCols, extraCount };
}
