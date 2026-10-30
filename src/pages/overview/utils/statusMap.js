/**
 * Bảng trạng thái DUY NHẤT của app (luật D2).
 *
 * Mọi bề mặt — bảng tổng quan, thẻ TV, bảng KPI, biểu đồ — đều tra bảng này.
 * Thêm trạng thái mới thì khai ở đây một lần, không khai lại ở từng màn.
 *
 * Màu bám đúng doc.md mục 5:
 *   đạt #1e8e5a · cảnh báo #b7791f · trễ/dừng #c0392b · chưa chạy #6b7785
 *
 * Màu KHÔNG đứng một mình: luôn có chữ đi kèm (luật N4).
 */
export const LINE_STATUS = {
  onTrack: {
    key: 'onTrack',
    // Nhãn nằm trong JSON ngôn ngữ, không viết cứng ở đây. `label` trỏ về tiếng
    // Việt chỉ để `verify-calc.mjs` và script kiểm tra đọc được khi không bật
    // React; mọi component dùng `useStatusLabel()`.
    labelKey: 'status.onTrack',
    label: 'Đạt',
    color: 'var(--success)',
    bg: 'var(--success-bg)',
    // Chữ dùng bản đậm hơn để đạt 4.5:1 trên nền badge nhạt
    text: 'var(--success-text)',
    badge: 'bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-inset ring-black/5',
    dot: 'bg-[var(--success)]',
  },
  atRisk: {
    key: 'atRisk',
    labelKey: 'status.atRisk',
    label: 'Cảnh báo',
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
    text: 'var(--warning-text)',
    badge: 'bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-inset ring-black/5',
    dot: 'bg-[var(--warning)]',
  },
  behind: {
    key: 'behind',
    labelKey: 'status.behind',
    label: 'Trễ',
    color: 'var(--error)',
    bg: 'var(--error-bg)',
    text: 'var(--error-text)',
    badge: 'bg-[var(--error-bg)] text-[var(--error-text)] ring-1 ring-inset ring-black/5',
    dot: 'bg-[var(--error)]',
  },
  stopped: {
    key: 'stopped',
    labelKey: 'status.stopped',
    label: 'Dừng',
    color: 'var(--error)',
    bg: 'var(--error-bg)',
    text: 'var(--error-text)',
    badge: 'bg-[var(--error-bg)] text-[var(--error-text)] ring-1 ring-inset ring-black/5',
    dot: 'bg-[var(--error)]',
  },
  noWo: {
    key: 'noWo',
    labelKey: 'status.noWo',
    label: 'Chưa có WO',
    color: 'var(--neutral)',
    bg: 'var(--neutral-bg)',
    text: 'var(--neutral-text)',
    badge: 'bg-[var(--neutral-bg)] text-[var(--neutral-text)] ring-1 ring-inset ring-black/5',
    dot: 'bg-[var(--neutral)]',
  },
  idle: {
    key: 'idle',
    labelKey: 'status.idle',
    label: 'Chưa chạy',
    color: 'var(--neutral)',
    bg: 'var(--neutral-bg)',
    text: 'var(--neutral-text)',
    badge: 'bg-[var(--neutral-bg)] text-[var(--neutral-text)] ring-1 ring-inset ring-black/5',
    dot: 'bg-[var(--neutral)]',
  },
};

/** Trạng thái dùng cho bộ lọc nhanh trên thanh công cụ. */
export const STATUS_FILTERS = [
  { key: 'all', labelKey: 'status.filterAll' },
  { key: 'attention', labelKey: 'status.filterAttention' },
  { key: 'onTrack', labelKey: 'status.filterOnTrack' },
  { key: 'noWo', labelKey: 'status.filterNoWo' },
];

/** Ba nhóm trạng thái mà người xem cần đếm nhanh trên dải KPI và trên TV. */
export const STATUS_GROUPS = {
  onTrack: [LINE_STATUS.onTrack],
  attention: [LINE_STATUS.atRisk, LINE_STATUS.behind, LINE_STATUS.stopped],
  idle: [LINE_STATUS.noWo, LINE_STATUS.idle],
};
