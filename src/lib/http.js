import axios from 'axios';

import { API_BASE_URL, ENDPOINTS } from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { triggerSessionExpiry } from '@/store/sessionStore';
import { logger } from '@/core/utils/logger';

const log = logger.child('api');

const DEFAULT_TIMEOUT_MS = 60_000;
const SLOW_THRESHOLD_MS = 3_000;

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
]);

function newRequestId() {
  return Math.random().toString(36).slice(2, 9);
}

function fullUrl(config) {
  return `${config.baseURL ?? ''}${config.url ?? ''}`;
}

/** Rút gọn payload để log - che giá trị nhạy cảm. */
function sanitise(data) {
  if (data === null || data === undefined || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitise);

  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '***' : sanitise(value);
  }
  return out;
}

/**
 * Lấy message lỗi từ envelope `ApiResponse`:
 * ưu tiên `message`, sau đó ghép các lỗi validation (`errors`).
 */
function extractErrorMessage(body, fallback = 'Yêu cầu thất bại') {
  if (body && typeof body === 'object') {
    const { message, errors } = body;
    if (typeof message === 'string' && message.trim() !== '') return message;

    if (errors && typeof errors === 'object') {
      const first = Object.values(errors)
        .flat()
        .find((v) => typeof v === 'string');
      if (first) return first;
    }
  }
  return fallback;
}

/** Envelope REST API */
function isEnvelope(body) {
  return Boolean(body) && typeof body === 'object' && !Array.isArray(body) && 'success' in body;
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/** @type {Promise<string|null>|null} */
let refreshPromise = null;

/** Xoá phiên local + mở dialog "phiên đã hết hạn". */
function forceLogout() {
  useAuthStore.getState().logout();
  triggerSessionExpiry();
}

/**
 * Làm mới access token từ refresh token.
 * Single-flight: nhiều request 401 cùng lúc chỉ gọi refresh một lần.
 */
function refreshAccessToken() {
  const { refreshToken, user } = useAuthStore.getState();
  if (!refreshToken) return Promise.resolve(null);

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post(ENDPOINTS.auth.refresh, { refreshToken })
      .then((response) => {
        const body = response.data;
        const data = isEnvelope(body) ? body.data : body;
        const token = data?.accessToken;
        if (typeof token !== 'string' || token.trim() === '') return null;

        useAuthStore.getState().login({
          token,
          refreshToken: data.refreshToken ?? refreshToken,
          expiresAt: data.expiresAt ?? null,
          user,
        });
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const requestId = newRequestId();
  config.metadata = { requestId, startedAt: Date.now() };

  log.debug('request', {
    requestId,
    method: (config.method ?? 'get').toUpperCase(),
    url: fullUrl(config),
    params: sanitise(config.params),
    body: sanitise(config.data),
  });

  return config;
});

http.interceptors.response.use(
  (response) => {
    const { requestId = '?', startedAt = Date.now() } = response.config?.metadata ?? {};
    const duration = Date.now() - startedAt;
    const body = response.data;

    if (isEnvelope(body)) {
      if (body.success === false) {
        return Promise.reject(
          buildError(extractErrorMessage(body, 'Yêu cầu thất bại'), {
            status: response.status,
            traceId: body.traceId,
            errors: body.errors,
            requestId,
          })
        );
      }

      logResponse(requestId, response, duration, body.traceId);
      return body.data;
    }

    logResponse(requestId, response, duration);
    return body;
  },
  (error) => {
    const config = error.config ?? {};
    const { requestId = '?', startedAt = Date.now() } = config.metadata ?? {};
    const duration = Date.now() - startedAt;
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const isAuthEndpoint = String(config.url ?? '').includes('/auth/');

    const message =
      extractErrorMessage(body, '') ||
      (status === 0 ? 'Không kết nối được tới máy chủ' : error.message);

    const apiError = buildError(message, {
      status,
      traceId: body?.traceId,
      errors: body?.errors,
      requestId,
    });

    // Access token hết hạn -> làm mới một lần rồi gọi lại request gốc
    if (status === 401 && !isAuthEndpoint && !config._retried) {
      config._retried = true;
      return refreshAccessToken().then((token) => {
        if (!token) {
          forceLogout();
          return Promise.reject(apiError);
        }
        return http(config);
      });
    }

    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      forceLogout();
    }

    log.warn('error', {
      requestId,
      method: (config.method ?? 'get').toUpperCase(),
      url: fullUrl(config),
      status,
      duration,
      traceId: body?.traceId,
      message,
    });

    return Promise.reject(apiError);
  }
);

function buildError(message, { status, traceId, errors, requestId }) {
  const error = new Error(message);
  error.status = status;
  error.traceId = traceId ?? undefined;
  error.errors = errors ?? undefined;
  error.requestId = requestId;
  return error;
}

function logResponse(requestId, response, duration, traceId) {
  const event = duration > SLOW_THRESHOLD_MS ? 'slow' : 'response';
  const level = duration > SLOW_THRESHOLD_MS ? 'warn' : 'info';

  log[level](event, {
    requestId,
    status: response.status,
    duration,
    traceId,
    url: fullUrl(response.config ?? {}),
  });
}

export { API_BASE_URL };
