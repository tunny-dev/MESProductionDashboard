import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { login, logout as apiLogout } from '@/features/auth/api/auth';
import { useAuthStore } from '@/store/auth-store';

export function useLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeLogin = useAuthStore((state) => state.login);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      storeLogin(session);
      navigate(searchParams.get('back') ?? '/', { replace: true });
    },
  });

  const errorMessage = mutation.error
    ? (() => {
        const status = mutation.error?.status ?? 0;
        if (status === 401 || status === 403) return t('auth.wrongCredentials');
        if (status === 504) return t('auth.loginTimeout');
        if (status === 0) return t('auth.loginUnavailable');
        return mutation.error?.message ?? t('auth.loginUnavailable');
      })()
    : '';

  return { ...mutation, errorMessage };
}

export function useLogout() {
  const storeLogout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState();

      try {
        await apiLogout(refreshToken);
      } catch {
        /* bỏ qua */
      }

      storeLogout();
    },
    onSuccess: () => {
      window.location.assign('/login');
    },
  });
}
