import axios from 'axios';

import { MES_SYSTEMS, MES_DEFAULT_SYSTEM, mesInvokeUrl } from '@/config/api';
import { useAuthStore } from '@/store/auth-store';
import { triggerSessionExpiry } from '@/store/session-store';
import { logger } from '@/lib/logger';

/** Warn log khi request chậm hơn ngưỡng này. */
const SLOW_THRESHOLD_MS = 3_000;

/** Timeout mặc định; từng system có thể override qua system.timeout.
 * PHẢI nhỏ hơn chu kỳ polling (10s, xem DEFAULT_POLL_INTERVAL_MS): nếu timeout
 * dài hơn kỳ poll, kỳ sau sẽ hủy request đang bay trước khi nó kịp thất bại —
 * lỗi không bao giờ hiện hình, trang treo "Đang tải" mãi và bộ đếm 5 lần
 * hỏng liên tiếp (useConsecutiveFailures) không bao giờ chạy. */
const DEFAULT_TIMEOUT_MS = 8_000;

const log = logger.child('mes');

function newRequestId() {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Xoá giá trị rỗng khỏi params để URL sạch và React Query cache key chính xác.
 * @param {Record<string,unknown>|undefined} params
 * @returns {Record<string,unknown>|undefined}
 */
function cleanParams(params) {
  if (!params) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Sanitise params trước khi đưa vào log — che giá trị nhạy cảm.
 * Thêm key vào SENSITIVE_KEYS nếu cần.
 */
const SENSITIVE_KEYS = new Set(['password', 'token', 'P_PASSWORD', 'P_TOKEN', 'P_SECRET']);

function sanitiseForLog(params) {
  if (!params || typeof params !== 'object') return params;
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => (SENSITIVE_KEYS.has(k) ? [k, '***'] : [k, v]))
  );
}

/**
 * Phát hiện lỗi business trong payload.
 * MES invoke không dùng HTTP error code — lỗi nằm trong body:
 *   - Dạng mảng:  `[ { error: "message" } ]`
 *   - Dạng bọc:   `{ success: false, message: "..." }` hoặc `{ error: "..." }`
 *
 * @param {unknown} data
 * @returns {string|null} message nếu là lỗi, null nếu OK.
 */
function extractMesError(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    const first = data[0];
    if (typeof first !== 'object' || first === null) return null;
    return first.error ?? first.ERROR ?? first.message ?? first.MESSAGE ?? null;
  }
  if (data && typeof data === 'object') {
    // `{ success: true, message: "Success", data: [...] }` KHÔNG phải lỗi —
    // phải kiểm tra cờ success trước khi đọc message.
    if (data.success === true) return null;
    if (data.success === false) {
      return data.message ?? data.MESSAGE ?? data.error ?? data.ERROR ?? 'Request failed';
    }
    return data.error ?? data.ERROR ?? null;
  }
  return null;
}

/**
 * Lấy config của một system, throw rõ ràng nếu systemId không tồn tại.
 * @param {string} systemId
 */
function resolveSystem(systemId) {
  const system = MES_SYSTEMS[systemId];
  if (!system) {
    throw new Error(
      `[mes-http] Unknown systemId "${systemId}". ` +
        `Registered systems: ${Object.keys(MES_SYSTEMS).join(', ')}. ` +
        `Add it to MES_SYSTEMS in src/config/api.js.`
    );
  }
  return system;
}

/**
 * Tạo một axios instance đã cấu hình đầy đủ cho một MES system.
 * Không gọi trực tiếp — dùng qua `getClient(systemId)`.
 *
 * @param {{ id: string, baseUrl: string, invokeN: number, label: string, timeout?: number }} system
 * @returns {import('axios').AxiosInstance}
 */
function createMesClient(system) {
  const instance = axios.create({
    baseURL: system.baseUrl,
    timeout: system.timeout ?? DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    validateStatus: (status) => status < 500,
  });

  instance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const requestId = newRequestId();
    config.metadata = { requestId, startTime: Date.now() };

    const sCode = config.params?.sCode ?? '(unknown)';
    const paramsWithoutSCode =
      typeof config.params === 'object' ? { ...config.params, sCode: undefined } : {};

    log.debug('request', {
      requestId,
      system: system.label,
      method: config.method?.toUpperCase(),
      url: `${system.baseUrl}${config.url ?? ''}`,
      sCode,
      params: sanitiseForLog(paramsWithoutSCode),
      bodyKeys: config.data && typeof config.data === 'object' ? Object.keys(config.data) : [],
    });

    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const { requestId, startTime } = response.config.metadata ?? {};
      const duration = startTime ? Date.now() - startTime : null;
      const data = response.data;
      const rowCount = Array.isArray(data) ? data.length : null;
      const sCode = response.config.params?.sCode ?? '(unknown)';

      if (response.status === 401 || response.status === 403) {
        log.warn('auth-error', { requestId, system: system.label, sCode, status: response.status });
        useAuthStore.getState().logout();
        triggerSessionExpiry();
        const error = new Error('Unauthorized');
        error.status = response.status;
        error.requestId = requestId;
        error.systemId = system.id;
        return Promise.reject(error);
      }

      // Slow request warning
      if (duration !== null && duration > SLOW_THRESHOLD_MS) {
        log.warn('slow', { requestId, system: system.label, sCode, duration, rowCount });
      } else {
        log.info('response', {
          requestId,
          system: system.label,
          sCode,
          status: response.status,
          duration,
          rowCount,
        });
      }

      // Phát hiện lỗi business trong payload
      const mesError = extractMesError(data);
      if (mesError) {
        log.warn('business-error', {
          requestId,
          system: system.label,
          sCode,
          message: mesError,
        });
        const error = new Error(mesError);
        error.status = response.status;
        error.requestId = requestId;
        error.systemId = system.id;
        error.isMesBusinessError = true;
        return Promise.reject(error);
      }

      // Trả thẳng List<Map> cho tầng gọi
      return data;
    },
    (error) => {
      const { requestId, startTime } = error.config?.metadata ?? {};
      const duration = startTime ? Date.now() - startTime : null;
      const sCode = error.config?.params?.sCode ?? '(unknown)';
      const status = error.response?.status ?? 0;
      const timedOut = error.name === 'AbortError' || error.code === 'ECONNABORTED';

      log.error('error', {
        requestId,
        system: system.label,
        sCode,
        status,
        duration,
        code: error.code,
        message:
          error.response?.data?.message ??
          (timedOut
            ? `Timeout sau ${system.timeout ?? DEFAULT_TIMEOUT_MS}ms`
            : status === 0
              ? `Không kết nối được tới ${system.label} (${system.baseUrl})`
              : error.message),
      });

      // Chuẩn hoá để tầng trên xử lý đồng nhất dù dùng system nào
      error.status = status;
      error.requestId = requestId;
      error.systemId = system.id;
      error.message =
        error.response?.data?.message ??
        (status === 0 ? `Không kết nối được tới ${system.label}` : error.message);

      // Token hết hạn hoặc bị từ chối — trigger dialog yêu cầu đăng nhập lại
      if (status === 401 || status === 403) {
        useAuthStore.getState().logout();
        triggerSessionExpiry();
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

const clientRegistry = new Map();

function getClient(systemId) {
  if (!clientRegistry.has(systemId)) {
    const system = resolveSystem(systemId);
    clientRegistry.set(systemId, createMesClient(system));
  }
  return clientRegistry.get(systemId);
}

export function resetClientRegistry(systemId) {
  if (systemId) {
    clientRegistry.delete(systemId);
  } else {
    clientRegistry.clear();
  }
}

export function mesGet(sCode, params, systemId = MES_DEFAULT_SYSTEM, options = {}) {
  const system = resolveSystem(systemId);
  const invokeN = options.invokeN ?? system.invokeN;
  return getClient(systemId).get(mesInvokeUrl(invokeN, sCode), {
    params: cleanParams(params),
  });
}

export function mesPost(sCode, body, systemId = MES_DEFAULT_SYSTEM, options = {}) {
  const system = resolveSystem(systemId);
  const invokeN = options.invokeN ?? system.invokeN;
  return getClient(systemId).post(mesInvokeUrl(invokeN, sCode), body ?? {});
}
