import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Số lần fetch thất bại LIÊN TIẾP thì coi như mất kết nối hẳn.
 * Mỗi kỳ polling (mặc định 10s) tính 1 lần — 5 lần ≈ 50s mất mạng.
 */
export const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Đếm số lần fetch thất bại liên tiếp của một React Query.
 *
 * @param failureReason  `failureReason` từ useQuery — object Error mới mỗi lần
 *                       fetch hỏng, `null` khi fetch thành công.
 * @returns {{ count: number, reset: () => void }}
 *   count — số lần hỏng liên tiếp; reset — xoá bộ đếm (dùng khi bấm Thử lại).
 *
 * Tự hồi phục: fetch thành công → failureReason về null → đếm về 0, trang tự
 * hiện lại mà không cần reload.
 */
export function useConsecutiveFailures(failureReason) {
  const [count, setCount] = useState(0);
  const seenRef = useRef(null);

  const reset = useCallback(() => {
    seenRef.current = null;
    setCount(0);
  }, []);

  useEffect(() => {
    if (!failureReason) {
      if (seenRef.current !== null) {
        seenRef.current = null;
        setCount(0);
      }
      return;
    }
    if (failureReason !== seenRef.current) {
      seenRef.current = failureReason;
      setCount((c) => c + 1);
    }
  }, [failureReason]);

  return { count, reset };
}
