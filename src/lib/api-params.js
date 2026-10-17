/**
 * Helper chuẩn hoá tham số gửi lên API mới (MESProductionDashboardAPI).
 *
 * Vì sao cần: API mới bind `DateOnly` từ JSON body theo ISO 8601 (`yyyy-MM-dd`),
 * và nhận danh sách (`Models`/`Mos`/`Lines`) dưới dạng mảng JSON. UI lại đang
 * giữ ngày dạng `yyyyMMdd` và danh sách dạng CSV — gom chuẩn hoá về một chỗ để
 * mọi feature gửi payload giống nhau.
 */

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Đổi ngày về `yyyy-MM-dd`.
 * Nhận Date | 'yyyyMMdd' | 'yyyy/MM/dd' | 'yyyy-MM-dd' | 'yyyyMMddHHmmss'.
 * @param {unknown} value
 * @returns {string|null}
 */
export function toIsoDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return null;
}

/**
 * Như `toIsoDate` nhưng có giá trị dự phòng khi input rỗng/không hợp lệ.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function toIsoDateOr(value, fallback) {
  return toIsoDate(value) ?? fallback;
}

/**
 * Chuẩn hoá danh sách: mảng | CSV | giá trị đơn → mảng chuỗi đã trim, bỏ rỗng.
 * `'ALL'` (quy ước "không lọc" của MES cũ) trả về `undefined` để API hiểu là
 * "lấy tất cả".
 *
 * @param {unknown} value
 * @returns {string[]|undefined}
 */
export function toList(value) {
  if (value === null || value === undefined) return undefined;

  const parts = Array.isArray(value) ? value : String(value).split(',');
  const out = [];
  for (const part of parts) {
    const text = String(part ?? '').trim();
    if (text === '' || text.toUpperCase() === 'ALL') continue;
    if (!out.includes(text)) out.push(text);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Chuẩn hoá số nguyên dương. `''`/`null`/`'ALL'` → `undefined`.
 * @param {unknown} value
 * @returns {number|undefined}
 */
export function toPositiveInt(value) {
  const text = String(value ?? '').trim();
  if (text === '' || text.toUpperCase() === 'ALL') return undefined;
  const num = Number(text);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : undefined;
}
