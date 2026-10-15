import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@/i18n';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toast';
import { SessionExpiredDialog } from '@/components/common/session-expired-dialog';
import { queryClient } from '@/lib/query-client';

export function AppProviders({ children }) {
  const [client] = useState(() => queryClient);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={i18n}>
          {children}
          <SessionExpiredDialog />
        </I18nextProvider>
        <Toaster />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
