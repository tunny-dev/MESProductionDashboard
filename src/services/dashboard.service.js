import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';
import { toIsoDate } from '@/lib/api-params';

/**
 * Lấy toàn bộ dữ liệu tổng hợp cho Production Dashboard.
 * Toàn bộ tính toán nghiệp vụ (WIP cascading, UPH thực tế, Yield %, NG Rate %, Trạng thái trạm, Bottleneck, 6 khung giờ)
 * đều được xử lý tập trung tại Backend Web API (/api/production-report/get-dashboard-detail).
 * @param {object} params
 * @param {string} [params.mo] Lệnh sản xuất (WO)
 * @param {string} [params.dateStr] Ngày sản xuất dạng YYYYMMDD
 * @param {string} [params.date] Ngày sản xuất
 * @param {string} [params.dept] Phân xưởng (SMT / DIP / FA)
 * @param {string} [params.lineId] Mã chuyền sản xuất
 * @param {string} [params.line] Mã chuyền sản xuất (alias)
 * @param {string} [params.shift] Ca sản xuất ('1' | '2')
 * @param {string} [params.model] Mã sản phẩm / model
 * @returns {Promise<object>} Dữ liệu dashboard hợp nhất
 */
export async function getDashboardDetail({ mo, dateStr, date, dept, lineId, line, shift, model }) {
  const finalDate = dateStr || date;
  const finalLine = lineId || line;
  const params = {
    sDate: toIsoDate(finalDate) || finalDate,
    mo: mo || undefined,
    line: finalLine || undefined,
    dept: dept || undefined,
    shift: shift || undefined,
    model: model || undefined,
  };

  const res = await http.get(ENDPOINTS.productionReport.dashboardDetail, { params });
  return res ?? null;
}
