import { MES_S_CODES } from '@/constants/api';
import { mesRows } from '@/core/api/mesClient';

/**
 * `scope`: `'WO'` = toàn bộ vòng đời work-order, còn lại = cửa sổ ca (`SHIFT`).
 * Chế độ `'ROUTING'` (xem toàn bộ trạm của WO trên mọi chuyền) dùng CHUNG nhánh
 * WO của SP — khác biệt duy nhất là `line`/`dept` gửi xuống rỗng (xem hook).
 * SP `sp_get_*` mặc định `@scope = 'SHIFT'`.
 */
function scopeParam(scope) {
  return { scope: scope === 'WO' || scope === 'ROUTING' ? 'WO' : 'SHIFT' };
}

/** params dùng chung: WO + ngày + chuyền + công đoạn + ca + phạm vi. */
function baseParams({ mo, dateStr, dept, lineId, shift, scope }) {
  return { sDate: dateStr, mo, line: lineId, dept, shift, ...scopeParam(scope) };
}

/** Như `baseParams` nhưng thêm `model` (các SP có lọc model). */
function modelParams(args) {
  return { ...baseParams(args), model: args.model };
}

/**
 * 1. Tổng nhập/xuất của 1 WO — nguồn cho 2 thẻ KPI đầu vào / đầu ra.
 * sCode `getMoSummary` → `sp_get_mo_summary`.
 * Trả 1 dòng `{ totalInput, totalOutput, planQty, firstAt, lastAt, spanMin,
 * uphActual, woStartDate, woEndDate, woDayCount }`.
 */
// Mapping: sCode ↔ key ↔ SP. Gọi: getPart(key) -> mesRows(sCode) -> /MES/invoke6?sCode=<sCode>
export const DASHBOARD_PARTS = [
  {
    key: 'moSummary', // getMoSummary / sp_get_mo_summary
    label: 'Tổng nhập/xuất WO',
    sCode: MES_S_CODES.production.getMoSummary,
    usesModel: false,
    buildParams: baseParams,
  },
  /**
   * 2. WIP report theo WO — nguồn chính cho bảng chi tiết trạm
   * (plan/thực tế/UPH/NG) + 6 khung giờ s1..s6.
   * sCode `getWipReport` → `sp_get_wip_report`.
   */
  {
    key: 'wipReport', // getWipReport / sp_get_wip_report
    label: 'WIP report trạm',
    sCode: MES_S_CODES.production.getWipReport,
    usesModel: true,
    buildParams: modelParams,
  },
  /**
   * 3. Biểu đồ 1 — Output & Achievement theo khung 2 giờ.
   * sCode `getProductionAchievement`.
   * Trả 6 dòng: `slotIx, stationId, planOutput, actualOutput, achievement`.
   */
  {
    key: 'hourly', // getProductionAchievement / sp_get_production_achievement
    label: 'Biểu đồ output & đạt kế hoạch',
    sCode: MES_S_CODES.production.getProductionAchievement,
    usesModel: true,
    buildParams: modelParams,
  },
  /**
   * 4. Biểu đồ 2 — Xu hướng UPH theo khung 2 giờ.
   * sCode `getUphTrend` → `sp_get_uph_trend`.
   * Trả 6 dòng: `slotIx, stationId, uphActual, actualOutput, uphTarget`.
   */
  {
    key: 'uphTrend', // getUphTrend / sp_get_uph_trend
    label: 'Biểu đồ xu hướng UPH',
    sCode: MES_S_CODES.production.getUphTrend,
    usesModel: true,
    buildParams: modelParams,
  },
  /**
   * 5. Quy trình sản xuất theo WO — nguồn dựng danh sách trạm cho FlowStrip,
   * bù cho trạm có trong flow nhưng không có log trong ca đang xem.
   * sCode `getFlowByMo` → `sp_get_flow_by_mo`.
   */
  {
    key: 'flow', // getFlowByMo / sp_get_flow_by_mo
    label: 'Quy trình theo WO',
    sCode: MES_S_CODES.production.getFlowByMo,
    usesModel: false,
    buildParams: (args) => baseParams({ ...args, scope: 'WO' }),
  },
  /**
   * 6. Cycle time / target UPH thật từ CimCycleTime (nguồn Oracle).
   * sCode `getCycleTime` → `sp_get_cycle_time`.
   * Trả nhiều dòng: `Stage, TargetUph` (và UsageMin, PeopleCount...).
   * FE dùng để ghi đè targetUph hardcode (400) bằng số thật.
   */
  {
    key: 'cycleTime', // getCycleTime / sp_get_cycle_time
    label: 'Cycle time / UPH mục tiêu',
    sCode: MES_S_CODES.production.getCycleTime,
    usesModel: false,
    buildParams: ({ mo, dateStr }) => ({
      sDate: dateStr,
      mo,
      mfgType: null,
      stage: null,
    }),
  },
];

const PART_BY_KEY = new Map(DASHBOARD_PARTS.map((part) => [part.key, part]));

/**
 * Gọi 1 nguồn. Trả `{ sCode, endpoint, params, rows }` để panel debug hiển thị
 * nguyên request/response. Lỗi thì ném tiếp để React Query giữ ở `query.error`.
 * @param {string} key
 * @param {object} args
 */
export async function getPart(key, args) {
  const part = PART_BY_KEY.get(key);
  if (!part) throw new Error(`[dashboard] Không có nguồn "${key}" trong DASHBOARD_PARTS`);

  const params = part.buildParams(args);
  const rows = await mesRows(part.sCode, params);
  return { sCode: part.sCode, endpoint: part.sCode, params, rows };
}
