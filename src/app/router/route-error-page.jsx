import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  ErrorBackButton,
  ErrorCodeDetail,
  ErrorGhostButton,
  ErrorPrimaryButton,
  ErrorScreen,
} from '@/components/common/error-screen';

function readErrorCode(error) {
  if (isRouteErrorResponse(error)) return String(error.status);
  if (error instanceof Error && error.message) return error.message;
  return '';
}

function errorStatus(error) {
  return isRouteErrorResponse(error) ? error.status : 500;
}

export function RouteErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();

  const isNotFound = errorStatus(error) === 404;

  return (
    <ErrorScreen
      code={isNotFound ? '404' : undefined}
      title={isNotFound ? t('error.notFoundTitle') : t('error.routeFailedTitle')}
      message={isNotFound ? t('error.notFoundDescription') : t('error.routeFailedDescription')}
      detail={isNotFound ? undefined : <ErrorCodeDetail value={readErrorCode(error)} />}
      actions={
        isNotFound ? (
          <>
            <ErrorPrimaryButton to="/overview">{t('error.backToOverview')}</ErrorPrimaryButton>
            <ErrorBackButton />
          </>
        ) : (
          <>
            <ErrorPrimaryButton onClick={() => window.location.reload()}>
              {t('error.reloadPage')}
            </ErrorPrimaryButton>
            <ErrorGhostButton to="/overview">{t('error.backToOverview')}</ErrorGhostButton>
            <ErrorBackButton />
          </>
        )
      }
    />
  );
}

export function FullscreenRouteErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();

  const isNotFound = errorStatus(error) === 404;
  const code = readErrorCode(error);

  return (
    <ErrorScreen
      code={isNotFound ? '404' : undefined}
      title={isNotFound ? t('error.notFoundTitle') : t('error.routeFailedTitle')}
      message={isNotFound ? t('error.notFoundDescription') : t('error.routeFailedDescription')}
      detail={isNotFound ? undefined : <ErrorCodeDetail value={code} />}
      actions={
        isNotFound ? (
          <ErrorPrimaryButton to="/production-dashboard">
            {t('error.backToOverview')}
          </ErrorPrimaryButton>
        ) : (
          <>
            <ErrorPrimaryButton onClick={() => window.location.reload()}>
              {t('error.reloadPage')}
            </ErrorPrimaryButton>
            <ErrorGhostButton to="/production-dashboard">
              {t('error.backToOverview')}
            </ErrorGhostButton>
          </>
        )
      }
    />
  );
}
