export const ROUTES = {
  HOME: '/',
  OVERVIEW: '/overview',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  FORBIDDEN: '/403',
  LINE_DETAIL: '/overview/line/:lineId',
  lineDetail: (lineId) => `/overview/line/${encodeURIComponent(lineId)}`,
  PRODUCTION_DASHBOARD: '/production-dashboard',
  PRODUCTION_BOARD: '/production-board',
  SYSTEM_LOGS: '/system-logs',
};
