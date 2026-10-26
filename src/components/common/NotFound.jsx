import { useTranslation } from 'react-i18next';

import { ErrorBackButton, ErrorPrimaryButton, ErrorScreen } from './ErrorScreen';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <ErrorScreen
      code="404"
      title={t('error.notFoundTitle')}
      message={t('error.notFoundDescription')}
      actions={
        <>
          <ErrorPrimaryButton to="/overview">{t('error.backToOverview')}</ErrorPrimaryButton>
          <ErrorBackButton />
        </>
      }
    />
  );
}
