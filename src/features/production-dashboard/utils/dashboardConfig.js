export const SHIFT_CODES = { day: '1', night: '2', full: '3' };

export const DASHBOARD_CONFIG = {
  refreshIntervalSec: 300,
  requestTimeoutSec: 10,
  wipLimit: 300,
  autoRotate: { enabled: false, intervalSec: 20 },
  achievementThreshold: { green: 95, yellow: 90 },
  processes: ['SMT', 'DIP', 'FA'],
  shifts: [
    {
      id: 'day',
      labelKey: 'dayShift',
      startMinute: 480,
      endMinute: 1200,
      slots: [
        { id: 'T1', label: '08-10', startMinute: 480, endMinute: 600 },
        { id: 'T2', label: '10-12', startMinute: 600, endMinute: 720 },
        { id: 'T3', label: '12-14', startMinute: 720, endMinute: 840 },
        { id: 'T4', label: '14-16', startMinute: 840, endMinute: 960 },
        { id: 'T5', label: '16-18', startMinute: 960, endMinute: 1080 },
        { id: 'T6', label: '18-20', startMinute: 1080, endMinute: 1200 },
      ],
    },
    {
      id: 'night',
      labelKey: 'nightShift',
      startMinute: 1200,
      endMinute: 1920,
      slots: [
        { id: 'N1', label: '20-22', startMinute: 1200, endMinute: 1320 },
        { id: 'N2', label: '22-00', startMinute: 1320, endMinute: 1440 },
        { id: 'N3', label: '00-02', startMinute: 1440, endMinute: 1560 },
        { id: 'N4', label: '02-04', startMinute: 1560, endMinute: 1680 },
        { id: 'N5', label: '04-06', startMinute: 1680, endMinute: 1800 },
        { id: 'N6', label: '06-08', startMinute: 1800, endMinute: 1920 },
      ],
    },
  ],
  themeStyle: {
    '--background': '#070f1e',
    '--surface': '#0c1a30',
    '--surface-overlay': '#10223d',
    '--surface-hover': '#152b4c',
    '--foreground': '#f8fafc',
    '--muted': '#0f2038',
    '--muted-foreground': '#94a3b8',
    '--card': '#0b182d',
    '--card-foreground': '#f8fafc',
    '--popover': '#0f2038',
    '--popover-foreground': '#f8fafc',
    '--border': '#183050',
    '--border-strong': '#244570',
    '--border-focus': '#38bdf8',
    '--ring-focus': 'rgb(56 189 248 / 0.25)',
    '--primary': '#38bdf8',
    '--primary-foreground': '#070f1e',
    '--primary-hover': '#7dd3fc',
    '--success': '#34d399',
    '--success-text': '#6ee7b7',
    '--success-bg': 'rgb(52 211 153 / 0.15)',
    '--warning': '#fbbf24',
    '--warning-text': '#fde68a',
    '--warning-bg': 'rgb(251 191 36 / 0.15)',
    '--danger': '#f87171',
    '--danger-text': '#fca5a5',
    '--danger-bg': 'rgb(248 113 113 / 0.15)',
    '--production-blue': '#38bdf8',
    '--production-green': '#34d399',
    '--production-violet': '#c084fc',
    '--production-amber': '#fbbf24',
    '--chart-1': '#38bdf8',
    '--chart-2': '#34d399',
    '--chart-3': '#fbbf24',
    '--chart-4': '#c084fc',
    '--chart-5': '#f87171',
    '--production-blue-glow': 'rgb(56 189 248 / 0.15)',
    '--production-green-glow': 'rgb(52 211 153 / 0.15)',
    '--production-violet-glow': 'rgb(192 132 252 / 0.15)',
    '--production-amber-glow': 'rgb(251 191 36 / 0.15)',
  },
};

/**
 * Bộ khung đang dùng theo ca (6 slot 2 tiếng).
 * Mọi phần tử đều mang `slotIx` (vị trí gốc 0..5 trong SQL) để normalizer ánh
 * xạ dòng SQL → khung hiển thị.
 */
export function getActiveSlots({ shift } = {}) {
  return (shift?.slots ?? []).map((slot, index) => ({ ...slot, slotIx: index }));
}

export function getModelProfile(lineConfig, model) {
  return model === 'ALL' ? null : lineConfig.modelProfiles?.[model] || null;
}

export function getModelStations(lineConfig, model) {
  const stationIds = getModelProfile(lineConfig, model)?.stationIds;
  if (!Array.isArray(stationIds)) return lineConfig.stations;

  const selectedIds = new Set(stationIds);
  return lineConfig.stations.filter((station) => selectedIds.has(station.id));
}

export function getStationTargetUph(lineConfig, model, stationId) {
  const profile = getModelProfile(lineConfig, model);
  if (!profile) return undefined;
  if (profile.uphAvailable === false) return null;

  const stationTargets = profile.targetUphByStation || {};
  return Object.hasOwn(stationTargets, stationId) ? stationTargets[stationId] : profile.targetUph;
}

const DASHBOARD_THEME_STYLES = {
  dark: {
    '--background': '#070f1e',
    '--surface': '#0c1a30',
    '--surface-overlay': '#10223d',
    '--surface-hover': '#152b4c',
    '--foreground': '#f8fafc',
    '--muted': '#0f2038',
    '--muted-foreground': '#94a3b8',
    '--card': '#0b182d',
    '--card-foreground': '#f8fafc',
    '--popover': '#0f2038',
    '--popover-foreground': '#f8fafc',
    '--border': '#183050',
    '--border-strong': '#244570',
    '--border-focus': '#38bdf8',
    '--ring-focus': 'rgb(56 189 248 / 0.25)',
    '--primary': '#38bdf8',
    '--primary-foreground': '#070f1e',
    '--primary-hover': '#7dd3fc',
    '--success': '#34d399',
    '--success-text': '#6ee7b7',
    '--success-bg': 'rgb(52 211 153 / 0.15)',
    '--warning': '#fbbf24',
    '--warning-text': '#fde68a',
    '--warning-bg': 'rgb(251 191 36 / 0.15)',
    '--danger': '#f87171',
    '--danger-text': '#fca5a5',
    '--danger-bg': 'rgb(248 113 113 / 0.15)',
    '--neutral-bg': '#1e293b',
    '--neutral': '#94a3b8',
    '--neutral-text': '#cbd5e1',
    '--production-blue': '#38bdf8',
    '--production-green': '#34d399',
    '--production-violet': '#c084fc',
    '--production-amber': '#fbbf24',
    '--chart-1': '#38bdf8',
    '--chart-2': '#34d399',
    '--chart-3': '#fbbf24',
    '--chart-4': '#c084fc',
    '--chart-5': '#f87171',
    '--production-blue-glow': 'rgb(56 189 248 / 0.15)',
    '--production-green-glow': 'rgb(52 211 153 / 0.15)',
    '--production-violet-glow': 'rgb(192 132 252 / 0.15)',
    '--production-amber-glow': 'rgb(251 191 36 / 0.15)',
    colorScheme: 'dark',
  },
  light: {
    '--background': '#f1f5f9',
    '--surface': '#ffffff',
    '--surface-overlay': '#f8fafc',
    '--surface-hover': '#f1f5f9',
    '--foreground': '#0f172a',
    '--muted': '#f1f5f9',
    '--muted-foreground': '#64748b',
    '--card': '#ffffff',
    '--card-foreground': '#0f172a',
    '--popover': '#ffffff',
    '--popover-foreground': '#0f172a',
    '--border': '#e2e8f0',
    '--border-strong': '#cbd5e1',
    '--border-focus': '#0284c7',
    '--ring-focus': 'rgb(2 132 199 / 0.16)',
    '--primary': '#0284c7',
    '--primary-foreground': '#ffffff',
    '--primary-hover': '#0369a1',
    '--success': '#10b981',
    '--success-text': '#047857',
    '--success-bg': '#ecfdf5',
    '--warning': '#f59e0b',
    '--warning-text': '#b45309',
    '--warning-bg': '#fffbeb',
    '--danger': '#ef4444',
    '--danger-text': '#b91c1c',
    '--danger-bg': '#fef2f2',
    '--neutral-bg': '#e2e8f0',
    '--neutral': '#64748b',
    '--neutral-text': '#334155',
    '--production-blue': '#0284c7',
    '--production-green': '#10b981',
    '--production-violet': '#8b5cf6',
    '--production-amber': '#f59e0b',
    '--chart-1': '#0284c7',
    '--chart-2': '#10b981',
    '--chart-3': '#f59e0b',
    '--chart-4': '#8b5cf6',
    '--chart-5': '#ef4444',
    '--production-blue-glow': 'rgb(2 132 199 / 0.12)',
    '--production-green-glow': 'rgb(16 185 129 / 0.12)',
    '--production-violet-glow': 'rgb(139 92 246 / 0.12)',
    '--production-amber-glow': 'rgb(245 158 11 / 0.12)',
    colorScheme: 'light',
  },
};

const THEME_STYLE_CACHE = new Map();

export function getDashboardThemeStyle(theme) {
  const themeName = theme === 'dark' ? 'dark' : 'light';
  const cached = THEME_STYLE_CACHE.get(themeName);
  if (cached) return cached;

  const style = DASHBOARD_THEME_STYLES[themeName];
  THEME_STYLE_CACHE.set(themeName, style);
  return style;
}
