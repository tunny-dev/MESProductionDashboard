/**
 * Drill-down từ tab Summary sang tab "Unit S/N List".
 *
 * Ba ô có thể bấm ở Summary, mỗi ô một nguồn dữ liệu và một cách hiển thị
 * khác nhau:
 *
 *   WIP        — SN đã nhập vào chuyền nhưng chưa qua trạm cuối: có serial
 *                thật và có trạm đang kẹt.
 *   NOT_INPUT  — đơn vị theo kế hoạch (MF008) chưa nhập. SFCS sinh serial
 *                lúc quét nhập tại trạm đầu, nên các đơn vị này CHƯA CÓ
 *                serial và chưa qua trạm nào. Hiện "Chưa có SN" / "N/A"
 *                thay vì "—" để không bị đọc nhầm là dữ liệu lỗi.
 *   STATION    — SN đã ĐẠT tại một trạm (cột SMT04/SI08/...). Số dòng khớp
 *                đúng số đang hiện ở ô đã bấm; cột Station cho biết SN đó
 *                đang nằm ở đâu.
 *
 * Đặt ở lib/ (không import React) để hook, tab Summary và tab Unit S/N List
 * cùng đọc một nguồn — đổi nhãn ở đây là đổi cả trang.
 */
export const DRILL_WIP = 'wip';
export const DRILL_NOT_INPUT = 'not-input';
export const DRILL_STATION = 'station';

/** Nhãn + chữ thay thế cho từng chế độ drill. */
export const DRILL_META = {
  [DRILL_WIP]: {
    label: 'WIP',
    loadingPhrase: 'serial numbers',
    snPlaceholder: '—',
    stationPlaceholder: '—',
    emptyTitle: 'No serial numbers in WIP',
    emptyHint: 'MO {mo} on line {line} has no unit stuck between stations right now.',
  },
  [DRILL_NOT_INPUT]: {
    label: 'Not Input',
    loadingPhrase: 'planned units not input yet',
    snPlaceholder: 'Chưa có SN',
    stationPlaceholder: 'N/A',
    emptyTitle: 'All planned units are already input',
    emptyHint: 'MO {mo} on line {line} has no unit left from the plan waiting to be input.',
  },
  [DRILL_STATION]: {
    label: 'Station',
    loadingPhrase: 'serial numbers',
    snPlaceholder: '—',
    stationPlaceholder: '—',
    emptyTitle: 'No serial number at this station',
    emptyHint: 'MO {mo} on line {line} has no unit that reached this station yet.',
  },
};

/**
 * Ô nào ở bảng Summary thì mở chế độ drill nào.
 * Cột trạm có key dạng `st:<mã trạm>` → drill theo trạm, kèm mã trạm.
 * @param {string} key key cột (wip | notInput | st:XXX)
 * @returns {{ mode: string, station?: string }}
 */
export function drillFromColumnKey(key) {
  if (typeof key === 'string' && key.startsWith('st:')) {
    return { mode: DRILL_STATION, station: key.slice(3) };
  }
  return { mode: key === 'notInput' ? DRILL_NOT_INPUT : DRILL_WIP };
}

/** Tiêu đề tooltip trên ô có thể bấm — nói rõ bấm vào sẽ thấy gì. */
export function drillTooltip(row, mode, station, value) {
  const where = `MO ${row.mo} on line ${row.line}`;
  const n = Number(value) || 0;
  if (mode === DRILL_NOT_INPUT) {
    return `List ${n} planned units of ${where} that are not input yet`;
  }
  if (mode === DRILL_STATION) {
    return `List ${n} serial numbers of ${where} that reached station ${station}`;
  }
  return `List serial numbers stuck in WIP for ${where}`;
}
