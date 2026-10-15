/**
 * Biến dữ liệu thô từ API thành dữ liệu đã tính toán.
 *
 * Tách khỏi API và khỏi component: cùng một công thức dùng ở bảng tổng quan,
 * trang chi tiết, biểu đồ ngày và màn TV thì phải cho ra cùng một con số.
 * Gộp tính toán vào component là nguồn sai số kinh điển.
 */

import {
  buildCumulativeSeries,
  buildHourlyBuckets,
  calcUph,
  calcYield,
  cumulativeTarget,
  isInRest,
  resolveLineStatus,
  round1,
} from './production-calc';

/**
 * Một dòng line đã tính đủ: sản lượng, target lũy tiến, % đạt, trạng thái, UPH.
 */
export function buildLineView(rawLine, shift, currentMinutes) {
  const passCount = rawLine.scans.reduce((sum, s) => sum + s.pass, 0);
  const failCount = rawLine.scans.reduce((sum, s) => sum + s.fail, 0);

  // Target luôn luỹ tiến tới thời điểm hiện tại, không so với target cả ca.
  const targetSoFar = round1(
    cumulativeTarget({
      shift,
      plannedUph: rawLine.plannedUph,
      fromMinutes: shift.startMinutes,
      toMinutes: currentMinutes,
    })
  );

  const targetFullShift = round1(
    cumulativeTarget({
      shift,
      plannedUph: rawLine.plannedUph,
      fromMinutes: shift.startMinutes,
      toMinutes: shift.endMinutes,
    })
  );

  const minutesSinceLastScan =
    rawLine.lastScanMinutes === null ? null : Math.max(0, currentMinutes - rawLine.lastScanMinutes);
  const resting = isInRest(shift, currentMinutes);

  const status = resolveLineStatus({
    hasWorkOrder: Boolean(rawLine.workOrder),
    passCount,
    target: targetSoFar,
    minutesSinceLastScan,
    stoppedAfterMinutes: rawLine.stoppedAfterMinutes,
    atRiskThreshold: rawLine.atRiskThreshold,
    isResting: resting,
  });

  // UPH của giờ đang chạy (hoặc giờ vừa kết thúc nếu đang giờ nghỉ).
  const currentHourStart = Math.max(shift.startMinutes, Math.floor(currentMinutes / 60) * 60);
  const lastCompletedHourEnd = Math.min(currentMinutes, currentHourStart + 60);
  const hourScans = rawLine.scans.filter(
    (s) => s.minutes >= currentHourStart && s.minutes < lastCompletedHourEnd
  );
  const hourPass = hourScans.reduce((sum, s) => sum + s.pass, 0);
  const currentUph = calcUph({
    shift,
    passCount: hourPass,
    fromMinutes: currentHourStart,
    toMinutes: lastCompletedHourEnd,
  });

  const lastStop = [...(rawLine.stops ?? [])]
    .filter((s) => s.toMinutes <= currentMinutes)
    .sort((a, b) => b.toMinutes - a.toMinutes)[0];

  const activeStop = (rawLine.stops ?? []).find(
    (s) => currentMinutes >= s.fromMinutes && currentMinutes < s.toMinutes
  );

  return {
    ...rawLine,
    areaName: rawLine.areaName ?? rawLine.areaId,
    passCount,
    failCount,
    totalScans: passCount + failCount,
    targetSoFar,
    targetFullShift,
    achievement: targetSoFar > 0 ? round1((passCount / targetSoFar) * 100) : null,
    yield:
      calcYield(passCount, failCount) === null ? null : round1(calcYield(passCount, failCount)),
    currentUph: currentUph === null ? null : round1(currentUph),
    minutesSinceLastScan,
    isResting: resting,
    status,
    lastStop: lastStop ?? null,
    activeStop: activeStop ?? null,
    workOrderNo: rawLine.workOrder?.woNo ?? null,
  };
}

/** Một line kèm chuỗi theo giờ và chuỗi lũy tiến, cho biểu đồ và bảng theo giờ. */
export function buildLineDetailView(lineView, shift, currentMinutes) {
  const buckets = buildHourlyBuckets({
    shift,
    plannedUph: lineView.plannedUph,
    scans: lineView.scans,
    stops: lineView.stops,
    currentMinutes,
  });

  const cumulative = buildCumulativeSeries({
    shift,
    plannedUph: lineView.plannedUph,
    buckets,
    currentMinutes,
  });

  return { ...lineView, buckets, cumulative };
}

/** Toàn bộ nhà máy, đã tính. */
export function buildSnapshotView(snapshot) {
  const { shift, currentMinutes } = snapshot;
  const lines = snapshot.lines.map((raw) => buildLineView(raw, shift, currentMinutes));

  return {
    ...snapshot,
    lines,
    kpi: buildKpi(lines, shift, currentMinutes),
  };
}

/**
 * Dải KPI trên đầu trang tổng quan (doc mục 2).
 *
 * Tổng sản lượng, target đến giờ, % đạt, đếm line theo trạng thái, tổng lỗi.
 */
function buildKpi(lines, shift, currentMinutes) {
  const passCount = sum(lines, (l) => l.passCount);
  const failCount = sum(lines, (l) => l.failCount);

  const targetSoFar = round1(
    lines.reduce(
      (total, l) =>
        total +
        cumulativeTarget({
          shift,
          plannedUph: l.plannedUph,
          fromMinutes: shift.startMinutes,
          toMinutes: currentMinutes,
        }),
      0
    )
  );

  // % đạt của cả nhà máy = tổng thực tế / tổng target, không phải trung bình
  // của các % từng line: trung bình sẽ cho một con số không tương ứng với tổng.
  const achievement = targetSoFar > 0 ? round1((passCount / targetSoFar) * 100) : null;

  const byStatus = (keys) => lines.filter((l) => keys.includes(l.status.key)).length;

  return {
    passCount,
    failCount,
    targetSoFar,
    achievement,
    lineCount: lines.length,
    onTrackCount: byStatus(['onTrack']),
    attentionCount: byStatus(['atRisk', 'behind', 'stopped']),
    noWoCount: byStatus(['noWo', 'idle']),
  };
}

function sum(items, pick) {
  return items.reduce((total, item) => total + pick(item), 0);
}

/**
 * Tổng hợp một nhóm line theo giờ, cho trang biểu đồ ngày.
 *
 * Cộng thực tế của các line trong nhóm, và target của nhóm là tổng target của
 * từng line — đúng vì các line chạy song song.
 */
export function buildGroupHourly(lines, shift, currentMinutes) {
  const bucketCount = (shift.endMinutes - shift.startMinutes) / 60;

  // Gom buckets của từng line MỘT LẦN rồi cộng theo chỉ số giờ. Gọi
  // buildHourlyBuckets bên trong vòng lặp sẽ dựng lại cả ca cho mỗi line ở
  // mỗi giờ: vừa chậm vừa dễ lệch chỉ số khi số line thay đổi.
  const perLine = lines.map((line) =>
    buildHourlyBuckets({
      shift,
      plannedUph: line.plannedUph,
      scans: line.scans,
      stops: line.stops,
      currentMinutes,
    })
  );

  const rows = [];

  for (let i = 0; i < bucketCount; i += 1) {
    const hourStart = shift.startMinutes + i * 60;
    let actual = 0;
    let target = 0;
    let restMinutes = 0;
    let stopMinutes = 0;

    for (const buckets of perLine) {
      const bucket = buckets[i];
      if (!bucket) continue;
      actual += bucket.actual;
      target += bucket.target;
      // Giờ nghỉ là của ca, mọi line cùng nghỉ: lấy giá trị lớn nhất,
      // không cộng lên (cộng sẽ ra gấp số line).
      restMinutes = Math.max(restMinutes, bucket.restMinutes);
      stopMinutes += bucket.stopMinutes;
    }

    rows.push({
      hourMinutes: hourStart,
      label: `${String(Math.floor(hourStart / 60) % 24).padStart(2, '0')}:00`,
      actual,
      target: round1(target),
      gap: round1(actual - target),
      achievement: target > 0 ? round1((actual / target) * 100) : null,
      restMinutes,
      stopMinutes,
      isRest: restMinutes >= 60,
      isFuture: hourStart >= currentMinutes,
    });
  }

  return rows;
}

/** Cùng một chuỗi lũy tiến cho cả nhóm, vẽ chung một biểu đồ. */
export function buildGroupCumulative(rows) {
  const points = [];
  let actual = 0;
  let target = 0;

  for (const row of rows) {
    if (row.isFuture) break;
    actual += row.actual;
    target += row.target;
    points.push({
      minutes: row.hourMinutes,
      label: row.label,
      actual,
      target: round1(target),
      restMinutes: row.restMinutes,
      stopMinutes: row.stopMinutes,
    });
  }

  return points;
}
