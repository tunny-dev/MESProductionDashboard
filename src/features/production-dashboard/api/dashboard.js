import { calculateYield, sanitizeStationUph } from '@/features/production-dashboard/lib/calc';

/** Map công đoạn → mã DEPT cho các SP Production_1_1_x. */
export function getDeptCode(group) {
  return group === 'SMT' ? 'H001' : group === 'DIP' ? 'H002' : 'H003';
}

/** Map ca UI → mã SHIFT cho SP. */
export const SHIFT_CODES = { day: '1', night: '2', full: '3' };

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

/**
 * Chuẩn hoá rows GET_WIP_REPORT
 * ([{ seq, op, opDes, line, inputQty, outputQty, ngQty, planInput, planOutput,
 *    targetUph, spanMin, uphActual, s1..s6, firstAt, lastAt }])
 * thành station cho bảng chi tiết. Chấp cả key hoa cho tương thích BE đổi case.
 *
 * `slots` là bộ khung ĐANG HIỂN THỊ. Phải ánh `s1..s6` theo `slot.slotIx`, không
 * được lấy theo vị trí mảng: phạm vi 'Cả WO' bỏ các nhóm rỗng, nên WO 2 ngày
 * có SQL trả dữ liệu ở bucket 0 và 3 nhưng bảng chỉ hiện 2 cột — lấy theo vị
 * trí sẽ khớp nhầm sang bucket rỗng và cột đúng bị trống.
 */
export function normalizeWipReportRows(rows, slots) {
  if (!Array.isArray(rows)) return [];
  const slotList = slots?.length ? slots : FALLBACK_SLOTS;
  const slotCount = slotList.length;
  const num = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return rows
    .map((r) => {
      const op = r.op ?? r.OP ?? r.station ?? r.Station;
      const opDes = r.opDes ?? r.OP_DES ?? r.opDescription ?? r.StationDes ?? null;
      const planOut = num(r.planOutput ?? r.planOut ?? r.PLAN_OUT);
      const actualInput = num(r.inputQty ?? r.INPUT_QTY);
      const actualOutput = num(r.outputQty ?? r.OUTPUT_QTY);
      const spanMin = num(r.spanMin ?? r.SPAN_MIN);

      // Kế hoạch mỗi khung = planOutput chia đều cho số khung đang hiện.
      // s1..s6 từ API là SỐ LƯỢNG thô, phải đổi thày % trước khi đưa vào ô màu.
      // Chặn trên 100% — sản lượng vượt kế hoạch vẫn hiển thị là đạt 100%.
      const planPerSlot = planOut !== null && slotCount > 0 ? planOut / slotCount : null;
      const rawSlots = [r.s1, r.s2, r.s3, r.s4, r.s5, r.s6];
      const hourlyAchievement = slotList.map((slot) => {
        const count = num(rawSlots[slot.slotIx]);
        if (count === null || planPerSlot === null || planPerSlot <= 0) return null;
        return Math.min((count / planPerSlot) * 100, 100);
      });

      return {
        stationId: op ?? '',
        opCode: op ?? '',
        opName: opDes ?? '',
        stationName: opDes ?? '',
        seq: r.seq ?? r.Seq ?? '',
        line: r.line ?? r.Line ?? null,
        planInput: num(r.planInput ?? r.PLAN_INPUT),
        actualInput,
        planOutput: planOut,
        actualOutput,
        ngQty: num(r.ngQty ?? r.NG_QTY),
        // Số SN từng NG rồi test lại đạt (TA040='1' ở bản ghi kế) — port từ
        // SP OnLine_1_2_addtime. Có cột này thì khi ngQty giảm (101 -> 35)
        // người xem biết số còn lại đi đâu, thay vì tưởng mất dữ liệu.
        // API cũ chưa có cột này thì null, UI hiện '—'.
        retestQty: num(r.rtQty ?? r.RT_QTY),
        // Số đạt LẦN ĐẦU (TA028='1') — đầu vào của công thức tỷ lệ tốt.
        // Không có cột này thì tỷ lệ tốt lùi về đầu ra ÷ đầu vào.
        firstPass: num(r.firstPass ?? r.FIRST_PASS),
        targetUph: num(r.targetUph ?? r.TARGET_UPH),
        // Bỏ UPH khi trạm chạy quá ngắn (vài đơn trong vài giây) — xem calc.js.
        actualUph: sanitizeStationUph(num(r.uphActual ?? r.UPH_ACTUAL), spanMin),
        spanMin,
        firstAt: (r.firstAt ?? r.FirstAt ?? null) || null,
        lastAt: (r.lastAt ?? r.LastAt ?? null) || null,
        // Đã là % đạt theo từng khung, index khớp với shift.slots.
        hourlyAchievement,
      };
    })
    .filter((s) => s.stationId !== '');
}

/**
 * Chuẩn hoá rows GET_SUMMARY
 * ([{ totalInput, totalOutput, planQty, firstAt, lastAt, spanMin, uphActual }])
 * thành 1 dòng số liệu cho các thẻ KPI đầu vào / đầu ra / UPH.
 * Chấp cả key hoa cho tương thích BE đổi case.
 */
export function normalizeMoSummaryRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const r = rows[0];
  const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    totalInput: toNumber(r.totalInput ?? r.TotalInput ?? r.TOTAL_INPUT) ?? 0,
    totalOutput: toNumber(r.totalOutput ?? r.TotalOutput ?? r.TOTAL_OUTPUT) ?? 0,
    planQty: toNumber(r.planQty ?? r.PlanQty ?? r.PLAN_QTY) ?? 0,
    // firstAt/lastAt = YYYYMMDDHHmmss — mốc đầu/cuối trong ca để hiển thị.
    firstAt: (r.firstAt ?? r.FirstAt ?? null) || null,
    lastAt: (r.lastAt ?? r.LastAt ?? null) || null,
    spanMin: toNumber(r.spanMin ?? r.SpanMin ?? null),
    uphActual: toNumber(r.uphActual ?? r.UphActual ?? null),
    // Khoảng ngày THỰC TẾ của WO trên chuyền này (không phụ thuộc phạm vi
    // đang xem) — dùng dựng nhãn 6 nhóm ngày và dòng "Chạy ... · N ngày".
    // SQL trả ngày LỊCH, không phải số ngày có log: WO 30/09→14/10 mất ngày
    // 11/10 thì dayCount = 15 chứ không phải 14.
    woStartDate: (r.woStartDate ?? r.WO_START_DATE ?? null) || null,
    woEndDate: (r.woEndDate ?? r.WO_END_DATE ?? null) || null,
    woDayCount: toNumber(r.woDayCount ?? r.WO_DAY_COUNT ?? null),
  };
}

/** Ép về số, null khi rỗng / không phải số. */
function toNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Đọc `slotIx` (0..5) — SQL chỉ trả chỉ số, nhãn do FE dựng theo phạm vi. */
function readSlotIndex(row) {
  const raw = row.slotIx ?? row.SLOT_IX ?? row.slotIndex ?? row.SLOT_INDEX;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < 64 ? n : null;
}

/**
 * Bảng tra `slotIx` → khung hiển thị.
 *
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
 *
 * `slots` là bộ khung đang dùng (ca đang xem hoặc các nhóm ngày của WO). Nhãn
 * do đây sinh nên đổi phạm vi là biểu đồ tự đổi trục X, không sửa component.
 * SQL luôn trả về 6 dòng nên `slotIx` luôn khớp 1 khung.
 */
export function normalizeChartOutputRows(rows, slots = []) {
  if (!Array.isArray(rows)) return [];
  const lookup = toSlotLookup(slots);
  return rows
    .map((r) => {
      const ix = readSlotIndex(r);
      if (ix === null) return null;
      const slot = lookup.get(ix);
      if (!slot) return null; // nhóm rỗng đã bị lược bỏ khỏi `slots`
      return {
        slotId: slot.id,
        finalStationOutput: {
          stationId: r.stationId ?? r.STATION_ID ?? null,
          plannedOutput: toNum(r.planOutput ?? r.PLAN_OUTPUT),
          actualOutput: toNum(r.actualOutput ?? r.ACTUAL_OUTPUT),
          // SQL đã chặn trên 100; để null thì component tự tính lại.
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
 *
 * `uphTarget` null (bảng CIM_UNIT_PER_HOUR còn rỗng) → dùng `fallbackTarget`
 * — cùng nguồn số tạm với cột UPH mục tiêu của bảng trạm.
 */
export function normalizeChartUphRows(rows, slots = [], fallbackTarget = null) {
  if (!Array.isArray(rows)) return [];
  const lookup = toSlotLookup(slots);
  const fallback = toNum(fallbackTarget);
  return rows
    .map((r) => {
      const ix = readSlotIndex(r);
      if (ix === null) return null;
      const slot = lookup.get(ix);
      if (!slot) return null;
      return {
        slotId: slot.id,
        stationId: r.stationId ?? r.STATION_ID ?? null,
        actual: toNum(r.uphActual ?? r.UPH_ACTUAL),
        target: toNum(r.uphTarget ?? r.UPH_TARGET) ?? fallback,
      };
    })
    .filter(Boolean);
}

/**
 * Gộp nguồn thô thành view cho UI.
 *
 * @param {object} args
 * @param {Array} args.chartOutputRows Rows DASH_CHART_OUTPUT (biểu đồ 1).
 * @param {Array} args.chartUphRows Rows DASH_CHART_UPH (biểu đồ 2).
 * @param {number|null} args.fallbackTargetUph UPH mục tiêu tạm khi API chưa có.
 * @param {object|null} args.moSummary Rows đã chuẩn hoá của GET_SUMMARY.
 * @param {Array} args.wipStations Rows đã chuẩn hoá của GET_WIP_REPORT.
 *
 * KHÔNG dùng `Production_1_1_4` để dựng danh sách trạm. Câu đó lọc theo
 * (ngày, công đoạn) mà KHÔNG có MO và KHÔNG có chuyền — một WO chạy song
 * song nhiều chuyền sẽ gộp hết vào một bảng (đã gặp: 13 dòng / 3 WO /
 * 3 chuyền). Nguồn duy nhất cho bảng trạm là GET_WIP_REPORT.
 */
export function mergeDashboardData({
  chartOutputRows = [],
  chartUphRows = [],
  slots = [],
  fallbackTargetUph = null,
  moSummary = null,
  wipStations = [],
  errors = {},
} = {}) {
  // Tổng NG / tỷ lệ tốt tính từ chính danh sách trạm (cùng bộ lọc với bảng),
  // không cộng dồn từ câu không lọc WO — sẽ lẫn số của các WO khác.
  const yieldList = wipStations
    .map((s) => calculateYield(s.actualOutput, s.actualInput))
    .filter((v) => v !== null);

  return {
    summary: {
      // KPI tổng nhập/xuất chỉ lấy từ GET_SUMMARY (đã lọc MO + chuyền + ca).
      // Không có thì để 0 chứ không đoán bằng dữ liệu chung của cả công đoạn.
      totalInput: moSummary?.totalInput ?? 0,
      totalOutput: moSummary?.totalOutput ?? 0,
      planInput: moSummary?.planQty ?? 0,
      planOutput: moSummary?.planQty ?? 0,
      // UPH thực tế do BE tính (GET_SUMMARY.uphActual).
      actualUph: moSummary?.uphActual ?? null,
      spanMin: moSummary?.spanMin ?? null,
      firstAt: moSummary?.firstAt ?? null,
      lastAt: moSummary?.lastAt ?? null,
      woStartDate: moSummary?.woStartDate ?? null,
      woEndDate: moSummary?.woEndDate ?? null,
      woDayCount: moSummary?.woDayCount ?? null,
      totalDefect: wipStations.reduce((a, s) => a + (s.ngQty ?? 0), 0),
      avgYield: yieldList.length ? yieldList.reduce((a, b) => a + b, 0) / yieldList.length : 0,
      updatedAt: new Date().toISOString(),
    },
    stations: wipStations,
    hourly: normalizeChartOutputRows(chartOutputRows, slots),
    uphTrend: normalizeChartUphRows(chartUphRows, slots, fallbackTargetUph),
    updatedAt: new Date().toISOString(),
    errors,
  };
}
