import { getStationStatus, getStationWip } from '@/features/production-dashboard/utils/calc';
import { getStationTargetUph } from '@/features/production-dashboard/utils/dashboardConfig';
import { getTargetUph } from '@/features/production-dashboard/utils/dashboardTargetUph';

/**
 * Tính tỷ lệ đạt kế hoạch từng khung 2 giờ theo công thức:
 * Achievement (%) = Actual Output trong 2 giờ / Plan Output trong 2 giờ × 100%
 * Trong đó: Plan Output trong 2 giờ = Target UPH × 2 (hoặc Kế hoạch ca / 6).
 */
function computeStationHourlyAchievement(station, targetUph, summary) {
  const rawSlots = station.rawSlots ?? [
    station.s1,
    station.s2,
    station.s3,
    station.s4,
    station.s5,
    station.s6,
  ];
  if (!Array.isArray(rawSlots))
    return station.hourlyAchievement ?? [null, null, null, null, null, null];

  const planOut = Number(station.planOutput ?? summary?.planOutput);

  return rawSlots.map((rawCount) => {
    const count = rawCount !== null && rawCount !== undefined ? Number(rawCount) : null;
    if (count === null || isNaN(count)) return null;

    let planQty = null;
    // Kế hoạch 2 giờ = Target UPH * 2
    if (targetUph && Number(targetUph) > 0) {
      planQty = Number(targetUph) * 2;
    } else if (planOut && planOut > 0) {
      // Không có Target UPH: Kế hoạch ca chia cho 6 khung
      planQty = Math.round(planOut / 6);
    }

    if (!planQty || planQty <= 0) return null;
    // Achievement (%) = Actual Output trong 2 giờ / Plan Output trong 2 giờ × 100%
    return Math.min(100, Math.round((count / planQty) * 100));
  });
}

function getShiftElapsedMinutes(now) {
  if (!now || !(now instanceof Date) || isNaN(now.getTime())) return 60;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTotal = hours * 60 + minutes;

  // Ca 1: 08:00 - 20:00 (480 - 1200)
  if (currentTotal >= 480 && currentTotal <= 1200) {
    return Math.max(10, currentTotal - 480);
  }
  // Ca 2: 20:00 - 08:00 hôm sau
  if (currentTotal >= 1200) {
    return Math.max(10, currentTotal - 1200);
  }
  return Math.max(10, currentTotal + 240);
}

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
  summary,
}) {
  const statusNow = isViewingCurrentShift ? clockMinuteDate : shiftEndDate;

  // Danh sách trạm chuẩn theo quy trình công nghệ (BOM/Flow) của chuyền / WO
  const masterStations =
    activeLineConfig?.stations?.length > 0
      ? activeLineConfig.stations
      : lineConfig?.stations?.length > 0
        ? lineConfig.stations
        : null;

  if (masterStations && masterStations.length > 0) {
    const metricsById = new Map((apiStations ?? []).map((s) => [s.stationId, s]));

    // Trong ca (Shift mode): Chỉ giữ lại các trạm có dữ liệu hoạt động trong ca (có input hoặc output > 0)
    const targetStations = masterStations.filter((sc) => {
      const m = metricsById.get(sc.id);
      if (!m) return false;
      const out = Number(m.actualOutput ?? m.outputQty ?? 0);
      const inp = Number(m.actualInput ?? m.inputQty ?? 0);
      const pass = Number(m.totalPass ?? 0);
      return out > 0 || inp > 0 || pass > 0;
    });

    const rowList = targetStations.map((stationConfig) => {
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

      const hourlyAchievement = metrics
        ? computeStationHourlyAchievement(metrics, targetUph, summary)
        : [null, null, null, null, null, null];

      return metrics
        ? {
            ...stationConfig,
            ...metrics,
            id: stationId,
            stationId,
            name,
            shortName: stationConfig.shortName || name,
            targetUph,
            cumQty,
            hourlyAchievement,
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
            unresolvedNg: 0,
            totalPass: 0,
            totalNg: 0,
            rtQty: 0,
            ngEvents: 0,
            ngAll: 0,
            ngRate: null,
            uphActual: null,
            hourlyAchievement: [null, null, null, null, null, null],
            targetUph,
            cumQty,
          };
    });

    return rowList.map((stationData, index) => {
      const wip =
        stationData.wip !== undefined
          ? stationData.wip
          : getStationWip(stationData, index, rowList, summary);
      let actualUph = stationData.actualUph;
      if ((actualUph === null || actualUph === undefined) && Number(stationData.actualOutput) > 0) {
        const elapsedMinutes = getShiftElapsedMinutes(statusNow);
        actualUph = Math.max(
          1,
          Math.round((Number(stationData.actualOutput) * 60) / Math.max(10, elapsedMinutes))
        );
      }

      return {
        ...stationData,
        actualUph,
        wip,
        ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
        status:
          stationData.status ??
          getStationStatus(
            { ...stationData, actualUph },
            {
              lastCompletedSlotIndex,
              isCurrentShift: isViewingCurrentShift,
              now: statusNow,
              wip,
            }
          ),
      };
    });
  }

  // Fallback nếu không có cấu hình trạm quy trình nào: hiển thị trực tiếp từ apiStations
  const fallbackList = (apiStations ?? []).map((station) => {
    const name = station.opName || station.stationName || station.stationId;
    const targetUph = getTargetUph({
      process,
      line: station.line ?? lineId,
      op: station.stationId,
      apiTarget:
        station.targetUph ??
        cycleTimeTargetMap?.get(String(station.stationId)) ??
        cycleTimeTargetMap?.get(String(station.stationId).toUpperCase()),
    });
    const hourlyAchievement = computeStationHourlyAchievement(station, targetUph, summary);

    return {
      ...station,
      id: station.stationId,
      name,
      shortName: name,
      stationId: station.stationId,
      targetUph,
      hourlyAchievement,
      totalPass: station.totalPass ?? station.actualOutput ?? 0,
      totalNg: station.totalNg ?? station.ngQty ?? 0,
      unresolvedNg: station.unresolvedNg ?? station.ngQty ?? 0,
      ...(modelProfile?.uphAvailable === false ? { targetUph: null, actualUph: null } : {}),
    };
  });

  return fallbackList.map((s, index) => {
    const wip = s.wip !== undefined ? s.wip : getStationWip(s, index, fallbackList, summary);
    let actualUph = s.actualUph;
    if ((actualUph === null || actualUph === undefined) && Number(s.actualOutput) > 0) {
      const elapsedMinutes = getShiftElapsedMinutes(statusNow);
      actualUph = Math.max(
        1,
        Math.round((Number(s.actualOutput) * 60) / Math.max(10, elapsedMinutes))
      );
    }

    return {
      ...s,
      actualUph,
      wip,
      status:
        s.status ??
        getStationStatus(
          { ...s, actualUph },
          {
            lastCompletedSlotIndex,
            isCurrentShift: isViewingCurrentShift,
            now: statusNow,
            wip,
          }
        ),
    };
  });
}
