import { useState, useCallback, useEffect } from 'react';
import { DASHBOARD_CONFIG } from '@/features/production-dashboard/utils/dashboardConfig';

const PROCESS_DEFAULTS = {
  SMT: 50,
  DIP: 150,
  FA: 300,
};

// Xử dụng phục vụ cho ngưỡng cảnh báo trên quy trình của từng công đoạn
export function getDefaultWipLimit(process) {
  const key = String(process || '')
    .trim()
    .toUpperCase();
  return PROCESS_DEFAULTS[key] ?? DASHBOARD_CONFIG.wipLimit ?? 300;
}

export function useWipLimit(process = 'FA') {
  const defaultLimit = getDefaultWipLimit(process);
  const storageKey = `sfcs-wip-limit-${String(process || 'all').toLowerCase()}`;

  const [wipLimit, setWipLimitState] = useState(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? localStorage.getItem(storageKey) || localStorage.getItem('sfcs-wip-limit')
          : null;
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return defaultLimit;
  });

  // Khi chuyển đổi giữa các phân xưởng (SMT/DIP/FA), nạp lại cấu hình tương ứng
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            setWipLimitState(parsed);
            return;
          }
        }
      }
    } catch {
      // ignore
    }
    setWipLimitState(getDefaultWipLimit(process));
  }, [process, storageKey]);

  const updateWipLimit = useCallback(
    (newLimit) => {
      const val = parseInt(newLimit, 10);
      if (Number.isFinite(val) && val > 0) {
        setWipLimitState(val);
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, String(val));
            localStorage.setItem('sfcs-wip-limit', String(val));
          }
        } catch {
          // ignore
        }
      }
    },
    [storageKey]
  );

  const resetWipLimit = useCallback(() => {
    const val = getDefaultWipLimit(process);
    setWipLimitState(val);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore
    }
  }, [process, storageKey]);

  return {
    wipLimit,
    updateWipLimit,
    resetWipLimit,
    defaultLimit,
  };
}
