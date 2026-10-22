/**
 * Dịch nhãn trạng thái.
 *
 * `status-map.js` là file thuần, không import React — nên nó không thể tự gọi
 * `useTranslation`. Hàm này là cầu nối: component gọi `statusText(status)` và
 * nhận về chuỗi theo ngôn ngữ đang chọn.
 *
 * Dùng `labelKey` làm khoá, không phải `key` của trạng thái: `key` là khoá kỹ
 * thuật (đổi nó thì logic lọc hỏng), còn `labelKey` là khoá bản dịch.
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { LINE_STATUS } from './status-map';

/**
 * @returns {(status: object) => string} hàm dịch nhãn trạng thái
 */
export function useStatusLabel() {
  const { t } = useTranslation();

  return useCallback(
    (status) => (status?.labelKey ? t(status.labelKey) : (status?.label ?? '')),
    [t]
  );
}

/**
 * Nhãn trạng thái kèm số phút dừng — dạng "Dừng 12 phút".
 *
 * Chỉ dùng khi trạng thái là `stopped` và có số phút; các trạng thái khác trả
 * về nhãn thường. Tách riêng vì chỉ màn TV và bảng trạng thái mới cần phần
 * "số phút", còn badge nhỏ thì không.
 */
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

/** Trạng thái mà người xem cần đếm nhanh — dùng cho KPI và dải trên TV. */
export const STATUS_KEYS = Object.keys(LINE_STATUS);
