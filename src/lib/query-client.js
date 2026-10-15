import { QueryCache, QueryClient } from '@tanstack/react-query';

import { i18n } from '@/i18n';
import { toast } from '@/components/ui/toast';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) {
        toast.add({
          title: i18n.t('toast.dataLost'),
          type: 'error',
          id: 'production-refetch-error',
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (failureCount, error) => {
        const status = error?.status ?? error?.response?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
