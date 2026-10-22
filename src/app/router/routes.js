export const ROUTES = {
  HOME: '/',
  OVERVIEW: '/overview',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  FORBIDDEN: '/403',
  LINE_DETAIL: '/overview/line/:lineId',
  lineDetail: (lineId) => `/overview/line/${encodeURIComponent(lineId)}`,
  CHART: '/overview/chart',
  PRODUCTION_DASHBOARD: '/production-dashboard',
  WIP_REPORT: '/wip-report',
};
