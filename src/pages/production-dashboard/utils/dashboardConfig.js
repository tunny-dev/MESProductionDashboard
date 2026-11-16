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
    '--background': '#07172c',
    '--surface': '#0c203b',
    '--surface-overlay': '#112947',
    '--surface-hover': '#153354',
    '--foreground': '#eef6ff',
    '--muted': '#142945',
    '--muted-foreground': '#a9bfd8',
    '--card': '#0b1d37',
    '--card-foreground': '#eef6ff',
    '--popover': '#102744',
    '--popover-foreground': '#eef6ff',
    '--border': '#1b3c5e',
    '--border-strong': '#2c5c83',
    '--border-focus': '#64baff',
    '--ring-focus': 'rgb(100 186 255 / 0.24)',
    '--primary': '#38a8ff',
    '--primary-foreground': '#061629',
    '--primary-hover': '#68c0ff',
    '--success': '#25d596',
    '--success-text': '#6beab2',
    '--success-bg': 'rgb(37 213 150 / 0.16)',
    '--warning': '#ffc44d',
    '--warning-text': '#ffda80',
    '--warning-bg': 'rgb(255 196 77 / 0.16)',
    '--danger': '#ff6478',
    '--danger-text': '#ff8c9a',
    '--danger-bg': 'rgb(255 100 120 / 0.16)',
    '--production-blue': '#3ca9ff',
    '--production-green': '#22d9a0',
    '--production-violet': '#b08bff',
    '--production-amber': '#ffb52e',
    '--chart-1': '#3ca9ff',
    '--chart-2': '#22d9a0',
    '--chart-3': '#ffb52e',
    '--chart-4': '#b08bff',
    '--production-blue-glow': 'rgb(60 169 255 / 0.12)',
    '--production-green-glow': 'rgb(34 217 160 / 0.12)',
    '--production-violet-glow': 'rgb(176 139 255 / 0.12)',
    '--production-amber-glow': 'rgb(255 181 46 / 0.12)',
  },
};

const SLOT_COUNT = 6;

/** 'yyyyMMdd' → Date tại đầu ngày (giờ địa phương, khớp cách SQL cắt chuỗi). */
function parseYmd(value) {
  const s = String(value ?? '').trim();
  if (!/^\d{8}$/.test(s)) return null;
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDayShort(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Các nhóm ngày đang dùng cho phạm vi "Toàn bộ WO".
 * Công thức phải khớp ĐÚNG với SQL:
 *   SQL : bucket = (dayOffset * 6) / soNgay     — chia nguyên, dayOffset từ 0
 *   JS  : dayOffset của bucket k nằm trong [ceil(k*nd/6), ceil((k+1)*nd/6) - 1]
 * @returns {Array<{id,label,slotIx,startDay,endDay,endDate,empty}>|null}
 */
export function buildWoSlots(woStartDate, woDayCount, slotCount = SLOT_COUNT) {
  const start = parseYmd(woStartDate);
  const nd = Number(woDayCount);
  if (!start || !Number.isFinite(nd) || nd <= 0) return null;

  return Array.from({ length: slotCount }, (_, k) => {
    const from = Math.ceil((k * nd) / slotCount);
    const to = Math.ceil(((k + 1) * nd) / slotCount) - 1;
    const d1 = new Date(start);
    d1.setDate(start.getDate() + from);
    const d2 = new Date(start);
    d2.setDate(start.getDate() + to);
    const empty = to < from;
    const label = empty
      ? ''
      : from === to
        ? formatDayShort(d1)
        : `${formatDayShort(d1)}–${formatDayShort(d2)}`;
    return { id: `W${k + 1}`, slotIx: k, label, startDay: from, endDay: to, endDate: d2, empty };
  });
}

/**
 * Bộ khung đang dùng, theo phạm vi đang chọn.
 * Chế độ 'WO' chưa có dữ liệu khoảng ngày thì lùi về khung của ca — không
 * để trang trắng trong lúc GET_SUMMARY đang tải.
 * Mọi phần tử đều mang `slotIx` (vị trí gốc 0..5 trong SQL) để normalizer ánh
 * xạ dòng SQL → khung hiển thị.
 */
export function getActiveSlots({ scope, shift, woStartDate, woDayCount } = {}) {
  if (scope === 'WO') {
    const woSlots = buildWoSlots(woStartDate, woDayCount);
    if (woSlots) return woSlots;
  }
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
    ...DASHBOARD_CONFIG.themeStyle,
    '--neutral-bg': '#1e2831',
    '--neutral': '#94a3b8',
    '--neutral-text': '#a8b6c4',
    colorScheme: 'dark',
  },
  light: {
    '--background': '#f0f3f6',
    '--surface': '#ffffff',
    '--surface-overlay': '#f7f9fb',
    '--surface-hover': '#eff3f6',
    '--foreground': '#1a2029',
    '--muted': '#f3f5f7',
    '--muted-foreground': '#545f6d',
    '--card': '#ffffff',
    '--card-foreground': '#1a2029',
    '--popover': '#ffffff',
    '--popover-foreground': '#1a2029',
    '--border': '#e1e7ec',
    '--border-strong': '#c9d1d9',
    '--border-focus': '#1c6b8c',
    '--ring-focus': 'rgb(28 107 140 / 0.16)',
    '--primary': '#1c6b8c',
    '--primary-foreground': '#ffffff',
    '--primary-hover': '#165875',
    '--success': '#1e8e5a',
    '--success-text': '#116249',
    '--success-bg': '#e3f3ea',
    '--warning': '#b7791f',
    '--warning-text': '#855611',
    '--warning-bg': '#fdf3e0',
    '--danger': '#c0392b',
    '--danger-text': '#a5301f',
    '--danger-bg': '#fbeae8',
    '--neutral-bg': '#e7ebef',
    '--neutral': '#6b7785',
    '--neutral-text': '#4b5561',
    '--production-blue': '#1c6b8c',
    '--production-green': '#1e8e5a',
    '--production-violet': '#6d5aa8',
    '--production-amber': '#8a5a00',
    '--chart-1': '#1c6b8c',
    '--chart-2': '#16825d',
    '--chart-3': '#8a5a00',
    '--chart-4': '#6854a3',
    '--chart-5': '#c0392b',
    '--production-blue-glow': 'rgb(28 107 140 / 0.12)',
    '--production-green-glow': 'rgb(30 142 90 / 0.12)',
    '--production-violet-glow': 'rgb(109 90 168 / 0.12)',
    '--production-amber-glow': 'rgb(138 90 0 / 0.12)',
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
