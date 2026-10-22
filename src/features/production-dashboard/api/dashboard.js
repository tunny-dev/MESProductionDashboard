import { parseTaTimestamp, sanitizeStationUph } from '@/features/production-dashboard/lib/calc';
import { toNum } from '@/lib/coerce';

/**
 * Chuẩn hoá rows GET_FLOW_BY_MO ({ seq, stage, stageDes, line, qty })
 * thành station configs cho FlowStrip, sắp xếp theo seq.
 * Chấp cả key hoa (Seq/Stage) cho tương thích BE đổi case.
 */
export function normalizeFlowRows(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const id = r.stage ?? r.Stage;
    if (typeof id !== 'string') continue;
    const stage = id.trim();
    if (stage === '' || seen.has(stage)) continue;
    seen.add(stage);

    const desc = r.stageDes ?? r.StageDes;
    const name = typeof desc === 'string' ? desc.trim() : '';

    out.push({
      id: stage,
      name,
      shortName: name,
      seq: r.seq ?? r.Seq ?? '',
      line: r.line ?? r.Line ?? null,
      qty: r.qty ?? r.Qty ?? null,
    });
  }
  return out.sort((a, b) =>
    String(a.seq).localeCompare(String(b.seq), undefined, { numeric: true })
  );
}

/** 6 khung mặc định khi chưa có bộ khung nào (lúc đang tải). */
const FALLBACK_SLOTS = Array.from({ length: 6 }, (_, i) => ({ slotIx: i }));

/** Đọc 1 khoá có thể ở camelCase (API) hoặc HOA (một số bản BE). */
function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return undefined;
}

/**
 * Gộp các dòng CÙNG TRẠM nhưng KHÁC CHUYỀN thành 1 dòng.
 * @param {object[]} rows rows thô của GET_WIP_REPORT
 * @returns {object[]}
 */
export function mergeWipRowsByStation(rows) {
  if (!Array.isArray(rows)) return [];

  const groups = new Map();
  for (const row of rows) {
    const station = pick(row, 'op', 'OP', 'station', 'Station');
    const key = station === undefined || station === null || station === '' ? null : station;
    const groupKey = key ?? `__row${groups.size}`;
    const bucket = groups.get(groupKey);
    if (bucket) bucket.push(row);
    else groups.set(groupKey, [row]);
  }

  if (![...groups.values()].some((group) => group.length > 1)) return rows;
  return [...groups.values()].map(mergeWipGroup);
}

function mergeWipGroup(group) {
  if (group.length === 1) return group[0];

  const num = (row, ...keys) => toNum(pick(row, ...keys));
  const sum = (...keys) => group.reduce((total, row) => total + (num(row, ...keys) ?? 0), 0);
  const maxOrNull = (...keys) => {
    let top = null;
    for (const row of group) {
      const value = num(row, ...keys);
      if (value === null) continue;
      if (top === null || value > top) top = value;
    }
    return top;
  };

  const sumOrNull = (...keys) => {
    let total = null;
    for (const row of group) {
      const value = num(row, ...keys);
      if (value === null) continue;
      total = (total ?? 0) + value;
    }
    return total;
  };
  const outputOf = (row) => num(row, 'outputQty', 'OUTPUT_QTY') ?? 0;

  const primary = group.reduce((best, row) => (outputOf(row) > outputOf(best) ? row : best));
  const firstAt =
    group
      .map((row) => pick(row, 'firstAt', 'FirstAt'))
      .filter(Boolean)
      .sort()[0] ?? null;
  const lastAt =
    group
      .map((row) => pick(row, 'lastAt', 'LastAt'))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const first = parseTaTimestamp(firstAt);
  const last = parseTaTimestamp(lastAt);
  const spanMin = first && last ? Math.max(0, (last.getTime() - first.getTime()) / 60000) : null;
  const outputQty = sum('outputQty', 'OUTPUT_QTY');
  const uphActual = spanMin !== null && spanMin > 0 ? (outputQty * 60) / spanMin : null;

  return {
    seq: pick(primary, 'seq', 'Seq'),
    op: pick(primary, 'op', 'OP'),
    opDes: pick(primary, 'opDes', 'OP_DES'),
    line: pick(primary, 'line', 'Line'),
    lines: [...new Set(group.map((row) => pick(row, 'line', 'Line')).filter(Boolean))],
    inputQty: sum('inputQty', 'INPUT_QTY'),
    outputQty,
    ngQty: sum('ngQty', 'NG_QTY'),
    firstPass: sum('firstPass', 'FIRST_PASS'),
    scanQty: sumOrNull('scanQty', 'SCAN_QTY'),
    ngEvents: sumOrNull('ngEvents', 'NG_EVENTS'),
    ngAll: maxOrNull('ngAll', 'NG_ALL'),
    planInput: maxOrNull('planInput', 'PLAN_INPUT'),
    planOutput: maxOrNull('planOutput', 'PLAN_OUT'),
    targetUph: maxOrNull('targetUph'),
    spanMin,
    uphActual,
    s1: sum('s1', 'S1'),
    s2: sum('s2', 'S2'),
    s3: sum('s3', 'S3'),
    s4: sum('s4', 'S4'),
    s5: sum('s5', 'S5'),
    s6: sum('s6', 'S6'),
    firstAt,
    lastAt,
  };
}

/**
 * Chuẩn hoá rows GET_WIP_REPORT
 * ([{ seq, op, opDes, line, inputQty, outputQty, ngQty, planInput, planOutput,
 *    targetUph, spanMin, uphActual, s1..s6, firstAt, lastAt }])
 * thành station cho bảng chi tiết.
 */
export function normalizeWipReportRows(rows, slots) {
  if (!Array.isArray(rows)) return [];
  const slotList = slots?.length ? slots : FALLBACK_SLOTS;
  const slotCount = slotList.length;
  // Query theo chuyền trả 1 dòng/trạm; chế độ routing trả nhiều dòng/trạm
  // (mỗi chuyền 1 dòng) → gộp trước khi chuẩn hoá. Xem mergeWipRowsByStation.
  return mergeWipRowsByStation(rows)
    .map((r) => {
      const op = r.op ?? r.OP ?? r.station ?? r.Station;
      const opDes = r.opDes ?? r.OP_DES ?? r.opDescription ?? r.StationDes ?? null;
      const planOut = toNum(r.planOutput ?? r.planOut ?? r.PLAN_OUT);
      const actualInput = toNum(r.inputQty ?? r.INPUT_QTY);
      const actualOutput = toNum(r.outputQty ?? r.OUTPUT_QTY);
      const spanMin = toNum(r.spanMin ?? r.SPAN_MIN);
      const ngQty = toNum(r.ngQty ?? r.NG_QTY);
      const ngAll = toNum(r.ngAll ?? r.NG_ALL);
      const ngEvents = toNum(r.ngEvents ?? r.NG_EVENTS);
      const scanQty = toNum(r.scanQty ?? r.SCAN_QTY);
      const ngRate =
        ngQty !== null && scanQty !== null && scanQty > 0 ? (ngQty / scanQty) * 100 : null;
      const targetUphRaw = toNum(r.targetUph ?? r.TARGET_UPH);

      const woDayCount = slotList.reduce(
        (max, slot) => (Number.isFinite(slot.endDay) ? Math.max(max, slot.endDay + 1) : max),
        0
      );
      const visibleSlotCount = slotList.filter((slot) => !slot.empty).length || slotCount;
      const planForSlot = (slot) => {
        if (planOut === null || planOut <= 0) return null;
        if (woDayCount > 0 && Number.isFinite(slot.startDay) && Number.isFinite(slot.endDay)) {
          return (planOut * (slot.endDay - slot.startDay + 1)) / woDayCount;
        }
        return planOut / visibleSlotCount;
      };
      const rawSlots = [r.s1, r.s2, r.s3, r.s4, r.s5, r.s6];
      const hourlyAchievement = slotList.map((slot) => {
        const count = toNum(rawSlots[slot.slotIx]);
        const planQty = planForSlot(slot);
        if (count === null || planQty === null || planQty <= 0) return null;
        return Math.min((count / planQty) * 100, 100);
      });

      return {
        stationId: op ?? '',
        opCode: op ?? '',
        opName: opDes ?? '',
        stationName: opDes ?? '',
        seq: r.seq ?? r.Seq ?? '',
        line: r.line ?? r.Line ?? null,
        lines: Array.isArray(r.lines) && r.lines.length > 1 ? r.lines : null,
        planInput: toNum(r.planInput ?? r.PLAN_INPUT),
        actualInput,
        planOutput: planOut,
        actualOutput,
        ngQty,
        ngEvents,
        ngAll,
        ngRate,
        firstPass: toNum(r.firstPass ?? r.FIRST_PASS),
        targetUph: targetUphRaw !== null && targetUphRaw > 0 ? targetUphRaw : null,
        actualUph: sanitizeStationUph(toNum(r.uphActual ?? r.UPH_ACTUAL), spanMin),
        spanMin,
        firstAt: (r.firstAt ?? r.FirstAt ?? null) || null,
        lastAt: (r.lastAt ?? r.LastAt ?? null) || null,
        stuckQty: toNum(r.stuckQty ?? r.STUCK_QTY ?? r.stuckByStation),
        hourlyAchievement,
      };
    })
    .filter((s) => s.stationId !== '');
}

/**
 * Chuẩn hoá rows GET_SUMMARY
 * ([{ totalInput, totalOutput, planQty, firstAt, lastAt, spanMin, uphActual }])
 * thành 1 dòng số liệu cho các thẻ KPI đầu vào / đầu ra / UPH.
 */
export function normalizeMoSummaryRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const r = rows[0];
  return {
    totalInput: toNum(r.totalInput ?? r.TotalInput ?? r.TOTAL_INPUT) ?? 0,
    totalOutput: toNum(r.totalOutput ?? r.TotalOutput ?? r.TOTAL_OUTPUT) ?? 0,
    planQty: toNum(r.planQty ?? r.PlanQty ?? r.PLAN_QTY) ?? 0,
    // firstAt/lastAt = YYYYMMDDHHmmss — mốc đầu/cuối trong ca để hiển thị.
    firstAt: (r.firstAt ?? r.FirstAt ?? null) || null,
    lastAt: (r.lastAt ?? r.LastAt ?? null) || null,
    spanMin: toNum(r.spanMin ?? r.SpanMin ?? null),
    uphActual: toNum(r.uphActual ?? r.UphActual ?? null),
    woStartDate: (r.woStartDate ?? r.WO_START_DATE ?? null) || null,
    woEndDate: (r.woEndDate ?? r.WO_END_DATE ?? null) || null,
    woDayCount: toNum(r.woDayCount ?? r.WO_DAY_COUNT ?? null),
  };
}

/** Đọc `slotIx` (0..5) — SQL chỉ trả chỉ số, nhãn do FE dựng theo phạm vi. */
function readSlotIndex(row) {
  const raw = row.slotIx ?? row.SLOT_IX ?? row.slotIndex ?? row.SLOT_INDEX;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < 64 ? n : null;
}

/**
 * Bảng tra `slotIx` → khung hiển thị.
 * Vị trí trong mảng KHÔNG phải `slotIx`: phạm vi 'Cả WO' bỏ các nhóm rỗng, nên
 * WO 2 ngày có `slotIx` 0 và 3 nhưng đứng liền nhau ở vị trí 0 và 1. Tra theo
 * `slotIx` mới ánh xạ đúng dòng SQL sang đúng cột.
 */
function toSlotLookup(slots) {
  const map = new Map();
  for (const slot of slots ?? []) {
    if (slot?.slotIx !== undefined) map.set(slot.slotIx, slot);
  }
  return map;
}

/**
 * Chuẩn hoá rows DASH_CHART_OUTPUT
 * ([{ slotIx, stationId, planOutput, actualOutput, achievement }])
 * thành shape mà `OutputChart` đọc: `[{ slotId, finalStationOutput }]`.
 */
export function normalizeChartOutputRows(rows, slots = []) {
  if (!Array.isArray(rows)) return [];
  const lookup = toSlotLookup(slots);
  return rows
    .map((r) => {
      const ix = readSlotIndex(r);
      if (ix === null) return null;
      const slot = lookup.get(ix);
      if (!slot) return null;
      return {
        slotId: slot.id,
        finalStationOutput: {
          stationId: r.stationId ?? r.STATION_ID ?? null,
          plannedOutput: toNum(r.planOutput ?? r.PLAN_OUTPUT),
          actualOutput: toNum(r.actualOutput ?? r.ACTUAL_OUTPUT),
          achievement: toNum(r.achievement ?? r.ACHIEVEMENT),
        },
      };
    })
    .filter(Boolean);
}

/**
 * Chuẩn hoá rows DASH_CHART_UPH
 * ([{ slotIx, stationId, uphActual, actualOutput, uphTarget }])
 * thành shape mà `UphTrendChart` đọc: `[{ slotId, stationId, actual, target }]`.
 */
export function normalizeChartUphRows(rows, slots = [], fallbackTarget = null) {
  if (!Array.isArray(rows)) return [];
  const lookup = toSlotLookup(slots);
  const fallbackRaw = toNum(fallbackTarget);
  const fallback = fallbackRaw !== null && fallbackRaw > 0 ? fallbackRaw : null;
  return rows
    .map((r) => {
      const ix = readSlotIndex(r);
      if (ix === null) return null;
      const slot = lookup.get(ix);
      if (!slot) return null;
      const targetRaw = toNum(r.uphTarget ?? r.UPH_TARGET);
      const target = targetRaw !== null && targetRaw > 0 ? targetRaw : null;
      return {
        slotId: slot.id,
        stationId: r.stationId ?? r.STATION_ID ?? null,
        actual: toNum(r.uphActual ?? r.UPH_ACTUAL),
        target: target ?? fallback,
      };
    })
    .filter(Boolean);
}

/** Gộp nguồn thô thành view cho UI. Trạm chỉ lấy từ GET_WIP_REPORT (không dùng Production_1_1_4). */
export function mergeDashboardData({
  chartOutputRows = [],
  chartUphRows = [],
  slots = [],
  fallbackTargetUph = null,
  moSummary = null,
  wipStations = [],
  errors = {},
} = {}) {
  return {
    summary: {
      totalInput: moSummary?.totalInput ?? 0,
      totalOutput: moSummary?.totalOutput ?? 0,
      planInput: moSummary?.planQty ?? 0,
      planOutput: moSummary?.planQty ?? 0,
      actualUph: moSummary?.uphActual ?? null,
      spanMin: moSummary?.spanMin ?? null,
      firstAt: moSummary?.firstAt ?? null,
      lastAt: moSummary?.lastAt ?? null,
      woStartDate: moSummary?.woStartDate ?? null,
      woEndDate: moSummary?.woEndDate ?? null,
      woDayCount: moSummary?.woDayCount ?? null,
      totalDefect: wipStations.reduce((a, s) => a + (s.ngQty ?? 0), 0),
      updatedAt: new Date().toISOString(),
    },
    stations: wipStations,
    hourly: normalizeChartOutputRows(chartOutputRows, slots),
    uphTrend: normalizeChartUphRows(chartUphRows, slots, fallbackTargetUph),
    updatedAt: new Date().toISOString(),
    errors,
  };
}
