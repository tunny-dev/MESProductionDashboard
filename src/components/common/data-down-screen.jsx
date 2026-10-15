import { useTranslation } from 'react-i18next';
import { CircleAlert, RefreshCw } from 'lucide-react';

import { ErrorGhostButton, ErrorPrimaryButton, ErrorScreen } from './error-screen';

/**
 * Mất kết nối hẳn: snapshot hỏng N kỳ polling liên tiếp.
 * Dùng chung khung ErrorScreen toàn màn hình — khác lỗi inline (ListError,
 * LineError, ChartError) chỉ hiện khi hỏng lẻ tẻ và bấm Thử lại là xong.
 */
export function DataDownScreen({ onRetry }) {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      icon={CircleAlert}
      code="500"
      title={t('error.loadFailed')}
      message={t('error.networkLost')}
      actions={
        <>
          <ErrorGhostButton onClick={onRetry}>
            <RefreshCw aria-hidden className="size-4" />
            {t('error.retry')}
          </ErrorGhostButton>
          <ErrorPrimaryButton to="/overview">{t('error.backToOverview')}</ErrorPrimaryButton>
        </>
      }
    />
  );
}
