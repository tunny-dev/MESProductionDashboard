import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@/core/i18n/i18n';
import { queryClient } from '@/core/api/queryClient';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toaster } from '@/components/ui/toast';
import { SessionExpiredDialog } from '@/components/common/SessionExpiredDialog';
import { router } from '@/core/router/AppRouter';
import { APP_CONFIG } from '@/constants/appConfig';

export function App() {
  useEffect(() => {
    if (APP_CONFIG.title) {
      document.title = APP_CONFIG.title;
    }
  }, []);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={router} />
          <SessionExpiredDialog />
        </I18nextProvider>
        <Toaster />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
