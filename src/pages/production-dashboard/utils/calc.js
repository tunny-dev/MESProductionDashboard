import { DASHBOARD_CONFIG } from '@/pages/production-dashboard/utils/dashboardConfig';
import { toNum } from '@/core/utils/coerce';

/** Thời gian tối thiểu để UPH của 1 trạm có ý nghĩa — xem `sanitizeStationUph`. */
const MIN_UPH_SPAN_MIN = 5; // phút

/**
 * Tỷ lệ đạt kế hoạch (%).
 * CHỐNG TRÊN 100%: sản lượng bằng hoặc vượt kế hoạch đều là "đạt",
 * luôn luôn là 100%
 */
export function calculateAchievement(actualOutput, planOutput) {
  if (
    !Number.isFinite(Number(actualOutput)) ||
    !Number.isFinite(Number(planOutput)) ||
    Number(planOutput) <= 0
  ) {
    return null;
  }

  const percent = (Number(actualOutput) / Number(planOutput)) * 100;
  return Math.min(percent, 100);
}

/**
 * UPH thực tế của 1 trạm.
 * BE tính `uphActual = outputQty * 3600 / spanSec` với
 * spanSec = (giây) giữa log đầu và log cuối của trạm.
 * @param {number|null} apiUph UPH do BE tính (dùng khi đủ dữ liệu).
 * @param {number|null} spanMin Khoảng cách phút giữa log đầu và log cuối.
 * @returns {number|null}
 */
export function sanitizeStationUph(apiUph, spanMin) {
  const span = Number(spanMin);
  if (Number.isFinite(span) && span < MIN_UPH_SPAN_MIN) return null;
  return Number(apiUph) || null;
}

/**
 * Tỷ lệ chất lượng của trạm (%).
 * Ưu tiên FPY = firstPass / inputQty nếu có.
 * Fallback: nếu trạm không check-in (inputQty = 0) hoặc chưa có firstPass,
 * dùng outputQty / (outputQty + ngQty) để tránh rỗng số liệu.
 */
export function calculateYield(firstPass, inputQty, actualOutput, ngQty) {
  const input = Number(inputQty);
  const output = Number(actualOutput);
  const ng = Number(ngQty) || 0;

  const total =
    Number.isFinite(input) && input > 0
      ? input
      : Number.isFinite(output) && output > 0
        ? output + ng
        : 0;

  if (total <= 0) return null;

  let good = null;
  if (firstPass !== null && firstPass !== undefined) {
    const fp = Number(firstPass);
    if (Number.isFinite(fp) && fp >= 0) {
      good = Math.min(fp, total);
    }
  }

  if (good === null) {
    if (Number.isFinite(output) && output >= 0) {
      good = Math.min(output, total);
    } else {
      good = Math.max(0, total - ng);
    }
  }

  return Math.min((good / total) * 100, 100);
}

export function getStationWip(station, index, stations, summary) {
  // Trạm cuối cùng của quy trình: không có trạm sau nên không có WIP dở dang giữa 2 trạm (hiển thị '—')
  if (Array.isArray(stations) && index === stations.length - 1) {
    return null;
  }

  if (
    station?.stuckQty !== null &&
    station?.stuckQty !== undefined &&
    Number.isFinite(Number(station.stuckQty))
  ) {
    return Number(station.stuckQty);
  }
  if (station?.wip !== null && station?.wip !== undefined && Number.isFinite(Number(station.wip))) {
    return Number(station.wip);
  }

  // Nếu cả trạm này và trạm kế tiếp có số lũy kế (cumQty), tính lượng đệm tồn dở dang thực tế giữa 2 trạm
  const nextStation = Array.isArray(stations) ? stations[index + 1] : null;
  const currentCum = Number(station?.cumQty);
  const nextCum = Number(nextStation?.cumQty);
  if (Number.isFinite(currentCum) && Number.isFinite(nextCum) && currentCum > 0) {
    return Math.max(0, currentCum - nextCum);
  }

  const output = Number(station?.actualOutput);
  if (!Number.isFinite(output)) return null;

  const previousOutput =
    index === 0
      ? Number(summary?.totalInput ?? station?.actualInput)
      : Number(stations[index - 1]?.actualOutput);

  if (!Number.isFinite(previousOutput)) return null;
  return Math.max(0, previousOutput - output);
}

export function getWipLimit(stationConfig) {
  return stationConfig?.wipLimit ?? DASHBOARD_CONFIG.wipLimit;
}

/** Bottleneck là trạm có tỷ lệ Actual UPH / Target UPH thấp nhất,
 * không phải trạm có output thấp nhất.
 */
export function findBottleneck(stations) {
  return (
    stations.reduce((lowest, station) => {
      const target = Number(station.targetUph);
      const actual = Number(station.actualUph);
      if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(actual)) return lowest;

      const ratio = actual / target;
      return !lowest || ratio < lowest.ratio ? { stationId: station.stationId, ratio } : lowest;
    }, null)?.stationId ?? null
  );
}

/** 'YYYYMMDDHHmmss' (SSFTA.TA030) → Date. Trả null nếu chuỗi hỏng. */
export function parseTaTimestamp(value) {
  if (typeof value !== 'string' || value.length !== 14) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ngưỡng cho trạng thái trạm. */
const STATION_STATUS_THRESHOLD = {
  yieldAbnormal: 90, // Tỷ lệ chất lượng < 90% = bất thường (chuẩn công nghiệp)
  slotAbnormal: 75, // % đạt slot vừa kết thúc < 75% = bất thường
  slotWaiting: 85, // dưới 85% = cần chú ý / chờ xử lý
  yieldMinSample: 20, // dưới mẫu này không xét tỷ lệ tốt (tránh báo động giả)
  idleStopMin: 30, // phút không có log = dừng
  wipRatio: 0.05, // WIP > 5% kế hoạch = chờ xử lý
  wipMin: 100, // hoặc WIP > 100 món, tuỳ cái nào lớn hơn
};

/** Trạng thái trạm: RUNNING/WAITING/ABNORMAL/STOP. Dừng trước Bất thường. */
export function getStationStatus(
  station,
  { lastCompletedSlotIndex = -1, isCurrentShift = false, now = null, woMode = false } = {}
) {
  if (!station) return null;

  const input = toNum(station.actualInput) ?? 0;
  const output = toNum(station.actualOutput) ?? 0;
  const ng = toNum(station.ngQty) ?? 0;
  const planOut = toNum(station.planOutput) ?? 0;
  const sampled = output + ng;

  // 1. Dừng — không có gì chạy trong ca, hoặc lâu không có log.
  if (input === 0 && sampled === 0) return 'STOP';
  if (isCurrentShift) {
    const lastAt = parseTaTimestamp(station.lastAt);
    const ref = now ?? new Date();
    if (
      lastAt &&
      (ref.getTime() - lastAt.getTime()) / 60000 > STATION_STATUS_THRESHOLD.idleStopMin
    ) {
      return 'STOP';
    }
  }

  const yieldPct = calculateYield(station.firstPass, input, output, ng);
  const wip = input - output;
  const wipLimit = Math.max(
    planOut * STATION_STATUS_THRESHOLD.wipRatio,
    STATION_STATUS_THRESHOLD.wipMin
  );

  // Tín hiệu tốc độ:
  // - đang xem ca hiện tại → % đạt của khung vừa kết thúc
  // - ca đã xong → % đạt cả ca. Không dùng khung cuối vì ca thường kết thúc
  //   không đúng giờ, khung cuối trống sẽ kéo mọi trạm xuống 0% và báo động giả.
  const totalAchv = planOut > 0 ? Math.min((output / planOut) * 100, 100) : null;
  const lastSlotAchv =
    !woMode && isCurrentShift && lastCompletedSlotIndex >= 0
      ? (station.hourlyAchievement?.[lastCompletedSlotIndex] ?? null)
      : totalAchv;

  // 2. Bất thường — chất lượng quá thấp hoặc dừng trệ nghiêm trọng
  if (
    yieldPct !== null &&
    sampled >= STATION_STATUS_THRESHOLD.yieldMinSample &&
    yieldPct < STATION_STATUS_THRESHOLD.yieldAbnormal
  ) {
    return 'ABNORMAL';
  }
  if (lastSlotAchv !== null && lastSlotAchv < STATION_STATUS_THRESHOLD.slotAbnormal) {
    return 'ABNORMAL';
  }

  // 3. Chờ xử lý — tồn đọng hoặc hụt so với kế hoạch.
  if (wip > wipLimit) return 'WAITING';
  if (lastSlotAchv !== null && lastSlotAchv < STATION_STATUS_THRESHOLD.slotWaiting) {
    return 'WAITING';
  }

  // 4. Đang chạy bình thường.
  return 'RUNNING';
}

export function getAchievementColor(percent) {
  const value = Number(percent);
  const { green, yellow } = DASHBOARD_CONFIG.achievementThreshold;

  if (!Number.isFinite(value)) return 'bg-muted text-muted-foreground';
  if (value >= green) return 'bg-success/10 text-success-text';
  if (value >= yellow) return 'bg-warning/10 text-warning-text';
  return 'bg-danger/10 text-danger-text';
}

export function getStatusTone(status) {
  const tones = {
    RUNNING: { dot: 'bg-success', badge: 'border-success/30 bg-success/10 text-success-text' },
    WAITING: { dot: 'bg-warning', badge: 'border-warning/30 bg-warning/10 text-warning-text' },
    ABNORMAL: { dot: 'bg-danger', badge: 'border-danger/30 bg-danger/10 text-danger-text' },
    STOP: { dot: 'bg-neutral', badge: 'border-border-strong bg-muted text-muted-foreground' },
  };

  return (
    tones[status] || {
      dot: 'bg-neutral',
      badge: 'border-border-strong bg-muted text-muted-foreground',
    }
  );
}

export function getSlotState(slot, clockTime, shift) {
  if (!clockTime) return 'future';

  const wallClockMinute = clockTime.getHours() * 60 + clockTime.getMinutes();
  const currentMinute =
    shift.id === 'night' && wallClockMinute < 480 ? wallClockMinute + 1440 : wallClockMinute;

  if (shift.id === 'night' && wallClockMinute >= 480 && wallClockMinute < 1200) {
    return 'future';
  }

  if (currentMinute < slot.startMinute) return 'future';
  if (currentMinute < slot.endMinute) return 'current';
  return 'complete';
}
