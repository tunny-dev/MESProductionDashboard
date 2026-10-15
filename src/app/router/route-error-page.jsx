import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleAlert, RefreshCw, SearchX } from 'lucide-react';

import {
  ErrorGhostButton,
  ErrorPrimaryButton,
  ErrorScreen,
} from '@/components/common/error-screen';

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <ErrorScreen
      icon={isNotFound ? SearchX : CircleAlert}
      code={isNotFound ? '404' : '500'}
      title={isNotFound ? t('error.notFoundTitle') : t('error.routeFailedTitle')}
      message={isNotFound ? t('error.notFoundDescription') : t('error.routeFailedDescription')}
      actions={
        <>
          {!isNotFound && (
            <ErrorGhostButton onClick={() => window.location.reload()}>
              <RefreshCw aria-hidden className="size-4" />
              {t('error.reloadPage')}
            </ErrorGhostButton>
          )}

          <ErrorPrimaryButton to="/overview">{t('error.backToOverview')}</ErrorPrimaryButton>

          {!isNotFound && (
            <ErrorGhostButton onClick={() => navigate(-1)}>{t('error.goBack')}</ErrorGhostButton>
          )}
        </>
      }
    />
  );
}

export function FullscreenRouteErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <ErrorScreen
      icon={isNotFound ? SearchX : CircleAlert}
      code={isNotFound ? '404' : '500'}
      title={isNotFound ? t('error.notFoundTitle') : t('error.routeFailedTitle')}
      message={isNotFound ? t('error.notFoundDescription') : t('error.routeFailedDescription')}
      actions={
        <ErrorPrimaryButton to="/production-dashboard">
          {t('error.backToOverview')}
        </ErrorPrimaryButton>
      }
    />
  );
}
