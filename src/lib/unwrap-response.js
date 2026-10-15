/**
 * Bóc response linh hoạt — MES invoke trả mảng trần `[{...}, ...]`,
 * hệ thống khác bọc trong envelope `{ success, message, data: [...] }`.
 * Mọi chỗ cần danh sách đều đi qua đây để không phải `if` theo từng backend.
 */

/** Key envelope phổ biến, theo thứ tự ưu tiên. */
const ENVELOPE_KEYS = ['data', 'result', 'results', 'rows', 'items', 'list', 'records'];

/**
 * Tìm mảng lõi trong payload, bóc tối đa 3 lớp (`{ data: { data: [...] } }`).
 * @param {unknown} payload
 * @param {number} depth
 * @returns {Array|null}
 */
function findList(payload, depth = 0) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object' || depth > 2) return null;
  for (const key of ENVELOPE_KEYS) {
    const found = findList(payload[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Bóc envelope nhưng GIỮ nguyên kiểu lõi: mảng → mảng, object → object.
 * Dùng khi callsites cần cả hai dạng (ví dụ `summary` là object,
 * `stations` là mảng mà cùng đi qua một đường map chung).
 *
 * @param {unknown} payload
 * @returns {unknown} lõi đã bóc, hoặc nguyên payload nếu không phải envelope.
 */
export function unwrapEnvelope(payload) {
  if (Array.isArray(payload) || !payload || typeof payload !== 'object') return payload;
  for (const key of ENVELOPE_KEYS) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }
  // `{ success, data: {...} }` — lõi là object thì trả lõi (đệ quy để bóc
  // tiếp `{ data: { data: ... } }`). JSON hữu hạn nên luôn dừng.
  for (const key of ENVELOPE_KEYS) {
    const value = payload[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return unwrapEnvelope(value);
    }
  }
  return payload;
}

/**
 * Ép payload về mảng:
 * - `[...]` → giữ nguyên.
 * - `{ success, message, data: [...] }` → `data`.
 * - `{...}` lẻ → `[obj]` để downstream `.map` không vỡ.
 * - `null`/kiểu khác → `[]`.
 *
 * @param {unknown} payload
 * @returns {Array}
 */
export function unwrapList(payload) {
  const list = findList(payload);
  if (list) return list;
  if (payload && typeof payload === 'object') return [payload];
  return [];
}
