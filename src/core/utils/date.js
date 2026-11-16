/**
 * `Date` (hoặc "bây giờ") → `yyyyMMdd`.
 * @param {Date} [date]
 * @returns {string}
 */
export function toCompactDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

/**
 * Chấp nhận `yyyyMMdd` hoặc `yyyy-MM-dd`.
 * @param {unknown} value
 * @param {string|null} [fallback]
 * @returns {string|null}
 */
export function toCompactDateOr(value, fallback = null) {
  if (!value) return fallback;
  const s = String(value).replace(/[^0-9]/g, '');
  return /^\d{8}$/.test(s) ? s : fallback;
}
