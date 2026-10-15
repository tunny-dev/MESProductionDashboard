/**
 * Kiểm tra công thức nghiệp vụ bằng số, không bằng mắt.
 *
 * Chạy: node scripts/verify-calc.mjs
 *
 * Mục đích: công thức target lũy tiến là thứ quyết định cả bảng sản lượng có
 * đúng không. Nếu sai, mọi % đạt đều sai mà nhìn bằng mắt rất khó phát hiện.
 */

import {
  buildHourlyBuckets,
  calcUph,
  calcYield,
  cumulativeTarget,
  effectiveWorkMinutes,
  isInRest,
  resolveLineStatus,
} from '../src/features/production/lib/production-calc.js';

let failed = 0;

function check(label, actual, expected) {
  // So chuỗi bằng ===, số bằng sai số cho phép. Trộn hai kiểu mà không rẽ nhánh
  // thì so số với chuỗi ra NaN và mọi phép so đều FAIL.
  const ok =
    typeof expected === 'number' ? Math.abs(actual - expected) < 0.01 : actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}${ok ? '' : ` (cần ${expected})`}`);
}

/** Ca 1: 08:00–16:00, nghỉ trưa 12:00–13:00. */
const CA1 = {
  id: 'CA1',
  name: 'Ca 1',
  startMinutes: 480,
  endMinutes: 960,
  hasRest: true,
  restStartMinutes: 240,
  restEndMinutes: 300,
};

console.log('\n--- Phút làm việc hiệu dụng (đã trừ giờ nghỉ) ---');
// 08:00–12:00: 4 giờ, chưa tới giờ nghỉ
check('08:00–12:00', effectiveWorkMinutes(CA1, 480, 720), 240);
// 08:00–13:00: 4 giờ làm + 1 giờ nghỉ = 4 giờ hiệu dụng
check('08:00–13:00 (qua nghỉ)', effectiveWorkMinutes(CA1, 480, 780), 240);
// 08:00–16:00: 8 giờ trừ 1 giờ nghỉ = 7 giờ
check('cả ca 08:00–16:00', effectiveWorkMinutes(CA1, 480, 960), 420);
// 12:30–13:30: nằm giữa nghỉ, chỉ 30 phút làm việc
check('12:30–13:30 (nằm trong nghỉ)', effectiveWorkMinutes(CA1, 750, 810), 30);
// Ngoài ca
check('ngoài ca', effectiveWorkMinutes(CA1, 1000, 1100), 0);

console.log('\n--- Target luỹ tiến ---');
// 42 UPH × 4 giờ = 168
check(
  'target 08:00–12:00 @42UPH',
  cumulativeTarget({ shift: CA1, plannedUph: 42, fromMinutes: 480, toMinutes: 720 }),
  168
);
// 42 UPH × 7 giờ hiệu dụng cả ca = 294 (KHÔNG phải 336 — đã trừ nghỉ)
check(
  'target cả ca @42UPH',
  cumulativeTarget({ shift: CA1, plannedUph: 42, fromMinutes: 480, toMinutes: 960 }),
  294
);
// 10:00 tức 600 phút: từ 480→600 = 120 phút làm việc, ×42/60 = 84
check(
  'target 08:00–10:00 @42UPH',
  cumulativeTarget({ shift: CA1, plannedUph: 42, fromMinutes: 480, toMinutes: 600 }),
  84
);

console.log('\n--- Giờ nghỉ ---');
check('12:00 là giờ nghỉ', isInRest(CA1, 720) ? 1 : 0, 1);
check('12:59 là giờ nghỉ', isInRest(CA1, 779) ? 1 : 0, 1);
check('13:00 không phải giờ nghỉ', isInRest(CA1, 780) ? 1 : 0, 0);
check('09:00 không phải giờ nghỉ', isInRest(CA1, 540) ? 1 : 0, 0);

console.log('\n--- Yield ---');
check('yield 98/100', calcYield(98, 2), 98);
check('yield chưa có scan = null', calcYield(0, 0) === null ? 1 : 0, 1);

console.log('\n--- UPH chia theo phút làm việc hiệu dụng ---');
// 12:00–13:00 là TRỌN khung nghỉ → 0 phút làm việc, không tính được UPH.
check(
  'UPH qua khung nghỉ trọn vẹn',
  calcUph({ shift: CA1, passCount: 15, fromMinutes: 720, toMinutes: 780 }) === null ? 'null' : 'số',
  'null'
);
// 12:30–13:30: 30 phút làm việc (30 phút đầu đang nghỉ).
// 15 sản phẩm / 0,5 giờ = 30 UPH. Chia cho 60 sẽ ra 15 và báo UPH thấp oan.
check(
  'UPH qua không nghỉ một nửa',
  calcUph({ shift: CA1, passCount: 15, fromMinutes: 750, toMinutes: 810 }),
  30
);

console.log('\n--- Trạng thái line ---');
const base = { hasWorkOrder: true, stoppedAfterMinutes: 12, atRiskThreshold: 90, isResting: false };

// Đạt: 120/100 = 120%
check(
  '120% là Đạt',
  resolveLineStatus({ ...base, passCount: 120, target: 100, minutesSinceLastScan: 1 }).key,
  'onTrack'
);
// Đúng 100%
check(
  '100% là Đạt',
  resolveLineStatus({ ...base, passCount: 100, target: 100, minutesSinceLastScan: 1 }).key,
  'onTrack'
);
// 95% → Cảnh báo (>= 90)
check(
  '95% là Cảnh báo',
  resolveLineStatus({ ...base, passCount: 95, target: 100, minutesSinceLastScan: 1 }).key,
  'atRisk'
);
// 90% → Cảnh báo (biên dưới)
check(
  '90% là Cảnh báo',
  resolveLineStatus({ ...base, passCount: 90, target: 100, minutesSinceLastScan: 1 }).key,
  'atRisk'
);
// 89% → Trễ
check(
  '89% là Trễ',
  resolveLineStatus({ ...base, passCount: 89, target: 100, minutesSinceLastScan: 1 }).key,
  'behind'
);
// Không có WO
check(
  'không WO là Chưa có WO',
  resolveLineStatus({
    ...base,
    hasWorkOrder: false,
    passCount: 0,
    target: 0,
    minutesSinceLastScan: 0,
  }).key,
  'noWo'
);
// Dừng: 20 phút không scan
const stopped = resolveLineStatus({
  ...base,
  passCount: 100,
  target: 100,
  minutesSinceLastScan: 20,
});
check('dừng 20 phút', stopped.key, 'stopped');
check('số phút dừng được ghi kèm', stopped.minutesStopped, 20);
// ĐANG GIỜ NGHỈ thì không phán Dừng — đây là ca quan trọng nhất của logic
const resting = resolveLineStatus({
  ...base,
  passCount: 100,
  target: 100,
  minutesSinceLastScan: 20,
  isResting: true,
});
check('đang nghỉ thì không báo Dừng', resting.key, 'onTrack');

console.log('\n--- Gom theo giờ ---');
// Ca 1 bắt đầu 08:00 = phút 480, nên bucket[i] ứng với giờ 08:00 + i.
// Phút 600 là 10:00, không phải 09:00.
const scans = [
  { minutes: 481, pass: 1, fail: 0 }, // 08:01 → bucket 0
  { minutes: 482, pass: 1, fail: 0 }, // 08:02 → bucket 0
  { minutes: 600, pass: 1, fail: 0 }, // 10:00 → bucket 2
  { minutes: 601, pass: 1, fail: 0 }, // 10:01 → bucket 2
  { minutes: 720, pass: 1, fail: 0 }, // 12:00 → bucket 4 (trùng khung nghỉ)
  { minutes: 785, pass: 1, fail: 0 }, // 13:05 → bucket 5
];
const buckets = buildHourlyBuckets({
  shift: CA1,
  plannedUph: 60,
  scans,
  stops: [{ fromMinutes: 595, toMinutes: 610, reason: 'test' }],
  currentMinutes: 800,
});

check('số khung giờ của ca 8h', buckets.length, 8);
check('khung 08:00 có 2 sản phẩm', buckets[0].actual, 2);
check('khung 08:00 target = 60UPH × 1h = 60', buckets[0].target, 60);
check('nhãn khung đầu là 08:00', buckets[0].label, '08:00');
check('khung 09:00 rỗng', buckets[1].actual, 0);
check('khung 09:00 ghi nhận lúc dừng 09:55–10:10', buckets[1].hasStop ? 1 : 0, 1);
check('khung 10:00 có 2 sản phẩm', buckets[2].actual, 2);
check('khung 12:00 là giờ nghỉ', buckets[4].isRest ? 1 : 0, 1);
check('khung 12:00 có 1 scan dù đang nghỉ', buckets[4].actual, 1);
check('khung 13:00 đã qua nghỉ nên target = 60', buckets[5].target, 60);
check('khung 14:00 là tương lai', buckets[6].isFuture ? 1 : 0, 1);
check('khung 15:00 là tương lai', buckets[7].isFuture ? 1 : 0, 1);

console.log(`\n${failed === 0 ? 'TẤT CẢ ĐỀU ĐÚNG' : `${failed} KIỂM TRA SAI`}`);
process.exit(failed === 0 ? 0 : 1);
