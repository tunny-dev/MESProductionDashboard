import axios from 'axios';

import { MES_SYSTEMS, MES_DEFAULT_SYSTEM, mesInvokeUrl } from '@/config/api';
import { useAuthStore } from '@/store/auth-store';
import { triggerSessionExpiry } from '@/store/session-store';
import { logger } from '@/lib/logger';
import { unwrapList, unwrapObject } from '@/lib/unwrap-response';

const log = logger.child('mes');

const DEFAULT_TIMEOUT_MS = 30_000;
const SLOW_THRESHOLD_MS = 3_000;

function newRequestId() {
  return Math.random().toString(36).slice(2, 9);
}

export function buildMesUrl(system, invokeN, sCode) {
  return `${system.baseUrl ?? ''}${mesInvokeUrl(invokeN, sCode)}`;
}

function systemFromUrl(url) {
  const match = /\/MES\/invoke(\d+)\?sCode=([^&]+)/.exec(String(url ?? ''));
  return {
    invokeN: match ? match[1] : '?',
    sCode: match ? decodeURIComponent(match[2]) : '(unknown)',
  };
}

const SENSITIVE_KEYS = new Set(['password', 'token', 'accessToken', 'authorization', 'secret']);

function sanitiseForLog(params) {
  if (!params || typeof params !== 'object') return params;
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => (SENSITIVE_KEYS.has(k) ? [k, '***'] : [k, v]))
  );
}

function mesResultError(value) {
  if (typeof value !== 'object' || value === null) return null;
  const result = value.result ?? value.RESULT;
  if (typeof result === 'string' && result.startsWith('@NG-@')) {
    return result.slice('@NG-@'.length).trim() || 'Request failed';
  }
  return null;
}

/**
 * @param {unknown} data
 * @returns {string|null} message nếu là lỗi, null nếu OK.
 */
function extractMesError(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    const first = data[0];
    if (typeof first !== 'object' || first === null) return null;
    return (
      mesResultError(first) ?? first.error ?? first.ERROR ?? first.message ?? first.MESSAGE ?? null
    );
  }
  if (data && typeof data === 'object') {
    if (data.success === true) return null;
    if (data.success === false) {
      return data.message ?? data.MESSAGE ?? data.error ?? data.ERROR ?? 'Request failed';
    }

    const wrapped = mesResultError(data);
    if (wrapped) return wrapped;

    return data.error ?? data.ERROR ?? null;
  }
  return null;
}

const EMPTY_RESULT_PATTERN = /IndexOutOfBoundsException:\s*Index 0 out of bounds for length 0/i;

/** @param {string} systemId */
function resolveSystem(systemId) {
  const system = MES_SYSTEMS[systemId];
  if (!system) {
    throw new Error(
      `[mes-http] Không có systemId "${systemId}". ` +
        `Đã đăng ký: ${Object.keys(MES_SYSTEMS).join(', ')}. ` +
        'Bổ sung trong MES_SYSTEMS (src/config/api.js).'
    );
  }
  return system;
}

/**
 * @param {{ id: string, label: string, baseUrl?: string, invokeN?: number, timeout?: number }} system
 * @returns {import('axios').AxiosInstance}
 */
function createMesClient(system) {
  const instance = axios.create({
    baseURL: system.baseUrl || undefined,
    timeout: system.timeout ?? DEFAULT_TIMEOUT_MS,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    validateStatus: (status) => status < 500,
  });

  instance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const requestId = newRequestId();
    config.metadata = { requestId, startTime: Date.now() };

    const { sCode } = systemFromUrl(config.url);
    log.debug('request', {
      requestId,
      system: system.label,
      method: (config.method ?? 'post').toUpperCase(),
      url: buildMesUrl(system, system.invokeN ?? '?', sCode),
      sCode,
      body: sanitiseForLog(config.data),
    });

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const { requestId, startTime } = response.config.metadata ?? {};
      const duration = startTime ? Date.now() - startTime : null;
      const { sCode } = systemFromUrl(response.config.url);
      const data = response.data;
      const rowCount = Array.isArray(data) ? data.length : null;

      if (response.status === 401 || response.status === 403) {
        log.warn('auth-error', { requestId, sCode, status: response.status });
        useAuthStore.getState().logout();
        triggerSessionExpiry();
        const error = new Error('Phiên đăng nhập đã hết hạn');
        error.status = response.status;
        error.requestId = requestId;
        return Promise.reject(error);
      }

      const mesError = extractMesError(data);
      if (mesError) {
        if (EMPTY_RESULT_PATTERN.test(mesError)) {
          log.info('empty-result', { requestId, sCode });
          return [];
        }

        log.warn('business-error', { requestId, sCode, message: mesError });
        const error = new Error(mesError);
        error.status = response.status;
        error.requestId = requestId;
        error.sCode = sCode;
        error.isMesBusinessError = true;
        return Promise.reject(error);
      }

      if (duration !== null && duration > SLOW_THRESHOLD_MS) {
        log.warn('slow', { requestId, sCode, duration, rowCount });
      } else {
        log.info('response', { requestId, sCode, status: response.status, duration, rowCount });
      }

      return data;
    },
    (error) => {
      const { requestId, startTime } = error.config?.metadata ?? {};
      const duration = startTime ? Date.now() - startTime : null;
      const { sCode } = systemFromUrl(error.config?.url);
      const status = error.response?.status ?? 0;
      const timedOut = error.name === 'AbortError' || error.code === 'ECONNABORTED';

      const message =
        error.response?.data?.message ??
        (timedOut
          ? `Quá thời gian chờ (${system.timeout ?? DEFAULT_TIMEOUT_MS}ms)`
          : status === 0
            ? `Không kết nối được tới ${system.label}`
            : error.message);

      log.error('error', { requestId, sCode, status, duration, code: error.code, message });

      if (status === 401 || status === 403) {
        useAuthStore.getState().logout();
        triggerSessionExpiry();
      }

      error.status = status;
      error.requestId = requestId;
      error.sCode = sCode;
      error.message = message;
      return Promise.reject(error);
    }
  );

  return instance;
}

const clientRegistry = new Map();

function getClient(systemId) {
  if (!clientRegistry.has(systemId)) {
    clientRegistry.set(systemId, createMesClient(resolveSystem(systemId)));
  }
  return clientRegistry.get(systemId);
}

export function resetClientRegistry(systemId) {
  if (systemId) clientRegistry.delete(systemId);
  else clientRegistry.clear();
}

/**
 * Gọi MES invoke bằng POST
 * @param {string} sCode  sql_id trong SERVICE_SQL
 * @param {object} body   payload camelCase (key == tên tham số SP / :placeholder)
 * @param {string} [systemId]
 * @param {{ invokeN?: number }} [options]
 */
export function mesPost(sCode, body, systemId = MES_DEFAULT_SYSTEM, options = {}) {
  const system = resolveSystem(systemId);
  const invokeN = options.invokeN ?? system.invokeN;
  return getClient(systemId).post(mesInvokeUrl(invokeN, sCode), body ?? {});
}

/**
 * Như `mesPost` nhưng đã `unwrapList` — dùng cho mọi sCode trả DANH SÁCH.
 * Gần như toàn bộ API của app đi qua đây, thay vì lặp
 * `unwrapList(await mesPost(sCode, params, SYSTEM))` ở từng hàm.
 * @param {string} sCode  sql_id trong SERVICE_SQL
 * @param {object} [params] payload camelCase
 * @returns {Promise<object[]>}
 */
export async function mesRows(sCode, params, systemId = MES_DEFAULT_SYSTEM, options = {}) {
  return unwrapList(await mesPost(sCode, params, systemId, options));
}

/**
 * Như `mesPost` nhưng đã `unwrapObject` — dùng cho sCode trả ĐÚNG 1 dòng.
 * Không có dòng nào → `null`.
 * @param {string} sCode
 * @param {object} [params]
 * @returns {Promise<object|null>}
 */
export async function mesRow(sCode, params, systemId = MES_DEFAULT_SYSTEM, options = {}) {
  return unwrapObject(await mesPost(sCode, params, systemId, options));
}
