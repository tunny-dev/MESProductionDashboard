import { useEffect, useState } from 'react';

/**
 * Đồng hồ cập nhật mỗi giây.
 *
 * Chỉ dùng cho mốc thời gian tương đối ("Cập nhật lúc 08:12:05") và đồng hồ lớn
 * trên TV. Dữ liệu sản lượng không dựa vào hook này: nó tới từ polling.
 */
export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
