import { http } from '@/lib/http';
import { ENDPOINTS } from '@/config/api';

/**
 * 5 nguồn dashboard, mỗi nguồn 1 request độc lập — hỏng nguồn nào chỉ
 * chết nguồn đó, không kéo theo các nguồn còn lại.
 *
 * Mỗi fetcher resolve `{ endpoint, params, rows }` để màn debug hiển thị
 * nguyên request/response. Khi lỗi, `{ endpoint, params }` được gắn vào
 * `error.part` rồi throw tiếp để React Query giữ ở `query.error`.
 */

/** API trả về mảng cho hầu hết endpoint; `getMoSummary` trả 1 object → bọc mảng
 * để downstream `.map` không vỡ.
 * @param {unknown} data
 * @returns {Array}
 */
function asRows(data) {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  return [data];
}

/**
 * Gọi 1 endpoint production (GET + query params).
 * @param {string} endpoint
 * @param {Record<string, unknown>} params
 */
async function getPart(endpoint, params) {
  try {
    const data = await http.get(endpoint, { params });
    return { endpoint, params, rows: asRows(data) };
  } catch (error) {
    error.part = { endpoint, params };
    throw error;
  }
}

/**
 * `scope`: 'DAY' (mặc định) = cửa sổ ca; 'WO' = toàn bộ vòng đời work-order.
 * API chỉ hiểu chuỗi 'WO'; bỏ hẳn `scope` cho ca để dùng mặc định shift window.
 * @param {string|undefined} scope
 * @returns {Record<string, string>}
 */
function scopeParam(scope) {
  return scope === 'WO' ? { scope: 'WO' } : {};
}

/**
 * 1. Tổng nhập/xuất của 1 WO — nguồn cho 2 thẻ KPI đầu vào / đầu ra.
 * Trả [{ totalInput, totalOutput, planQty, ... }].
 */
export function getMoSummaryPart({ mo, dateStr, dept, lineId, shift, scope }) {
  return getPart(ENDPOINTS.production.moSummary, {
    sDate: dateStr,
    mo,
    line: lineId,
    dept,
    shift,
    ...scopeParam(scope),
  });
}

/**
 * 1c. WIP report theo WO — nguồn chính cho bảng chi tiết trạm
 * (plan/thực tế/UPH/NG) + 6 khung giờ s1..s6.
 */
export function getWipReportPart({ mo, dateStr, dept, lineId, shift, model, scope }) {
  return getPart(ENDPOINTS.production.wipReport, {
    sDate: dateStr,
    mo,
    line: lineId,
    dept,
    shift,
    model,
    ...scopeParam(scope),
  });
}

/**
 * 3. Biểu đồ 1 — Output & Achievement theo khung 2 giờ.
 * Trả 6 dòng: slotIx, stationId, planOutput, actualOutput, achievement.
 * Khung không có sản lượng vẫn có dòng (giá trị 0) để trục X không lệch.
 */
export function getChartOutputPart({ mo, dateStr, dept, lineId, shift, model, scope }) {
  return getPart(ENDPOINTS.production.achievement, {
    sDate: dateStr,
    mo,
    line: lineId,
    dept,
    shift,
    model,
    ...scopeParam(scope),
  });
}

/**
 * 4. Biểu đồ 2 — Xu hướng UPH theo khung 2 giờ.
 * Trả 6 dòng: slotIx, stationId, uphActual, actualOutput, uphTarget.
 * `uphTarget` null khi bảng CIM_UNIT_PER_HOUR còn rỗng — FE tự lấy số tạm trong
 * lib/dashboard-target-uph.js.
 */
export function getChartUphPart({ mo, dateStr, dept, lineId, shift, model, scope }) {
  return getPart(ENDPOINTS.production.uphTrend, {
    sDate: dateStr,
    mo,
    line: lineId,
    dept,
    shift,
    model,
    ...scopeParam(scope),
  });
}

/**
 * 5. Quy trình sản xuất theo WO — nguồn dựng danh sách trạm cho FlowStrip,
 * bù cho trạm có trong flow nhưng không có log trong ca đang xem.
 */
export function getFlowPart({ mo, dateStr, dept, lineId, shift }) {
  return getPart(ENDPOINTS.production.flowByMo, {
    sDate: dateStr,
    mo,
    line: lineId,
    dept,
    shift,
  });
}
