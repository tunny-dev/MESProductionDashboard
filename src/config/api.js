export const MES_SYSTEMS = {
  sfcs: {
    id: 'sfcs',
    baseUrl: import.meta.env.VITE_MES_SFCS_URL || '',
    invokeN: Number(import.meta.env.VITE_MES_SFCS_INVOKE ?? 6),
    label: 'SFCS',
  },
  wip: {
    id: 'wip',
    baseUrl: import.meta.env.VITE_MES_WIP_URL || '',
    invokeN: Number(import.meta.env.VITE_MES_WIP_INVOKE ?? 6),
    label: 'WIP',
  },
  erp: {
    id: 'erp',
    baseUrl: import.meta.env.VITE_MES_ERP_URL || '',
    invokeN: Number(import.meta.env.VITE_MES_ERP_INVOKE ?? 3),
    label: 'ERP',
  },
};

/**
 * System mặc định khi gọi mesGet/mesPost không truyền systemId.
 * Thường là hệ thống chính của dự án.
 */
export const MES_DEFAULT_SYSTEM = 'sfcs';

export function mesInvokeUrl(invokeN, sCode) {
  return `/MES/invoke${invokeN}?sCode=${encodeURIComponent(sCode)}`;
}

export const MES_S_CODES = {
  production: {
    getMoSummary: 'getMoSummary',
    getWipReport: 'getWipReport',
    getProductionAchievement: 'getProductionAchievement',
    getUphTrend: 'getUphTrend',
    getFlowByMo: 'getFlowByMo',
    getProductionLine: 'getProductionLine',
    getModelByLine: 'getModelByLine',
    getMoByLine: 'getMoByLine',
    getMoInfo: 'getMoInfo',
    getMfgByLine: 'getMfgByLine',
    getMfgType: 'getMfgType',
    getProductionLineDetail: 'getProductionLineDetail',
    getProductionAreaList: 'getProductionAreaList',
    getProductionShiftList: 'getProductionShiftList',
    getProductionStopReasonList: 'getProductionStopReasonList',
    getProductionSnapshot: 'getProductionSnapshot',
  },
  wipReport: {
    getWipSummary: 'getWipSummary',
    getWipStation: 'getWipStation',
    getWipModels: 'getWipModels',
    getWipMos: 'getWipMos',
    getWipUnitSn: 'getWipUnitSn',
    getWipNotInputSn: 'getWipNotInputSn',
    getWipStationSn: 'getWipStationSn',
  },
};

export const ENDPOINTS = {
  mes: {
    auth: '/api/mes/auth',
  },
  auth: {
    me: '/auth/me',
  },
  production: {
    snapshot: '/production/snapshot',
    lineDetail: (lineId) => `/production/lines/${encodeURIComponent(lineId)}`,
    areas: '/production/areas',
    shifts: '/production/shifts',
    stopReasons: '/production/stop-reasons',
  },
};
