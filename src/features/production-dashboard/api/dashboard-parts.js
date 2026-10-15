import { mesPost } from '@/lib/mes-http';
import { unwrapList } from '@/lib/unwrap-response';
import { MES_S_CODES } from '@/config/api';

/**
 * 4 nguồn dashboard, mỗi nguồn 1 request độc lập — hỏng nguồn nào chỉ
 * chết nguồn đó, không kéo theo 3 nguồn còn lại.
 *
 * Mỗi fetcher resolve `{ sCode, params, rows }` để màn debug hiển thị
 * nguyên request/response. Khi lỗi, `{ sCode, params }` được gắn vào
 * `error.part` rồi throw tiếp để React Query giữ ở `query.error`.
 */

async function postPart(sCode, params) {
  try {
    const res = await mesPost(sCode, params);
    return { sCode, params, rows: unwrapList(res) };
  } catch (error) {
    error.part = { sCode, params };
    throw error;
  }
}

/**
 * 1. Tổng nhập/xuất của 1 WO — nguồn cho 2 thẻ KPI đầu vào / đầu ra.
 * Trả [{ totalInput, totalOutput, planQty }].
 *
 * KHÔNG dùng Production_1_1_4: câu đó không lọc MO/chuyền nên gộp mọi WO
 * của công đoạn vào cùng một bảng. Đã bỏ hẳn khỏi dashboard.
 */
export function getMoSummaryPart({ mo, dateStr, dept, lineId, shift, scope }) {
  const params = {
    MO: mo,
    SDATE: dateStr,
    LINE: lineId,
    DEPT: dept,
    SHIFT: shift,
    SCOPE: scope,
  };
  return postPart(MES_S_CODES.production.moSummary, params);
}

/**
 * 1c. WIP report theo WO — nguồn chính cho bảng chi tiết trạm
 * (plan/thực tế/UPH/NG) + 6 khung giờ s1..s6.
 */
export function getWipReportPart({ mo, dateStr, dept, lineId, shift, model, scope }) {
  const params = {
    SDATE: dateStr,
    MO: mo,
    LINE: lineId,
    DEPT: dept,
    SHIFT: shift,
    MODEL: model,
    SCOPE: scope,
  };
  return postPart(MES_S_CODES.production.wipReport, params);
}

/**
 * 3. Biểu đồ 1 — Output & Achievement theo khung 2 giờ (DASH_CHART_OUTPUT).
 * Trả 6 dòng: slotIx, slotLabel, stationId, planOutput, actualOutput,
 * achievement. Khung không có sản lượng vẫn có dòng (giá trị 0) để trục X
 * của biểu đồ không bị lệch.
 */
export function getChartOutputPart({ mo, dateStr, dept, lineId, shift, model, scope }) {
  const params = {
    SDATE: dateStr,
    MO: mo,
    LINE: lineId,
    DEPT: dept,
    SHIFT: shift,
    MODEL: model,
    SCOPE: scope,
  };
  return postPart(MES_S_CODES.production.chartOutput, params);
}

/**
 * 4. Biểu đồ 2 — Xu hướng UPH theo khung 2 giờ (DASH_CHART_UPH).
 * Trả 6 dòng: slotIx, slotLabel, stationId, uphActual, actualOutput,
 * uphTarget. `uphTarget` null khi bảng CIM_UNIT_PER_HOUR còn rỗng — FE tự
 * lấy số tạm trong lib/dashboard-target-uph.js.
 */
export function getChartUphPart({ mo, dateStr, dept, lineId, shift, model, scope }) {
  const params = {
    SDATE: dateStr,
    MO: mo,
    LINE: lineId,
    DEPT: dept,
    SHIFT: shift,
    MODEL: model,
    SCOPE: scope,
  };
  return postPart(MES_S_CODES.production.chartUph, params);
}

/**
 * 5. Quy trình sản xuất theo WO — nguồn dựng danh sách trạm cho FlowStrip,
 * bù cho trạm có trong flow nhưng không có log trong ca đang xem.
 */
export function getFlowPart({ mo, dateStr, dept, lineId, shift }) {
  const params = { MO: mo, SDATE: dateStr, EDATE: dateStr, DEPT: dept, LINE: lineId, SHIFT: shift };
  return postPart(MES_S_CODES.production.flowByMo, params);
}
