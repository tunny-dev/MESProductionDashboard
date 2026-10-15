import { DASHBOARD_CONFIG } from '@/features/production-dashboard/lib/dashboard-config';

/** Thời gian tối thiểu để UPH của 1 trạm có ý nghĩa — xem `sanitizeStationUph`. */
const MIN_UPH_SPAN_MIN = 5; // phút

/**
 * Tỷ lệ đạt kế hoạch (%).
 *
 * CHỐNG TRÊN 100%: sản lượng bằng hoặc vượt kế hoạch đều là "đạt", hiển thị
 * 100%. Không chặn thì các ô trạm rất dễ nhảy 176% / 213% / 432% (mẫu thật
 * đã gặp) — người xem tưởng sai số liệu trong khi chỉ là sản lượng dồn về
 * cuối ca.
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
 * UPH thực tế của 1 trạm, loại bỏ số liệu vô nghĩa.
 *
 * BE tính `uphActual = outputQty * 3600 / spanSec` với
 * spanSec = (giây) giữa log đầu và log cuối của trạm. Trạm vừa chạy được
 * vài chục giây thì mẫu số gần 0 nên UPH bộc lên hàng nghìn:
 *
 *   VI5-25C0061S / 12-10 / SX01:  2 đơn trong 1 giây   -> 7.200 PCS/H
 *   VI5-25B0184S / 02-10 / SMT06: 20 đơn trong 11 giây -> 6.545 PCS/H
 *   VI5-25C0222S / 28-09 / SMT06: 3 đơn trong 1 giây  -> 10.800 PCS/H
 *
 * Đó không phải năng suất, chỉ là vài lần quét liên tiếp. Quét toàn DB từ
 * 01/09 (2.113 dòng trạm có số liệu) có 240 dòng chạy dưới 5 phút — chiếm
 * 11,4% — và chúng chính là những cột làm vỡ biểu đồ so sánh trạm.
 *
 * NGUYÊN TẮC: dưới 5 phút thì mẫu chưa đủ để ra một tốc độ → trả null, để
 * UI hiện "—" thay vì số bịa. Không cần thêm điều kiện số đơn: một trạm chạy
 * 8 giờ mới có 3 đơn thì UPH rất thấp nhưng đúng thật, vẫn nên hiện.
 *
 * @param {number|null} apiUph UPH do BE tính (dùng khi đủ dữ liệu).
 * @param {number|null} spanMin Khoảng cách phút giữa log đầu và log cuối.
 * @returns {number|null}
 */
export function sanitizeStationUph(apiUph, spanMin) {
  const span = Number(spanMin);
  if (Number.isFinite(span) && span < MIN_UPH_SPAN_MIN) return null;
  return Number(apiUph) || null;
}

/** Tỷ lệ tốt của trạm = số đạt LẦN ĐẦU ÷ số đầu vào (FPY).
 *
 * Vì sao không dùng "đầu ra ÷ đầu vào": hàng bị NG rồi sửa xong vẫn được quét
 * lại và ghi nhận đạt, nên đầu ra gần như không giảm khi NG tăng. Số thật ở
 * VI1-26902300/A101, trạm AT64 (nhập 390, NG 101, đầu ra 389):
 *
 *   đầu ra ÷ đầu vào        = 389 ÷ 390 = 99.74%   ← NG 101 mà vẫn 99.74%, vô nghĩa
 *   đạt lần đầu ÷ đầu vào  = 290 ÷ 390 = 74.36%   ← phản ánh đúng 101 hàng NG
 *
 * Vì sao không dùng "đầu ra ÷ (đầu ra + NG)": con số 101 đó đã sửa và đạt,
 * tính vào mẫu số lần nữa là trừ hai lần.
 *
 * `firstPass` lấy từ cột TA028 = '1' (đã kiểm chứng TA028='2' khớp đúng với
 * số NG ở mọi trạm). Thiếu số này thì lùi về đầu ra ÷ đầu vào.
 */
export function calculateYield(firstPass, inputQty, actualOutput) {
  const input = Number(inputQty);
  if (!Number.isFinite(input) || input <= 0) return null;

  const good = firstPass === null || firstPass === undefined ? Number(actualOutput) : Number(firstPass);
  if (!Number.isFinite(good)) return null;

  return Math.min((good / input) * 100, 100);
}

// Dữ liệu WIP do backend trả về luôn được ưu tiên; nếu thiếu thì tính chênh lệch giữa hai trạm.
export function getStationWip(station, index, stations, summary) {
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

// Bottleneck là trạm có tỷ lệ Actual UPH / Target UPH thấp nhất, không phải trạm có output thấp nhất.
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

function toNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Ngưỡng cho trạng thái trạm — dùng CHUNG ngưỡng với màu % đạt (95 / 90)
// để cả bảng nói một ngôn ngữ, quản lý không phải nhớ hai bộ tiêu chí.
const STATION_STATUS_THRESHOLD = {
  yieldAbnormal: 95, // tỷ lệ tốt dưới ngưỡng này = bất thường
  slotAbnormal: 90, // % đạt slot vừa kết thúc dưới ngưỡng này = bất thường
  slotWaiting: 95, // từ ngưỡng này trở xuống = chờ xử lý
  yieldMinSample: 30, // dưới mẫu này không xét tỷ lệ tốt (tránh báo động giả)
  idleStopMin: 30, // phút không có log = dừng
  wipRatio: 0.01, // WIP > 1% kế hoạch = chờ xử lý
  wipMin: 50, // hoặc WIP > 50 món, tuỳ cái nào lớn hơn
};

/**
 * Trạng thái 1 trạm: RUNNING / WAITING / ABNORMAL / STOP.
 *
 * Thứ tự đánh giá cố ý đặt Dừng trước Bất thường: khi máy không chạy thì
 * nhân viên cần biết "dừng" trước, sửa xong máy mới xét lại chất lượng.
 *
 * @param {object} station  1 dòng đã chuẩn hoá (actualOutput, ngQty, wip, hourlyAchievement…)
 * @param {object} [opts]
 * @param {number} [opts.lastCompletedSlotIndex] index khung vừa kết thúc (-1 = chưa có)
 * @param {boolean} [opts.isCurrentShift] đang xem ca hiện tại thì mới xét "im lặng"
 * @param {Date} [opts.now] mốc so sánh (mặc định đồng hồ thật)
 */
export function getStationStatus(
  station,
  { lastCompletedSlotIndex = -1, isCurrentShift = false, now = null } = {}
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
    if (lastAt && (ref.getTime() - lastAt.getTime()) / 60000 > STATION_STATUS_THRESHOLD.idleStopMin) {
      return 'STOP';
    }
  }

  const yieldPct = calculateYield(station.firstPass, input, output);
  const wip = input - output;
  const wipLimit = Math.max(planOut * STATION_STATUS_THRESHOLD.wipRatio, STATION_STATUS_THRESHOLD.wipMin);

  // Tín hiệu tốc độ:
  // - đang xem ca hiện tại → % đạt của khung vừa kết thúc (phản ánh diễn biến)
  // - ca đã xong → % đạt cả ca. Không dùng khung cuối vì ca thường kết thúc
  //   không đúng giờ, khung cuối trống sẽ kéo mọi trạm xuống 0% và báo động giả.
  const totalAchv = planOut > 0 ? Math.min((output / planOut) * 100, 100) : null;
  const lastSlotAchv =
    isCurrentShift && lastCompletedSlotIndex >= 0
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

// Mọi ô tỷ lệ dùng cùng ngưỡng cấu hình để màu không bị lệch giữa KPI, bảng và thanh tiến độ.
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

export function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value));
}

/**
 * Định dạng phần trăm — bỏ chữ ",0" ở cuối cho gọn:
 * 100 → "100%",  99.94 → "99.9%",  74.36 → "74.4%".
 */
export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
  const n = Number(value);
  const rounded = Number(n.toFixed(digits));
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  const text = isWhole
    ? String(Math.round(rounded))
    : rounded.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
  return `${text}%`;
}
