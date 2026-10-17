export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5258/api'
).replace(/\/+$/, '');

export const ENDPOINTS = {
  auth: {
    login: '/common/auth/login',
    refresh: '/common/auth/refresh',
    logout: '/common/auth/logout',
    me: '/common/auth/me',
  },
  production: {
    flowByMo: '/production/getFlowByMo',
    moSummary: '/production/getMoSummary',
    achievement: '/production/getProductionAchievement',
    uphTrend: '/production/getUphTrend',
    wipReport: '/production/getWipReport',
    lineDetail: '/production/getProductionLineDetail',
    snapshot: '/production/getProductionSnapshot',
  },
  wip: {
    summary: '/wip/getWipSummary',
    models: '/wip/getWipModels',
    mos: '/wip/getWipMos',
    station: '/wip/getWipStation',
    stationSn: '/wip/getWipStationSn',
    unitSn: '/wip/getWipUnitSn',
    notInputSn: '/wip/getWipNotInputSn',
  },
  mo: {
    byLine: '/mo/getMoByLine',
    info: '/mo/getMoInfo',
    modelByLine: '/mo/getModelByLine',
  },
  cim: {
    mfgType: '/cim/getMfgType',
    productionAreaList: '/cim/getProductionAreaList',
    productionLine: '/cim/getProductionLine',
    mfgByLine: '/cim/getMfgByLine',
    productionShiftList: '/cim/getProductionShiftList',
    productionStopReasonList: '/cim/getProductionStopReasonList',
  },
};

export const DEFAULT_FACTORY = import.meta.env.VITE_DEFAULT_FACTORY || 'VN';
