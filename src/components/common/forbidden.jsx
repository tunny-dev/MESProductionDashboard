import { useTranslation } from 'react-i18next';

import { ErrorPrimaryButton, ErrorScreen } from './error-screen';

export function Forbidden() {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      code="403"
      title={t('error.forbiddenTitle')}
      message={t('error.forbiddenDescription')}
      actions={<ErrorPrimaryButton to="/">{t('nav.home')}</ErrorPrimaryButton>}
    />
  );
}
