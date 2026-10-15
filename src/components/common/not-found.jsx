import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react';

import { ErrorPrimaryButton, ErrorScreen } from './error-screen';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      icon={SearchX}
      code="404"
      title={t('error.notFoundTitle')}
      message={t('error.notFoundDescription')}
      actions={<ErrorPrimaryButton to="/overview">{t('error.backToOverview')}</ErrorPrimaryButton>}
    />
  );
}
