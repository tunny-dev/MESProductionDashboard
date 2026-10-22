/**
 * Ép kiểu dữ liệu MES trả về về dạng FE dùng được.
 * @param {unknown} value
 * @param {number|null} [fallback] Giá trị trả về khi rỗng / không phải số.
 * @returns {number|null}
 */
export function toNum(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Số nguyên — bỏ phần thập phân (số lượng, số ngày…). */
export function toInt(value, fallback = null) {
  const n = toNum(value, null);
  return n === null ? fallback : Math.trunc(n);
}

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string} `''` khi rỗng (KHÔNG trả `'null'` / `'undefined'`).
 */
export function toText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}
