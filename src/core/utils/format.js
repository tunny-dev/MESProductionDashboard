import { i18n } from '@/core/i18n/i18n';

export const EMPTY_DASH = '—';

function getLocale() {
  const code = i18n.language ?? 'vi';
  return code === 'zh' ? 'zh-CN' : code;
}

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_DASH;
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatInt(value) {
  if (value === null || value === undefined) return EMPTY_DASH;
  return formatNumber(Math.round(value), 0);
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return EMPTY_DASH;
  const rounded = Number(value.toFixed(decimals));
  const hasFraction = Math.abs(rounded % 1) > 0;
  return `${formatNumber(hasFraction ? Number(value.toFixed(decimals)) : rounded, hasFraction ? decimals : 0)}%`;
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return EMPTY_DASH;
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatClock(date) {
  if (!date) return EMPTY_DASH;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatClockSeconds(date) {
  if (!date) return EMPTY_DASH;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export function formatDate(date) {
  if (!date) return EMPTY_DASH;
  const d = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `${d}/${date.getFullYear()}`;
}

export function formatListDate(date, now = new Date()) {
  if (!date) return EMPTY_DASH;
  const day = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day}/${date.getFullYear()}`;
}

export function truncateText(text, maxChars = 24) {
  if (!text) return '';
  const str = String(text);
  return str.length > maxChars ? `${str.slice(0, maxChars)}…` : str;
}
