import { useEffect, useState } from 'react';

/**
 * Debounce một giá trị thay đổi liên tục (gõ phím trong ô tìm).
 * Chỉ cập nhật giá trị trả về sau khi người dùng ngừng gõ `delayMs` mili-giây.
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
