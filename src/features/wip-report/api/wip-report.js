import { MES_S_CODES } from '@/config/api';
import { mesPost } from '@/lib/mes-http';
import { unwrapList } from '@/lib/unwrap-response';

const WIP_SYSTEM = 'sfcs';

/** SMT/DIP/FA → mã dept master chuyền (CMSMD.MD004). */
const DEPT_BY_MFG = { SMT: 'VN001', DIP: 'VN002', FA: 'VN003' };

/** BE bind param nghiêm ngặt (thiếu là 500), gọi bằng POST để params đi
 * qua payload (BE không đọc param trên URL query string — đã gặp lỗi khi
 * dùng GET). Mọi param khai báo trong SQL phải luôn được gửi — dùng 'ALL'
 * thay '' vì mesGet strip rỗng (giữ thói quen này dù đang dùng POST). */
function asList(value) {
  const s = Array.isArray(value) ? value.join(',') : (value ?? '');
  return String(s).trim() === '' ? 'ALL' : String(s).trim();
}

function asDate(value, fallback) {
  if (!value) return fallback;
  const s = String(value).replace(/\//g, '');
  return /^\d{8}$/.test(s) ? s : fallback;
}

/**
 * Tổng hợp WIP theo (MO, chuyền) — 1 dòng / 1 MO-line.
 * sCode RIÊNG của trang này (GET_WIP_SUMMARY), không dùng chung
 * GET_WIP_REPORT của dashboard (khác grain, khác param).
 *
 * Ánh xạ tên gọi (do anh chốt): UPN = PartNumber (MF002), Model = modelName
 * (MB002), MoType = mfgType. Ô Model lọc theo part code; ô UPN cũng là part
 * code nên dồn chung vào P_MODEL.
 */
function asModels(...lists) {
  const merged = [];
  for (const list of lists) {
    const arr = Array.isArray(list) ? list : list ? [list] : [];
    for (const v of arr) {
      const s = String(v ?? '').trim();
      if (s && !merged.includes(s)) merged.push(s);
    }
  }
  return merged.length ? merged.join(',') : 'ALL';
}

function summaryBody(params, paging) {
  const body = {
    P_MFG_TYPE: params.mfgType ?? 'SMT',
    P_LINES: asList(params.line),
    P_MOS: asList(params.mo),
    // Model và UPN cùng là part code (MF002) — dồn chung 1 param CSV.
    P_MODELS: asModels(params.model, params.upn),
    P_FROM: asDate(params.moCreateDateFrom, '19000101'),
    P_TO: asDate(params.moCreateDateTo, '29991231'),
    P_MAX_DAYS: params.moDays?.toString().trim() ? params.moDays.toString().trim() : 'ALL',
  };
  // Phân trang server-side CHỈ áp cho getWipSummary (các sCode khác giữ
  // nguyên bộ param). BE (proc) khai báo P_PAGE/P_PAGE_SIZE nên phải gửi.
  if (paging) {
    body.P_PAGE = Math.max(1, Number(paging.page) || 1);
    body.P_PAGE_SIZE = Math.max(1, Number(paging.pageSize) || 20);
  }
  return body;
}

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Đọc field theo cả camelCase (proc mới) lẫn UPPER (bản legacy). */
function pick(row, ...keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/**
 * BE lặp `totalRecords` / `page` / `pageSize` trên MỌI dòng (xem proc
 * GET_WIP_SUMMARY) — đọc ở dòng đầu là đủ. Kèm grand total (SUM() OVER()
 * của toàn bộ kết quả, không chỉ trang) để footer "Total" vẫn đúng khi
 * bảng đã phân trang.
 *
 * @param {object[]} rows
 * @param {{ page?: number, pageSize?: number }} requested
 */
export function readWipSummaryPaging(rows, requested = {}) {
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return {
    totalRecords: first ? toNum(pick(first, 'totalRecords', 'TOTALRECORDS')) : 0,
    page: first ? toNum(pick(first, 'page', 'PAGE')) : Math.max(1, Number(requested.page) || 1),
    pageSize: first
      ? toNum(pick(first, 'pageSize', 'PAGESIZE'))
      : Math.max(1, Number(requested.pageSize) || 20),
    // null nếu BE chưa trả grand total (FE sẽ fallback cộng trang hiện tại).
    totals: first
      ? {
          moDays: toNum(pick(first, 'totalMoDays', 'TOTALMODAYS')),
          sapLot: toNum(pick(first, 'totalPlanQty', 'TOTALPLANQTY')),
          input: toNum(pick(first, 'totalInput', 'TOTALINPUT')),
          output: toNum(pick(first, 'totalOutput', 'TOTALOUTPUT')),
          wip: toNum(pick(first, 'totalWip', 'TOTALWIP')),
          notInput: toNum(pick(first, 'totalNotInput', 'TOTALNOTINPUT')),
        }
      : null,
  };
}

/**
 * Trang Summary — phân trang SERVER-SIDE (sCode GET_WIP_SUMMARY).
 * `paging = { page, pageSize }`; BE trả đúng `pageSize` dòng của trang đó,
 * mỗi dòng kèm totalRecords/page/pageSize.
 *
 * @returns {{ rows: object[], totalRecords: number, page: number, pageSize: number, totals: object|null }}
 */
export async function getWipReport(params, paging) {
  const res = await mesPost(MES_S_CODES.wipReport.getWipSummary, summaryBody(params, paging), WIP_SYSTEM);
  const rows = unwrapList(res);
  return { rows, ...readWipSummaryPaging(rows, paging) };
}

/**
 * WIP theo (MO, chuyền, trạm) — để FE pivot thành cột động.
 * Gọi song song với getWipReport, cùng bộ param.
 */
export async function getWipByStation(params) {
  const res = await mesPost(MES_S_CODES.wipReport.getWipStation, summaryBody(params), WIP_SYSTEM);
  return unwrapList(res);
}

/**
 * Danh sách serial number đang kẹt (WIP) của MỘT cặp (MO, chuyền).
 * Gọi khi bấm vào con số cột WIP ở Summary — cùng bộ param summary nhưng
 * FE khoá P_MOS + P_LINES = đúng MO/chuyền của dòng đã bấm.
 */
export async function getWipUnitSnList({ mfgType, mo, line, ...rest } = {}) {
  const res = await mesPost(
    MES_S_CODES.wipReport.getWipUnitSn,
    summaryBody({ ...rest, mfgType, mo, line }),
    WIP_SYSTEM
  );
  return unwrapList(res);
}

/**
 * Danh sách đơn vị theo kế hoạch CHƯA NHẬP vào chuyền — cột NotInput ở Summary.
 * Cùng bộ param summary, FE khoá P_MOS + P_LINES = MO/chuyền đã bấm.
 *
 * SFCS sinh serial lúc quét nhập ở trạm đầu, nên các dòng này thường
 * `sn` = null và `station` = null: FE hiện "Chưa có SN" / "N/A" thay vì "—".
 */
export async function getWipNotInputSnList({ mfgType, mo, line, ...rest } = {}) {
  const res = await mesPost(
    MES_S_CODES.wipReport.getWipNotInputSn,
    summaryBody({ ...rest, mfgType, mo, line }),
    WIP_SYSTEM
  );
  return unwrapList(res);
}

/**
 * SN đã đạt tại một trạm cụ thể — bấm vào cột trạm ở Summary.
 * Cùng bộ param summary, thêm P_STATION = mã trạm đã bấm.
 */
export async function getWipStationSnList({ mfgType, mo, line, station, ...rest } = {}) {
  const res = await mesPost(
    MES_S_CODES.wipReport.getWipStationSn,
    { ...summaryBody({ ...rest, mfgType, mo, line }), P_STATION: station },
    WIP_SYSTEM
  );
  return unwrapList(res);
}

/**
 * Lấy danh sách Line theo MfgType.
 * sCode: GET_PRODUCTION_LINE (đã đổi alias lineId/lineName — cần chạy file 15).
 */
export async function getLineOptions({ mfgType } = {}) {
  const res = await mesPost(
    MES_S_CODES.production.getProductionLine,
    { MD004: DEPT_BY_MFG[mfgType] ?? mfgType },
    WIP_SYSTEM
  );
  return unwrapList(res);
}

/**
 * Lấy danh sách Model theo MfgType + Line (có log trong 90 ngày gần nhất).
 * sCode RIÊNG: GET_WIP_MODELS (không động vào GET_MODEL_BY_LINE legacy).
 */
export async function getModelOptions({ mfgType, line } = {}) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 90);
  const fmt = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const res = await mesPost(
    MES_S_CODES.wipReport.getWipModels,
    {
      P_MFG_TYPE: mfgType ?? 'SMT',
      P_LINES: asList(line),
      P_FROM: fmt(from),
      P_TO: fmt(to),
    },
    WIP_SYSTEM
  );
  return unwrapList(res);
}

/**
 * Lấy danh sách MO theo MfgType + Line (+ Models nếu có).
 * sCode RIÊNG: GET_WIP_MOS.
 */
export async function getMoOptions({ mfgType, line, models } = {}) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 90);
  const fmt = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const res = await mesPost(
    MES_S_CODES.wipReport.getWipMos,
    {
      P_MFG_TYPE: mfgType ?? 'SMT',
      P_LINES: asList(line),
      P_FROM: fmt(from),
      P_TO: fmt(to),
      P_MODELS: asModels(models),
    },
    WIP_SYSTEM
  );
  return unwrapList(res);
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
 * BE đã trả sẵn model + partNumber + lineName + stationName nên FE chỉ
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
