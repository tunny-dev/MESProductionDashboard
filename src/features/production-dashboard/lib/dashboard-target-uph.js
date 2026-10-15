/**
 * UPH MỤC TIÊU — TẠM THỜI FIX CỨNG Ở FRONTEND.
 *
 * LÝ DO: SFCS không có cột nào chứa UPH/USAGE/TACT/UPH (đã grep toàn DB, 0 kết
 * quả). Ngày 13/10/2026 đã hỏi bên hệ thống và câu trả lời là: *"目標UPH，這個 SFCS
 * 沒有，你要問 ERP 那邊的人"* — phải hỏi ERP mới có con số này.
 *
 * Đã chuẩn bị sẵn phương án bảng tạm `DASHBOARD_TARGET` (IE duy trì
 * TARGET_UPH theo trạm) và API `GET_WIP_REPORT` đã trả sẵn cột `UPH_TARGET`.
 * Nhưng số trong bảng đó là dữ liệu mẫu nên chưa dùng — dùng thì ra số bịa.
 * Vì vậy tạm để trống và dùng số ở đây.
 *
 * ------------------------------------------------------------------
 * KHI CÓ NGUỒN THẬT (ERP hoặc bảng tạm đã được IE nhập):
 *   1. Xoá file này và import trong production-dashboard-page.jsx
 *   2. Đọc thẳng `UPH_TARGET` từ API, không cần đụng component nào khác.
 * ------------------------------------------------------------------
 *
 * HIỆN TẠI: số ở đây là NGUỒN DUY NHẤT. API có trả `UPH_TARGET` thì cũng bị
 * bỏ qua — vì bảng tạm đang là dữ liệu mẫu, để nó thắng sẽ ra số bịa.
 * Muốn đổi thứ tự ưu tiên thì sửa hàm getTargetUph() bên dưới.
 *
 * CÁCH DÙNG
 *   TARGET_UPH_DEFAULT      — dùng cho mọi trạm chưa khai báo trong map
 *   STATION_TARGET_UPH      — ghi đè cho từng trạm, khoá `${công đoạn}|${trạm}`
 *   getTargetUph()          — trả về số định mức để dựng UI
 *
 * CHÚ Ý: đây là số GIẢ để dựng layout. Không dùng để báo cáo, không in ra
 * báo cáo gửi khách hàng. Đổi số ở đây không cần build lại server.
 */

/** Số mặc định khi chưa khai báo cho trạm nào — lấy theo mẫu gốc (400). */
export const TARGET_UPH_DEFAULT = 400;

/**
 * Ghi đè theo từng trạm. Khoá: `${công đoạn}|${mã trạm}` — `công đoạn` là
 * 'SMT' | 'DIP' | 'FA', `mã trạm` là `TA007` (AA06, AT74, AP08…).
 *
 * Ví dụ:
 *   'FA|AA06': 30,
 *   'SMT|SMT04': 850,
 *
 * Để trống ({}): mọi trạm dùng TARGET_UPH_DEFAULT.
 */
export const STATION_TARGET_UPH = {
  // --- SMT ---
  // 'SMT|SMT04': 850,
  // 'SMT|SI08': 850,
  // --- DIP ---
  // 'DIP|MI13': 400,
  // 'DIP|MI11': 400,
  // --- FA ---
  // 'FA|AA06': 30,
  // 'FA|AT74': 25,
};

/**
 * UPH mục tiêu của 1 trạm.
 *
 * @param {object} args
 * @param {string} [args.process] Công đoạn 'SMT' | 'DIP' | 'FA'.
 * @param {string} [args.line] Mã chuyền (TA008) — dùng cho khoá ghi đè theo chuyền.
 * @param {string} [args.op] Mã trạm (TA007).
 * @param {number|null} [args.apiTarget] Giá trị `UPH_TARGET` từ API. Hiện BỎ QUA
 *   có chủ đích — bảng tạm đang là dữ liệu mẫu.
 * @returns {number|null}
 */
export function getTargetUph({ process, line, op, apiTarget } = {}) {
  // Bỏ qua apiTarget: xem ghi chú đầu file.
  void apiTarget;

  // 1. Ghi đè theo trạm trong công đoạn.
  if (process && op) {
    const byStation = STATION_TARGET_UPH[`${process}|${op}`];
    if (Number.isFinite(byStation)) return byStation;

    // 2. Ghi đè theo trạm trên chuyền cụ thể.
    const byLine = STATION_TARGET_UPH[`${line}|${op}`];
    if (Number.isFinite(byLine)) return byLine;
  }

  // 3. Mặc định.
  return TARGET_UPH_DEFAULT;
}