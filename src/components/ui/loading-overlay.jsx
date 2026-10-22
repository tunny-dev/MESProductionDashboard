/**
 * LỚP PHỦ CHẶN + SPINNER KHI ĐANG TẢI DỮ LIỆU LẦN ĐẦU.
 *
 * Vì sao phủ CẢ MÀN HÌNH và chặn thao tác: dữ liệu sản lượng đi kèm quyết
 * định (đổi ca, bấm vào line). Người dùng bấm lúc dữ liệu chưa về thì ra
 * màn rỗng rồi tưởng app lỗi. Phủ toàn màn + `aria-busy` là câu trả lời rõ:
 * "đang chờ, chưa bấm được".
 *
 * CHỈ dùng cho lần tải ĐẦU. Lần tải lại (polling 10s) đã có thanh mảnh
 * `RefetchBar` — phủ màn mỗi 10 giây thì màn TV tối đen nhấp nháy.
 */

import { cn } from '@/lib/utils';

/** Vòng tròn quay, viền dày một phần ba. */
export function Spinner({ className, label = 'Đang tải' }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <span className="block size-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
    </span>
  );
}

/**
 * Phủ toàn màn, chặn thao tác, spinner ở chính giữa màn hình.
 *
 * `fixed inset-0` vì người dùng phải không thao tác được ĐÂY, kể cả sidebar —
 * trải sidebar vào lớp phủ thì đổi trang lúc chưa có dữ liệu.
 */
export function LoadingOverlay({ active = false, label, className }) {
  if (!active) return null;

  return (
    <div
      aria-busy="true"
      className={cn(
        'fixed inset-0 z-100 flex flex-col items-center justify-center gap-3',
        'bg-background/80 backdrop-blur-[2px]',
        className
      )}
    >
      <Spinner label={label} />
      {label ? <p className="text-sm font-medium text-muted-foreground">{label}</p> : null}
    </div>
  );
}
