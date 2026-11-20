import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

import { ErrorGhostButton, ErrorPrimaryButton, ErrorScreen } from '@/components/common/ErrorScreen';

export function DataDownScreen({ onRetry }) {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      title={t('error.loadFailed')}
      message={t('error.networkLost')}
      actions={
        <>
          <ErrorPrimaryButton onClick={onRetry}>
            <RefreshCw aria-hidden className="size-4" />
            {t('error.retry')}
          </ErrorPrimaryButton>
          <ErrorGhostButton to="/overview">{t('error.backToOverview')}</ErrorGhostButton>
        </>
      }
    />
  );
}
