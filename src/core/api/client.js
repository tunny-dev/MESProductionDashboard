import axios from 'axios';

import { useAuthStore } from '@/store/authStore';
import { triggerSessionExpiry } from '@/store/sessionStore';
import { logger } from '@/core/utils/logger';

const log = logger.child('api');

const DEFAULT_TIMEOUT_MS = 30_000;

export const http = axios.create({
  baseURL: '',
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  log.debug('request', { method: (config.method ?? 'get').toUpperCase(), url: config.url });
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status ?? 0;
    const isLoginRequest = /\/MES\/auth/i.test(String(error.config?.url ?? ''));

    if ((status === 401 || status === 403) && !isLoginRequest) {
      useAuthStore.getState().logout();
      triggerSessionExpiry();
    }

    error.status = status;
    error.message =
      error.response?.data?.message ??
      (status === 0 ? 'Không kết nối được tới dịch vụ xác thực MES' : error.message);

    log.warn('error', { url: error.config?.url, status, message: error.message });
    return Promise.reject(error);
  }
);
