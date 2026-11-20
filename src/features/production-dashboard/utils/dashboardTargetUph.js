export const TARGET_UPH_DEFAULT = null;

export const STATION_TARGET_UPH = {};

export function getTargetUph({ process, line, op, apiTarget } = {}) {
  void process;
  void line;
  void op;
  const target = Number(apiTarget);
  return Number.isFinite(target) && target > 0 ? target : null;
}

/**
 * Trạng thái UPH mục tiêu của lượt xem hiện tại - dùng để báo warning mà
 * KHÔNG chặn UI (sản lượng / UPH thực tế vẫn hiển thị bình thường).
 * - `null`    : đã có UPH mục tiêu, hoặc cycle time còn đang tải.
 * - 'missing' : tải cycle time xong nhưng không có UPH mục tiêu nào.
 * - 'error'   : gọi API cycle time lỗi và cũng không có UPH mục tiêu.
 * Khi WIP report đã join sẵn targetUph (hasTarget = true) thì không báo, kể cả
 * API cycle time lỗi - người xem vẫn có số để dùng.
 * @param {object} args
 * @param {boolean} args.hasData Đã có dữ liệu dashboard của lượt tra cứu chưa.
 * @param {boolean} args.hasTarget Có ít nhất 1 trạm mang UPH mục tiêu > 0.
 * @param {'idle'|'loading'|'success'|'error'|undefined} args.cycleTimeStatus
 * @returns {'missing'|'error'|null}
 */
export function resolveUphTargetState({ hasData, hasTarget, cycleTimeStatus } = {}) {
  if (!hasData || hasTarget) return null;
  if (cycleTimeStatus === 'error') return 'error';
  if (cycleTimeStatus === 'success') return 'missing';
  return null;
}
