export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5119/api'
).replace(/\/+$/, '');

export const ENDPOINTS = {
  auth: {
    login: '/common/auth/login',
    refresh: '/common/auth/refresh',
    logout: '/common/auth/logout',
    me: '/common/auth/me',
  },
  cim: {
    mfgType: '/cim/get-mfg-type',
    areaList: '/cim/get-area-list',
    line: '/cim/get-line',
    mfgByLine: '/cim/get-mfg-by-line',
    shiftList: '/cim/get-shift-list',
    cycleTime: '/cim/get-cycle-time',
  },
  productionBoard: {
    lineBoard: '/production-board/line-board',
  },
  overview: {
    snapshot: '/overview/snapshot',
  },
  mo: {
    byLine: '/mo/get-mo-by-line',
    info: '/mo/get-mo-info',
    modelByLine: '/mo/get-model-by-line',
    moList: '/mo/get-mo-list',
  },
  productionReport: {
    dashboardDetail: '/production-report/get-dashboard-detail',
    flowByMo: '/production-report/get-flow-by-mo',
    moSummary: '/production-report/get-mo-summary',
    achievement: '/production-report/get-achievement',
    uphTrend: '/production-report/get-uph-trend',
    wipReport: '/production-report/get-wip-report',
    lineDetail: '/production-report/get-line-detail',
    snapshot: '/production-report/get-snapshot',
    stationSerials: '/production-report/get-station-serials',
  },
  export: {
    templates: '/export/templates',
    reportData: '/export/report-data',
  },
};

export const DEFAULT_FACTORY = import.meta.env.VITE_DEFAULT_FACTORY || 'VN';
