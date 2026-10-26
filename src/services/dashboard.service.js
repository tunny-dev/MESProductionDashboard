import { parseTaTimestamp, sanitizeStationUph } from '@/pages/production-dashboard/utils/calc';
import { toNum } from '@/core/utils/coerce';

/**
 * Chuẩn hoá rows GET_FLOW_BY_MO ({ seq, stage, stageDes, line, qty })
 * thành station configs cho FlowStrip, sắp xếp theo seq.
 */
export function normalizeFlowRows(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const id = r.stage;
    if (typeof id !== 'string') continue;
    const stage = id.trim();
    if (stage === '' || seen.has(stage)) continue;
    seen.add(stage);

    const desc = r.stageDes;
    const name = typeof desc === 'string' ? desc.trim() : '';

    out.push({
      id: stage,
      name,
      shortName: name,
      seq: r.seq ?? '',
      line: r.line ?? null,
      qty: r.qty ?? null,
    });
  }
  return out.sort((a, b) =>
    String(a.seq).localeCompare(String(b.seq), undefined, { numeric: true })
  );
}

/** 6 khung mặc định khi chưa có bộ khung nào (lúc đang tải). */
const FALLBACK_SLOTS = Array.from({ length: 6 }, (_, i) => ({ slotIx: i }));

/** Đọc 1 khoá camelCase từ row API. */
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
    const station = pick(row, 'op', 'station');
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
  const outputOf = (row) => num(row, 'outputQty') ?? 0;

  const primary = group.reduce((best, row) => (outputOf(row) > outputOf(best) ? row : best));
  const firstAt =
    group
      .map((row) => pick(row, 'firstAt'))
      .filter(Boolean)
      .sort()[0] ?? null;
  const lastAt =
    group
      .map((row) => pick(row, 'lastAt'))
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  const first = parseTaTimestamp(firstAt);
  const last = parseTaTimestamp(lastAt);
  const spanMin = first && last ? Math.max(0, (last.getTime() - first.getTime()) / 60000) : null;
  const outputQty = sum('outputQty');
  const uphActual = spanMin !== null && spanMin > 0 ? (outputQty * 60) / spanMin : null;

  return {
    seq: pick(primary, 'seq'),
    op: pick(primary, 'op'),
    opDes: pick(primary, 'opDes'),
    line: pick(primary, 'line'),
    lines: [...new Set(group.map((row) => pick(row, 'line')).filter(Boolean))],
    inputQty: sum('inputQty'),
    outputQty,
    ngQty: sum('ngQty'),
    firstPass: sum('firstPass'),
    scanQty: sumOrNull('scanQty'),
    ngEvents: sumOrNull('ngEvents'),
    ngAll: maxOrNull('ngAll'),
    planInput: maxOrNull('planInput'),
    planOutput: maxOrNull('planOutput'),
    targetUph: maxOrNull('targetUph'),
    spanMin,
    uphActual,
    s1: sum('s1'),
    s2: sum('s2'),
    s3: sum('s3'),
    s4: sum('s4'),
    s5: sum('s5'),
    s6: sum('s6'),
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
      const op = r.op ?? r.station;
      const opDes = r.opDes ?? r.opDescription ?? null;
      const planOut = toNum(r.planOutput ?? r.planOut);
      const actualInput = toNum(r.inputQty);
      const actualOutput = toNum(r.outputQty);
      const spanMin = toNum(r.spanMin);
      const ngQty = toNum(r.ngQty);
      const ngAll = toNum(r.ngAll);
      const ngEvents = toNum(r.ngEvents);
      const scanQty = toNum(r.scanQty);
      const ngRate =
        ngQty !== null && scanQty !== null && scanQty > 0 ? (ngQty / scanQty) * 100 : null;
      const targetUphRaw = toNum(r.targetUph);

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
        seq: r.seq ?? '',
        line: r.line ?? null,
        lines: Array.isArray(r.lines) && r.lines.length > 1 ? r.lines : null,
        planInput: toNum(r.planInput),
        actualInput,
        planOutput: planOut,
        actualOutput,
        ngQty,
        ngEvents,
        ngAll,
        ngRate,
        firstPass: toNum(r.firstPass),
        targetUph: targetUphRaw !== null && targetUphRaw > 0 ? targetUphRaw : null,
        actualUph: sanitizeStationUph(toNum(r.uphActual), spanMin),
        spanMin,
        firstAt: (r.firstAt ?? null) || null,
        lastAt: (r.lastAt ?? null) || null,
        stuckQty: toNum(r.stuckQty ?? r.stuckByStation),
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
    totalInput: toNum(r.totalInput) ?? 0,
    totalOutput: toNum(r.totalOutput) ?? 0,
    planQty: toNum(r.planQty) ?? 0,
    // firstAt/lastAt = YYYYMMDDHHmmss — mốc đầu/cuối trong ca để hiển thị.
    firstAt: (r.firstAt ?? null) || null,
    lastAt: (r.lastAt ?? null) || null,
    spanMin: toNum(r.spanMin),
    uphActual: toNum(r.uphActual),
    woStartDate: (r.woStartDate ?? null) || null,
    woEndDate: (r.woEndDate ?? null) || null,
    woDayCount: toNum(r.woDayCount),
  };
}

/** Đọc `slotIx` (0..5) — SQL chỉ trả chỉ số, nhãn do FE dựng theo phạm vi. */
function readSlotIndex(row) {
  const raw = row.slotIx ?? row.slotIndex;
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
          stationId: r.stationId ?? null,
          plannedOutput: toNum(r.planOutput),
          actualOutput: toNum(r.actualOutput),
          achievement: toNum(r.achievement),
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
      const targetRaw = toNum(r.uphTarget);
      const target = targetRaw !== null && targetRaw > 0 ? targetRaw : null;
      return {
        slotId: slot.id,
        stationId: r.stationId ?? null,
        actual: toNum(r.uphActual),
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
