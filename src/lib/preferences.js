import { storage } from './storage';

/**
 * Đọc một lựa chọn đã lưu.
 *
 * @param {string} key     tên không có tiền tố, ví dụ `'chart-layout'`
 * @param {string[]} allowed các giá trị hợp lệ; giá trị ngoài danh sách bị bỏ
 * @param {string} fallback khi chưa lưu, lưu sai, hoặc không đọc được
 * @returns {string}
 */
export function readPreference(key, allowed, fallback) {
  const stored = storage.getItem(key);
  if (stored !== null && allowed.includes(stored)) return stored;
  return fallback;
}

/**
 * Ghi một lựa chọn. Không ném lỗi: không lưu được thì phiên hiện tại vẫn chạy
 * bình thường, chỉ là lần sau không nhớ.
 */
export function writePreference(key, value) {
  storage.setItem(key, value);
}
