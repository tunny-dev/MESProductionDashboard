import axios from 'axios';

import { useAuthStore } from '@/store/auth-store';
import { triggerSessionExpiry } from '@/store/session-store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status ?? 0;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if ((status === 401 || status === 403) && !isLoginRequest) {
      useAuthStore.getState().logout();
      triggerSessionExpiry();
    }

    error.status = status;
    error.message =
      error.response?.data?.message ??
      (status === 0 ? 'Không kết nối được tới máy chủ' : error.message);
    return Promise.reject(error);
  }
);
