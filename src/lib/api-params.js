function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Đổi ngày về yyyy-MM-dd.
 * Nhận Date | 'yyyyMMdd' | 'yyyy/MM/dd' | 'yyyy-MM-dd' | 'yyyyMMddHHmmss'.
 * @param {unknown} value
 * @returns {string|null}
 */
export function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  const str = String(value).trim();
  // Nếu đã là yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const digits = str.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return null;
}

/**
 * Như toIsoDate nhưng có giá trị dự phòng khi input rỗng hoặc không hợp lệ.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function toIsoDateOr(value, fallback) {
  return toIsoDate(value) ?? fallback;
}

/**
 * Chuẩn hoá danh sách: mảng | CSV | giá trị đơn -> mảng chuỗi đã trim, bỏ rỗng.
 * 'ALL' (quy ước không lọc của MES cũ) chuyển thành undefined để API hiểu là không lọc.
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
 * Chuẩn hoá số nguyên dương. ''/null/'ALL' -> undefined.
 * @param {unknown} value
 * @returns {number|undefined}
 */
export function toPositiveInt(value) {
  const text = String(value ?? '').trim();
  if (text === '' || text.toUpperCase() === 'ALL') return undefined;
  const num = Number(text);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : undefined;
}
