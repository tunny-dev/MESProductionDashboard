export const MES_SYSTEMS = {
  /**
   * Dữ liệu API từ hệ thống SFCS
   * Server: http://10.1.200.31
   */
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

  // Thêm hệ thống mới vào đây
  // erp: {
  //   id: 'erp',
  //   baseUrl: import.meta.env.VITE_MES_ERP_URL || '',
  //   invokeN: Number(import.meta.env.VITE_MES_ERP_INVOKE ?? 3),
  //   label: 'ERP',
  // },
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
    snapshot: 'PRODUCTION_SNAPSHOT',
    lineDetail: 'PRODUCTION_LINE_DETAIL',
    areas: 'PRODUCTION_AREA_LIST',
    shifts: 'PRODUCTION_SHIFT_LIST',
    stopReasons: 'PRODUCTION_STOP_REASON_LIST',
    stages: 'GET_MFG_TYPE',
    moSummary: 'GET_SUMMARY',
    wipReport: 'GET_WIP_REPORT',
    flowByMo: 'GET_FLOW_BY_MO',
    getProductionLine: 'GET_PRODUCTION_LINE',
    getModelByLine: 'GET_MODEL_BY_LINE',
    getMoByLine: 'GET_MO_BY_LINE',
    getMoInfo: 'GET_MO_INFO',
    getMfgByLine: 'GET_MFG_BY_LINE',
    lineByProc: 'BDMG_06_SELECT',
    modelByLine: 'DASH_MODEL_BY_LINE',
    // Mỗi biểu đồ 1 API riêng, cùng bộ lọc (WO + chuyền + công đoạn + ca),
    // đều gom ở TRẠM CUỐI (MAX seq) và luôn trả về đúng 6 khung 2 giờ.
    chartOutput: 'GET_PRODUCTION_ACHIEVEMENT',
    chartUph: 'GET_UPH_TREND',
  },

  /** Work-In-Progress — system: wip */
  wip: {
    lotStatus: 'WIP_LOT_STATUS',
    lotHistory: 'WIP_LOT_HISTORY',
  },

  /**
   * Trang /wip-report — sCode RIÊNG, không dùng chung GET_WIP_REPORT
   * của dashboard (khác grain: 1 dòng/MO-line thay vì 1 dòng/trạm,
   * khác param: P_* thay vì MO/SDATE/...).
   */
  wipReport: {
    summary: 'GET_WIP_SUMMARY',
    byStation: 'GET_WIP_STATION',
    models: 'GET_WIP_MODELS',
    mos: 'GET_WIP_MOS',
  },

};

export const ENDPOINTS = {
  mes: {
    auth: '/api/mes/auth',
  },
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
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
