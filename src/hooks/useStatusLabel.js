import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LINE_STATUS } from '@/features/overview/utils/statusMap';

/** Hook chuyển đổi object trạng thái sang nhãn văn bản đa ngôn ngữ. */
export function useStatusLabel() {
  const { t } = useTranslation();

  return useCallback(
    (status) => (status?.labelKey ? t(status.labelKey) : (status?.label ?? '')),
    [t]
  );
}

/** Hook lấy nhãn trạng thái, kèm số phút nếu chuyền đang dừng (VD: "Dừng 12 phút"). */
export function useStatusLabelWithStop() {
  const { t } = useTranslation();

  return useCallback(
    (status) => {
      if (status?.key === 'stopped' && status.minutesStopped) {
        return t('status.stoppedMinutes', { minutes: status.minutesStopped });
      }
      return status?.labelKey ? t(status.labelKey) : (status?.label ?? '');
    },
    [t]
  );
}

/** Danh sách mã trạng thái hỗ trợ hiển thị trên KPI/Bảng chuyền. */
export const STATUS_KEYS = Object.keys(LINE_STATUS);
