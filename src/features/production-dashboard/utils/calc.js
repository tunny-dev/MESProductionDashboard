import { DASHBOARD_CONFIG } from '@/features/production-dashboard/utils/dashboardConfig';
import { toNum } from '@/core/utils/coerce';

/** Thời gian tối thiểu (phút) để tính UPH trạm. */
const MIN_UPH_SPAN_MIN = 5; // phút

/** Tỷ lệ đạt kế hoạch (%, chặn tối đa 100%). */
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

/** UPH thực tế của trạm (chỉ nhận khi span >= 5 phút và UPH > 0). */
export function sanitizeStationUph(apiUph, spanMin) {
  const span = Number(spanMin);
  if (Number.isFinite(span) && span >= MIN_UPH_SPAN_MIN && Number(apiUph) > 0) {
    return Number(apiUph);
  }
  return Number(apiUph) > 0 ? Number(apiUph) : null;
}

/** Tỷ lệ chất lượng (Good / Total * 100%). */
export function calculateYield(firstPass, inputQty, actualOutput, ngQty) {
  const input = Number(inputQty) || 0;
  const output = Number(actualOutput) || 0;
  const ng = Number(ngQty) || 0;

  if (input <= 0 && output <= 0 && ng <= 0) return null;

  // Tổng số lượng đưa vào kiểm tra tại trạm
  const total = Math.max(input, output + ng);
  if (total <= 0) return null;

  if (ng <= 0) {
    return 100;
  }

  // Khi có lỗi NG (ng > 0):
  // Ưu tiên số đạt lần đầu (firstPass) nếu có và hợp lệ
  let good = null;
  if (firstPass !== null && firstPass !== undefined) {
    const fp = Number(firstPass);
    if (Number.isFinite(fp) && fp > 0) {
      good = Math.min(fp, Math.max(0, total - ng));
    }
  }

  // Fallback nếu không có firstPass riêng:
  if (good === null) {
    good = Math.max(0, total - ng);
  }

  const yieldRate = (good / total) * 100;
  return Math.min(100, Math.max(0, Math.round(yieldRate * 10) / 10));
}

/** Tính WIP giữa 2 trạm liên tiếp (Output trạm trước - Output trạm sau; trạm cuối trả về null). */
export function getStationWip(station, index, stations) {
  if (!Array.isArray(stations) || stations.length === 0) return null;

  // Trạm cuối cùng: Hiển thị dấu '—'
  if (index === stations.length - 1) {
    return null;
  }

  // Trạm kế tiếp trong quy trình:
  const nextStation = stations[index + 1];
  if (!nextStation) return null;

  // Công thức chuẩn theo tài liệu yêu cầu:
  // WIP = Output Station trước - Output Station sau
  const currentOutput = Number(station?.actualOutput);
  const nextOutput = Number(nextStation?.actualOutput);

  if (Number.isFinite(currentOutput)) {
    const nextOut = Number.isFinite(nextOutput) ? nextOutput : 0;
    return Math.max(0, currentOutput - nextOut);
  }

  // Fallback theo Lũy kế toàn đơn (CumQty) nếu chưa có số liệu ca:
  const currentCum = Number(station?.cumQty);
  const nextCum = Number(nextStation?.cumQty);
  if (Number.isFinite(currentCum) && currentCum > 0) {
    const nextC = Number.isFinite(nextCum) ? nextCum : 0;
    return Math.max(0, currentCum - nextC);
  }

  return 0;
}

export function getWipLimit(stationConfig, customLimit = null) {
  if (customLimit !== null && customLimit !== undefined && Number(customLimit) > 0) {
    return Number(customLimit);
  }
  return stationConfig?.wipLimit ?? DASHBOARD_CONFIG.wipLimit;
}

/** Tìm trạm nghẽn (tỷ lệ Actual UPH / Target UPH thấp nhất). */
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
  yieldAbnormal: 90, // Tỷ lệ chất lượng < 90% = bất thường chất lượng
  yieldMinSample: 5, // Có từ 5 sản phẩm trở lên mới xét tỷ lệ chất lượng (tránh mẫu 1-2 cái gây báo động giả)
  wipThreshold: 15, // Tồn đọng dở dang >= 15 PCS = nghẽn WIP / chờ giải phóng
  wipRatio: 0.1, // hoặc WIP > 10% kế hoạch ca
};

/** Trạng thái trạm: STOP (chưa chạy), ABNORMAL (lỗi NG cao), WAITING (ứ đọng WIP), RUNNING (bình thường). */
export function getStationStatus(station, { wip = null } = {}) {
  if (!station) return null;

  const input = toNum(station.actualInput) ?? 0;
  const output = toNum(station.actualOutput) ?? 0;
  const ng = toNum(station.ngQty) ?? 0;
  const planOut = toNum(station.planOutput) ?? 0;
  const sampled = output + ng;

  // Chưa chạy / Tạm dừng — Chưa có phôi nào đi vào trạm trong ca
  if (input === 0 && sampled === 0) return 'STOP';

  // ất thường chất lượng (ABNORMAL) — Lỗi NG cao hoặc tỷ lệ chất lượng < 90%
  const yieldPct = calculateYield(station.firstPass, input, output, ng);
  if (
    (yieldPct !== null &&
      sampled >= STATION_STATUS_THRESHOLD.yieldMinSample &&
      yieldPct < STATION_STATUS_THRESHOLD.yieldAbnormal) ||
    (sampled >= STATION_STATUS_THRESHOLD.yieldMinSample && ng >= 3 && ng / sampled > 0.1)
  ) {
    return 'ABNORMAL';
  }

  // Chờ xử lý / Tồn đọng (WAITING) — Lượng WIP dở dang lớn cần giải tỏa
  const effectiveWip =
    wip !== null && wip !== undefined
      ? Number(wip)
      : Number(station.stuckQty ?? station.wip) || Math.max(0, input - output);
  const wipLimit = Math.max(
    STATION_STATUS_THRESHOLD.wipThreshold,
    planOut > 0
      ? planOut * STATION_STATUS_THRESHOLD.wipRatio
      : STATION_STATUS_THRESHOLD.wipThreshold
  );

  if (effectiveWip >= wipLimit) {
    return 'WAITING';
  }

  // Đang chạy bình thường
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

/** Class CSS heatmap theo % đạt kế hoạch (xanh >=95%, vàng 90-94%, đỏ <90%). */
export function getAchievementSlotBadgeStyle(percent, status = 'normal') {
  if (status === 'ramp_up') {
    return 'bg-production-blue/15 text-production-blue border border-production-blue/35 font-medium shadow-2xs';
  }

  const value = Number(percent);
  const { green, yellow } = DASHBOARD_CONFIG.achievementThreshold;

  if (!Number.isFinite(value)) {
    return 'bg-muted/40 text-muted-foreground border border-border/40';
  }
  if (value >= green) {
    return 'bg-[#00e676] text-[#0f172a] font-bold border border-[#00c853]/50 shadow-xs';
  }
  if (value >= yellow) {
    return 'bg-[#ffd32a] text-[#0f172a] font-bold border border-[#f59e0b]/50 shadow-xs';
  }
  return 'bg-[#ff5252] text-[#0f172a] font-bold border border-[#e53935]/50 shadow-xs';
}

/** Tính % đạt kế hoạch thời gian thực theo tiến độ khung giờ. */
export function calculatePacingAchievement({ rawAchievement, slotState, slot, clockTime, shift }) {
  if (slotState === 'future' || rawAchievement === null || rawAchievement === undefined) {
    return { percent: null, status: 'future' };
  }

  const rawVal = Number(rawAchievement);
  if (!Number.isFinite(rawVal)) {
    return { percent: null, status: 'future' };
  }

  // Khung giờ đã hoàn thành (complete / past)
  if (slotState !== 'current') {
    return {
      percent: Math.min(100, Math.round(rawVal)),
      status: 'complete',
    };
  }

  // Khung giờ đang diễn ra (current)
  if (!clockTime || !slot) {
    return {
      percent: Math.min(100, Math.round(rawVal)),
      status: 'current',
    };
  }

  const wallClockMinute = clockTime.getHours() * 60 + clockTime.getMinutes();
  const currentMinute =
    shift?.id === 'night' && wallClockMinute < 480 ? wallClockMinute + 1440 : wallClockMinute;

  const startMin = Number(slot.startMinute) || 0;
  const endMin = Number(slot.endMinute) || startMin + 120;
  const totalSlotMinutes = Math.max(1, endMin - startMin);
  const elapsedMinutes = Math.max(0, Math.min(totalSlotMinutes, currentMinute - startMin));

  // 10 phút đầu ca / khung giờ: nếu chưa có sản phẩm (rawVal = 0) -> Ramp-up, style trung tính
  if (elapsedMinutes <= 10 && rawVal === 0) {
    return {
      percent: 0,
      status: 'ramp_up',
      elapsedMinutes,
      totalSlotMinutes,
    };
  }

  // Tỷ lệ thời gian đã trôi qua (tối thiểu 5% để tránh chia cho 0)
  const timeRatio = Math.max(0.05, elapsedMinutes / totalSlotMinutes);
  // Pacing Rate = (Actual / FullPlan) / timeRatio = rawVal / timeRatio
  const pacingPercent = Math.min(100, Math.round(rawVal / timeRatio));

  return {
    percent: pacingPercent,
    status: 'current',
    elapsedMinutes,
    totalSlotMinutes,
    timeRatio,
  };
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
