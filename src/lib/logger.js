const LEVEL_RANK = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

function resolveDefaultLevel() {
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LEVEL_RANK) return envLevel;
  return import.meta.env.DEV ? 'debug' : 'info';
}

/**
 * Tạo entry JSON có cấu trúc.
 *
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} event   Tên sự kiện dạng `namespace:action`, ví dụ `mes:request`.
 * @param {object} [data]  Payload tuỳ chọn — không bao giờ đặt password/token vào đây.
 */
function buildEntry(level, event, data) {
  return {
    ts: new Date().toISOString(),
    level,
    event,
    ...(data !== undefined && data !== null ? { data } : {}),
  };
}

const CONSOLE_METHOD = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

class Logger {
  #level;

  constructor(level = resolveDefaultLevel()) {
    this.#level = level;
  }

  /** Thay đổi level tối thiểu tại runtime (dùng trong test hoặc DevTools). */
  setLevel(level) {
    if (!(level in LEVEL_RANK)) {
      console.warn(`[logger] Unknown level "${level}", ignored.`);
      return;
    }
    this.#level = level;
  }

  getLevel() {
    return this.#level;
  }

  /** @param {string} event @param {object} [data] */
  debug(event, data) {
    this.#write('debug', event, data);
  }

  /** @param {string} event @param {object} [data] */
  info(event, data) {
    this.#write('info', event, data);
  }

  /** @param {string} event @param {object} [data] */
  warn(event, data) {
    this.#write('warn', event, data);
  }

  /** @param {string} event @param {object} [data] */
  error(event, data) {
    this.#write('error', event, data);
  }

  /**
   * Tạo child logger với namespace cố định, tránh lặp prefix ở mọi dòng.
   *
   * @param {string} namespace  ví dụ 'mes', 'auth'
   * @returns {ChildLogger}
   *
   * @example
   *   const log = logger.child('mes')
   *   log.info('request', { url })   // event → 'mes:request'
   */
  child(namespace) {
    return new ChildLogger(this, namespace);
  }

  #write(level, event, data) {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.#level]) return;
    const entry = buildEntry(level, event, data);

    console[CONSOLE_METHOD[level]](`[${entry.ts}] ${level.toUpperCase()} ${event}`, entry);
  }
}

class ChildLogger {
  #parent;
  #ns;

  constructor(parent, namespace) {
    this.#parent = parent;
    this.#ns = namespace;
  }

  debug(event, data) {
    this.#parent.debug(`${this.#ns}:${event}`, data);
  }
  info(event, data) {
    this.#parent.info(`${this.#ns}:${event}`, data);
  }
  warn(event, data) {
    this.#parent.warn(`${this.#ns}:${event}`, data);
  }
  error(event, data) {
    this.#parent.error(`${this.#ns}:${event}`, data);
  }
}

export const logger = new Logger();
