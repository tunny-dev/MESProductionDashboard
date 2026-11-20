import { LINE_STATUS } from '@/features/overview/utils/statusMap';

/** Số phút trong một giờ. */
const MINUTES_PER_HOUR = 60;

/**
 * Số phút làm việc hiệu dụng trong khoảng [fromMinutes, toMinutes).
 */
export function effectiveWorkMinutes(shift, fromMinutes, toMinutes) {
  const start = Math.max(fromMinutes, shift.startMinutes);
  const end = Math.min(toMinutes, shift.endMinutes);
  if (end <= start) return 0;

  const totalMinutes = end - start;
  if (!shift.hasRest) return totalMinutes;

  const restFrom = shift.startMinutes + shift.restStartMinutes;
  const restTo = shift.startMinutes + shift.restEndMinutes;
  const restOverlap = Math.max(0, Math.min(end, restTo) - Math.max(start, restFrom));

  return Math.max(0, totalMinutes - restOverlap);
}

/**
 * Target lũy tiến tới một mốc thời gian, theo phút.
 * = UPH kế hoạch × (phút làm việc hiệu dụng từ đầu ca tới mốc).
 */
export function cumulativeTarget({ shift, plannedUph, fromMinutes, toMinutes }) {
  if (!plannedUph || plannedUph <= 0) return 0;
  const minutes = effectiveWorkMinutes(shift, fromMinutes, toMinutes);
  return (plannedUph * minutes) / MINUTES_PER_HOUR;
}

/** Target của một khung giờ, dùng cho bảng "sản lượng theo giờ". */
function hourTarget({ shift, plannedUph, hourStartMinutes, hourEndMinutes }) {
  return cumulativeTarget({
    shift,
    plannedUph,
    fromMinutes: hourStartMinutes,
    toMinutes: hourEndMinutes,
  });
}

/** Kiểm tra thời điểm có thuộc khung giờ nghỉ của ca hay không. */
export function isInRest(shift, minutes) {
  if (!shift || !shift.hasRest) return false;
  if (minutes < shift.startMinutes || minutes >= shift.endMinutes) return false;
  const relative = minutes - shift.startMinutes;
  return relative >= shift.restStartMinutes && relative < shift.restEndMinutes;
}

/** Tính tỷ lệ Yield (%) = (Pass / Total) * 100. */
export function calcYield(passCount, failCount) {
  const total = passCount + failCount;
  if (total <= 0) return null;
  return (passCount / total) * 100;
}

/** Tính UPH theo số phút làm việc hiệu dụng trong khung giờ. */
export function calcUph({ shift, passCount, fromMinutes, toMinutes }) {
  const minutes = effectiveWorkMinutes(shift, fromMinutes, toMinutes);
  if (minutes <= 0) return null;
  return (passCount / minutes) * MINUTES_PER_HOUR;
}

/** Xác định trạng thái chuyền (onTrack, atRisk, behind, stopped, idle, noWo). */
export function resolveLineStatus({
  hasWorkOrder,
  passCount,
  target,
  minutesSinceLastScan,
  stoppedAfterMinutes,
  atRiskThreshold,
  isResting,
}) {
  if (!hasWorkOrder) {
    return { key: 'noWo', ...LINE_STATUS.noWo, achievement: null };
  }

  if (passCount === 0) {
    return { key: 'idle', ...LINE_STATUS.idle, achievement: null };
  }

  if (!isResting && minutesSinceLastScan >= stoppedAfterMinutes) {
    return {
      key: 'stopped',
      ...LINE_STATUS.stopped,
      achievement: target > 0 ? round1((passCount / target) * 100) : null,
      minutesStopped: minutesSinceLastScan,
    };
  }

  const achievement = target > 0 ? round1((passCount / target) * 100) : null;

  if (achievement === null) {
    return { key: 'onTrack', ...LINE_STATUS.onTrack, achievement: null };
  }

  if (achievement >= 100) {
    return { key: 'onTrack', ...LINE_STATUS.onTrack, achievement };
  }
  if (achievement >= atRiskThreshold) {
    return { key: 'atRisk', ...LINE_STATUS.atRisk, achievement };
  }
  return { key: 'behind', ...LINE_STATUS.behind, achievement };
}

/**
 * Gom các mốc theo giờ trong một ca, cho biểu đồ lũy tiến và bảng theo giờ.
 * @param scans  [{ minutes, pass, fail }] đã sắp xếp theo thời gian
 * @param stops  [{ fromMinutes, toMinutes, reason }] các khoảng line dừng
 * @param currentMinutes  mốc "bây giờ"; null = ca đã kết thúc, vẽ trọn ca
 */
export function buildHourlyBuckets({
  shift,
  plannedUph,
  scans,
  stops = [],
  currentMinutes = null,
}) {
  const buckets = [];

  for (
    let hourStart = shift.startMinutes;
    hourStart < shift.endMinutes;
    hourStart += MINUTES_PER_HOUR
  ) {
    const hourEnd = hourStart + MINUTES_PER_HOUR;
    const isFuture = currentMinutes !== null && hourStart >= currentMinutes;

    const restMinutes = restMinutesWithinHour(shift, hourStart);
    const stopMinutes = stops
      .filter((s) => s.fromMinutes < hourEnd && s.toMinutes > hourStart)
      .reduce(
        (sum, s) => sum + (Math.min(s.toMinutes, hourEnd) - Math.max(s.fromMinutes, hourStart)),
        0
      );

    const scansInBucket = isFuture
      ? []
      : scans.filter((s) => s.minutes >= hourStart && s.minutes < hourEnd);

    const pass = scansInBucket.reduce((sum, s) => sum + (Number(s.pass) || 0), 0);
    const fail = scansInBucket.reduce((sum, s) => sum + (Number(s.fail) || 0), 0);
    const target = hourTarget({
      shift,
      plannedUph,
      hourStartMinutes: hourStart,
      hourEndMinutes: hourEnd,
    });

    buckets.push({
      hourMinutes: hourStart,
      label: formatHourLabel(hourStart),
      pass,
      actual: pass,
      fail,
      target: round1(target),
      gap: round1(pass - target),
      // Khung giờ >= 90% target thì đạt
      achievement: target > 0 ? round1((pass / target) * 100) : null,
      restMinutes,
      stopMinutes,
      isRest: restMinutes >= MINUTES_PER_HOUR,
      hasStop: stopMinutes > 0,
      isFuture,
    });
  }

  return buckets;
}

/**
 * Chuỗi điểm cho biểu đồ lũy tiến: mốc giờ + mốc hiện tại.
 * Mốc cuối là "bây giờ" nên đường thực tế kết thúc đúng tại hiện tại, không
 * nối thẳng tới cuối ca rồi đứng phẳng - đường đó nói dối là line vẫn chạy.
 */
export function buildCumulativeSeries({ shift, plannedUph, buckets, currentMinutes }) {
  const points = [];
  let actual = 0;

  for (const bucket of buckets) {
    if (bucket.isFuture) break;
    actual += bucket.actual;
    points.push({
      minutes: bucket.hourMinutes,
      label: bucket.label,
      actual,
      target: round1(
        cumulativeTarget({
          shift,
          plannedUph,
          fromMinutes: shift.startMinutes,
          toMinutes: Math.min(
            bucket.hourMinutes + MINUTES_PER_HOUR,
            currentMinutes ?? shift.endMinutes
          ),
        })
      ),
      restMinutes: bucket.restMinutes,
      stopMinutes: bucket.stopMinutes,
    });
  }

  return points;
}

function restMinutesWithinHour(shift, hourStart) {
  if (!shift.hasRest) return 0;
  const hourEnd = hourStart + MINUTES_PER_HOUR;
  const restFrom = shift.startMinutes + shift.restStartMinutes;
  const restTo = shift.startMinutes + shift.restEndMinutes;
  return Math.max(0, Math.min(hourEnd, restTo) - Math.max(hourStart, restFrom));
}

function formatHourLabel(minutes) {
  const h = Math.floor(minutes / MINUTES_PER_HOUR) % 24;
  return `${String(h).padStart(2, '0')}:00`;
}

/** Làm tròn 1 chữ số thập phân, trả về số (không phải chuỗi). */
export function round1(value) {
  return Math.round(value * 10) / 10;
}
