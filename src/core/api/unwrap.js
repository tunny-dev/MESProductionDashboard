/** @param {unknown} payload @returns {boolean} */
function isPlainObject(payload) {
  return Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload);
}

const LIST_KEYS = ['data', 'result', 'rows', 'items', 'list', 'records'];

/**
 * Quy payload về mảng rows.
 * @param {unknown} payload
 * @returns {object[]}
 */
export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!isPlainObject(payload)) return [];

  for (const key of LIST_KEYS) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  return [payload];
}

/**
 * Quy payload về đúng 1 row (hoặc null nếu rỗng).
 * @param {unknown} payload
 * @returns {object|null}
 */
export function unwrapObject(payload) {
  const rows = unwrapList(payload);
  return rows.length > 0 ? rows[0] : null;
}
