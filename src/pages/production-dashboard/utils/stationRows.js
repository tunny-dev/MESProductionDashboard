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
}) {
  const statusNow = isViewingCurrentShift ? clockMinuteDate : shiftEndDate;
  const woMode = scopeId === 'WO' || scopeId === 'ROUTING';

  if (apiStations.length > 0) {
    return apiStations.map((station) => {
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
          apiTarget: station.targetUph ?? cycleTimeTargetMap.get(String(station.stationId)),
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

  if (!activeLineConfig) return [];

  const metricsById = new Map(apiStations.map((s) => [s.stationId, s]));
  return activeLineConfig.stations.map((stationConfig) => {
    const configuredTargetUph = getStationTargetUph(lineConfig, model, stationConfig.id);
    const metrics = metricsById.get(stationConfig.id) || {};

    return {
      ...stationConfig,
      ...metrics,
      ...(configuredTargetUph !== undefined ? { targetUph: configuredTargetUph } : {}),
      targetUph: getTargetUph({
        process,
        line: metrics.line ?? lineId,
        op: stationConfig.id,
        apiTarget:
          metrics.targetUph ??
          cycleTimeTargetMap.get(String(stationConfig.id)) ??
          configuredTargetUph,
      }),
      ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
      stationId: stationConfig.id,
      status: getStationStatus(metrics, {
        lastCompletedSlotIndex,
        isCurrentShift: isViewingCurrentShift,
        now: statusNow,
        woMode,
      }),
    };
  });
}
