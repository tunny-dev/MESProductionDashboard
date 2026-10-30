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
 * Tỷ lệ tốt của trạm = số đạt LẦN ĐẦU ÷ số đầu vào (FPY)
 * Tỷ lệ chất lượng = First-pass yield (FPY).
 * FPY = số đạt LẦN ĐẦU (TA028 = '1') ÷ số đầu vào.
 */
export function calculateYield(firstPass, inputQty, actualOutput) {
  void actualOutput;
  const input = Number(inputQty);
  if (!Number.isFinite(input) || input <= 0) return null;

  // firstPass null/undefined = BE chưa trả TA028 → không tính, không fallback.
  if (firstPass === null || firstPass === undefined) return null;
  const good = Number(firstPass);
  if (!Number.isFinite(good) || good < 0 || good > input) return null;

  return Math.min((good / input) * 100, 100);
}

export function getStationWip(station, index, stations, summary) {
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
  yieldAbnormal: 95, // tỷ lệ tốt dưới ngưỡng này = bất thường
  slotAbnormal: 90, // % đạt slot vừa kết thúc dưới ngưỡng này = bất thường
  slotWaiting: 95, // từ ngưỡng này trở xuống = chờ xử lý
  yieldMinSample: 30, // dưới mẫu này không xét tỷ lệ tốt (tránh báo động giả)
  idleStopMin: 30, // phút không có log = dừng
  wipRatio: 0.01, // WIP > 1% kế hoạch = chờ xử lý
  wipMin: 50, // hoặc WIP > 50 món, tuỳ cái nào lớn hơn
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

  const yieldPct = calculateYield(station.firstPass, input, output);
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

  // 2. Bất thường — chất lượng hoặc tốc độ lệch.
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

  // 3. Chờ xử lý — tồn đọng hoặc hụt nhẹ so với kế hoạch.
  if (wip > wipLimit) return 'WAITING';
  if (lastSlotAchv !== null && lastSlotAchv < STATION_STATUS_THRESHOLD.slotWaiting) {
    return 'WAITING';
  }

  // 4. Đang chạy.
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
