export const MES_BASE_URL = String(import.meta.env.VITE_MES_URL ?? '').replace(/\/+$/, '');

export const MES_SYSTEMS = {
  mes: {
    id: 'mes',
    label: 'MES',
    baseUrl: MES_BASE_URL,
    invokeN: Number(import.meta.env.VITE_MES_INVOKE ?? 6),
    timeout: 60_000,
  },
  // Thêm hệ thống khác (SFCS, WIP, ERP...) theo cùng cấu trúc khi cần:
  // wip: {
  //   id: 'wip',
  //   label: 'WIP',
  //   baseUrl: String(import.meta.env.VITE_MES_WIP_URL ?? '').replace(/\/+$/, ''),
  //   invokeN: Number(import.meta.env.VITE_MES_WIP_INVOKE ?? 6),
  // },
};

/** systemId dùng khi không truyền tường minh. */
export const MES_DEFAULT_SYSTEM = 'mes';

/**
 * Đường dẫn invoke (tương đối) của một sCode.
 * @param {number} invokeN
 * @param {string} sCode
 * @returns {string}
 */
export function mesInvokeUrl(invokeN, sCode) {
  return `/MES/invoke${invokeN}?sCode=${encodeURIComponent(sCode)}`;
}

/**
 * sCode đăng ký trong bảng SERVICE_SQL của DB SFIS.
 */
export const MES_S_CODES = {
  production: {
    getFlowByMo: 'getFlowByMo',
    getCycleTime: 'getCycleTime',
    getCycleTimeFromOracel: 'getCycleTimeFromOracel',
    getMoSummary: 'getMoSummary',
    getProductionAchievement: 'getProductionAchievement',
    getUphTrend: 'getUphTrend',
    getWipReport: 'getWipReport',
    getProductionLineDetail: 'getProductionLineDetail',
    getProductionSnapshot: 'getProductionSnapshot',
    getProductionAreaList: 'getProductionAreaList',
    getProductionLine: 'getProductionLine',
    getProductionShiftList: 'getProductionShiftList',
    getProductionStopReasonList: 'getProductionStopReasonList',
    getMfgType: 'getMfgType',
    getMfgByLine: 'getMfgByLine',
  },
  mo: {
    getMoByLine: 'getMoByLine',
    getMoInfo: 'getMoInfo',
    getModelByLine: 'getModelByLine',
  },
  wipReport: {
    getWipSummary: 'getWipSummary',
    getWipModels: 'getWipModels',
    getWipMos: 'getWipMos',
    getWipStation: 'getWipStation',
    getWipStationSn: 'getWipStationSn',
    getWipUnitSn: 'getWipUnitSn',
    getWipNotInputSn: 'getWipNotInputSn',
  },
  maintain: {
    getCimCycleTime: 'getCimCycleTime',
    createCimCycleTime: 'createCimCycleTime',
    updateCimCycleTime: 'updateCimCycleTime',
  },
};

export const ENDPOINTS = {
  mes: {
    auth: `${MES_BASE_URL}/MES/auth`,
  },
};

export const DEFAULT_FACTORY = import.meta.env.VITE_DEFAULT_FACTORY || 'VN';
