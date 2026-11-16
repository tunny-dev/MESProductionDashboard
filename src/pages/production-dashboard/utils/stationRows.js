import { getStationStatus } from '@/pages/production-dashboard/utils/calc';
import { getStationTargetUph } from '@/pages/production-dashboard/utils/dashboardConfig';
import { getTargetUph } from '@/pages/production-dashboard/utils/dashboardTargetUph';

/**
 * @param {object} params
 * @param {Array} params.apiStations        viewData.stations
 * @param {object|null} params.activeLineConfig  lineConfig với stations đã filter theo model
 * @param {object|null} params.lineConfig    lineConfig gốc (để tra getStationTargetUph)
 * @param {string} params.model             model đang chọn ('ALL' = tất cả)
 * @param {object|null} params.modelProfile  getModelProfile(lineConfig, model)
 * @param {string|null} params.process      công đoạn ('SMT' | 'DIP' | 'FA')
 * @param {string|null} params.lineId       mã chuyền
 * @param {number} params.lastCompletedSlotIndex
 * @param {boolean} params.isViewingCurrentShift
 * @param {Date} params.clockMinuteDate
 * @param {Date} params.shiftEndDate
 * @param {Map<string, number>} params.cycleTimeTargetMap  stationId → targetUph từ CimCycleTime
 * @param {string} params.scopeId
 * @returns {Array}
 */
export function buildStationRows({
  apiStations,
  activeLineConfig,
  lineConfig,
  model,
  modelProfile,
  process,
  lineId,
  lastCompletedSlotIndex,
  isViewingCurrentShift,
  clockMinuteDate,
  shiftEndDate,
  cycleTimeTargetMap,
  scopeId,
  summary,
}) {
  const statusNow = isViewingCurrentShift ? clockMinuteDate : shiftEndDate;
  const woMode = scopeId === 'WO' || scopeId === 'ROUTING';

  // 1. Danh sách trạm chuẩn theo quy trình công nghệ (BOM/Flow) của chuyền / WO
  const masterStations =
    activeLineConfig?.stations?.length > 0
      ? activeLineConfig.stations
      : lineConfig?.stations?.length > 0
        ? lineConfig.stations
        : null;

  if (masterStations && masterStations.length > 0) {
    const metricsById = new Map((apiStations ?? []).map((s) => [s.stationId, s]));

    return masterStations.map((stationConfig) => {
      const configuredTargetUph = getStationTargetUph(lineConfig, model, stationConfig.id);
      const metrics = metricsById.get(stationConfig.id) || null;
      const stationId = stationConfig.id;
      const name = stationConfig.name || stationConfig.shortName || stationId;
      const cumQty = metrics?.cumQty ?? stationConfig.qty ?? metrics?.outputQty ?? null;
      const defaultPlan = summary?.planOutput ?? summary?.planInput ?? null;

      const targetUph = getTargetUph({
        process,
        line: metrics?.line ?? stationConfig.line ?? lineId,
        op: stationId,
        apiTarget:
          metrics?.targetUph ??
          cycleTimeTargetMap?.get(String(stationId)) ??
          cycleTimeTargetMap?.get(String(stationId).toUpperCase()) ??
          configuredTargetUph,
      });

      const stationData = metrics
        ? {
            ...stationConfig,
            ...metrics,
            id: stationId,
            stationId,
            name,
            shortName: stationConfig.shortName || name,
            targetUph,
            cumQty,
            planInput: metrics.planInput ?? defaultPlan,
            planOutput: metrics.planOutput ?? defaultPlan,
          }
        : {
            ...stationConfig,
            id: stationId,
            stationId,
            name,
            shortName: stationConfig.shortName || name,
            opName: name,
            stationName: name,
            line: stationConfig.line ?? lineId,
            actualInput: 0,
            actualOutput: 0,
            planInput: defaultPlan,
            planOutput: defaultPlan,
            firstPass: 0,
            ngQty: 0,
            rtQty: 0,
            ngEvents: 0,
            ngAll: 0,
            ngRate: null,
            uphActual: null,
            hourlyAchievement: [null, null, null, null, null, null],
            targetUph,
            cumQty,
          };

      return {
        ...stationData,
        ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
        status: getStationStatus(stationData, {
          lastCompletedSlotIndex,
          isCurrentShift: isViewingCurrentShift,
          now: statusNow,
          woMode,
        }),
      };
    });
  }

  // 2. Fallback nếu không có cấu hình trạm quy trình nào: hiển thị trực tiếp từ apiStations
  return (apiStations ?? []).map((station) => {
    const name = station.opName || station.stationName || station.stationId;
    return {
      ...station,
      id: station.stationId,
      name,
      shortName: name,
      stationId: station.stationId,
      targetUph: getTargetUph({
        process,
        line: station.line ?? lineId,
        op: station.stationId,
        apiTarget:
          station.targetUph ??
          cycleTimeTargetMap?.get(String(station.stationId)) ??
          cycleTimeTargetMap?.get(String(station.stationId).toUpperCase()),
      }),
      ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
      status: getStationStatus(station, {
        lastCompletedSlotIndex,
        isCurrentShift: isViewingCurrentShift,
        now: statusNow,
        woMode,
      }),
    };
  });
}
