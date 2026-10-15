/**
 * Store bộ lọc dùng chung cho trang Tổng quan và trang Biểu đồ ngày.
 *
 * Vì sao dùng zustand thay vì URL: bộ lọc sống qua nhiều màn và cần "giữ chỗ"
 * khi điều hướng. Khi muốn chia sẻ bộ lọc qua link (doc mục 2: "Mở bộ lọc này
 * trên màn hình TV") thì đọc từ store và dựng URL, không để bộ lọc nằm trong
 * URL sẵn.
 *
 * Chỉ lưu bộ lọc, không lưu dữ liệu: dữ liệu là của react-query.
 *
 * Vì sao nằm ở `src/store/` chứ không ở `features/production/store/`: đây là
 * store dùng chung cho NHIỀU feature (trang Tổng quan, trang Biểu đồ, màn TV),
 * nên nó không thuộc về riêng feature nào. Mọi store zustand của app đặt cùng
 * cấp `src`, còn dữ liệu chỉ dùng trong một feature thì để `useQuery` trong
 * feature đó, không dựng store.
 */

import { format } from 'date-fns';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { persist } from 'zustand/middleware';

/** Date → 'yyyy-MM-dd' theo GIỜ ĐỊA PHƯƠNG, không qua toISOString.
 *  `toISOString()` đổi sang UTC nên 00:00 ở VN thành hôm trước — lọc sai một ngày. */
function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd');
}

/** Ngày ở định dạng ISO của store → Date mà DatePicker hiểu (nửa đêm local). */
export function fromIsoDate(iso) {
  if (!iso) return undefined;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const INITIAL_FILTERS = {
  areaId: null,
  query: '',
  status: 'all',
  /** Khoảng ngày ở dạng ISO 'yyyy-MM-dd', rỗng = không lọc. */
  dateFrom: null,
  dateTo: null,
};

export const useFilterStore = create()(
  persist(
    (set) => ({
      ...INITIAL_FILTERS,

      setArea: (areaId) => set({ areaId }),
      setQuery: (query) => set({ query }),
      setStatus: (status) => set({ status }),

      /** Khoảng ngày: nhận cả hai đầu, thiếu đầu nào thì bỏ lọc đầu đó. */
      setDateRange: ({ from, to }) =>
        set({
          dateFrom: from ? toIsoDate(from) : null,
          dateTo: to ? toIsoDate(to) : null,
        }),

      /** Gộp nhiều thay đổi vào một lần gọi, tránh render hai lần. */
      applyFilters: (patch) => set(patch),

      resetFilters: () => set(INITIAL_FILTERS),
    }),
    {
      name: 'sfcs-filters',
      partialize: (state) => ({
        areaId: state.areaId,
        query: state.query,
        status: state.status,
        dateFrom: state.dateFrom,
        dateTo: state.dateTo,
      }),
    }
  )
);

/** Bộ lọc mặc định dùng khi muốn một bản sạch, không đọc từ store đã lưu. */
export const DEFAULT_FILTERS = INITIAL_FILTERS;

/**
 * Bộ lọc có đang lọc gì không.
 *
 * Suy ra từ bộ lọc chứ không lưu trong store: hai nơi cùng giữ một cờ boolean
 * là chỗ chúng lệch nhau. Ô tìm đã có nút X riêng, nên chỉ tính xưởng và trạng thái.
 */
export function hasActiveFilters(filters) {
  return (
    Boolean(filters.areaId) ||
    (filters.status && filters.status !== 'all') ||
    Boolean(filters.dateFrom || filters.dateTo)
  );
}

/**
 * Đọc bộ lọc từ store.
 *
 * PHẢI bọc `useShallow`: selector trả về object mới sẽ khác tham chiếu mỗi
 * lần render, React so sánh bằng tham chiếu và render lại vô hạn — lỗi
 * "getSnapshot should be cached" / "Maximum update depth exceeded".
 *
 * Chọn 3 giá trị rời thì không cần useShallow, nhưng dùng chung một cách gọi ở
 * mọi trang để không phải nhớ quy tắc theo từng chỗ.
 */
export function useFilters() {
  return useFilterStore(
    useShallow((state) => ({
      areaId: state.areaId,
      query: state.query,
      status: state.status,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
    }))
  );
}

/** Gọi action của store: các hàm này giữ nguyên tham chiếu nên không cần shallow. */
export function useFilterActions() {
  return useFilterStore(
    useShallow((state) => ({
      applyFilters: state.applyFilters,
      resetFilters: state.resetFilters,
    }))
  );
}

/**
 * Lọc danh sách line theo bộ lọc.
 *
 * `status: 'attention'` là nhóm gộp (cảnh báo + trễ + dừng), vì người xem
 * hỏi "có gì cần xử lý" chứ không phải "loại nào trong ba loại".
 */
export function applyFilters(lines, filters) {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return lines.filter((line) => {
    if (filters.areaId && line.areaId !== filters.areaId) return false;

    if (query) {
      const haystack = [line.lineId, line.model, line.workOrderNo ?? '', line.areaName]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.status === 'attention') {
      return ['atRisk', 'behind', 'stopped'].includes(line.status.key);
    }
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'noWo') return ['noWo', 'idle'].includes(line.status.key);
      return line.status.key === filters.status;
    }

    return true;
  });
}
