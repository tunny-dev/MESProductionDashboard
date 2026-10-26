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

export const DEFAULT_FILTERS = INITIAL_FILTERS;

export function hasActiveFilters(filters) {
  return (
    Boolean(filters.areaId) ||
    (filters.status && filters.status !== 'all') ||
    Boolean(filters.dateFrom || filters.dateTo)
  );
}

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

export function useFilterActions() {
  return useFilterStore(
    useShallow((state) => ({
      applyFilters: state.applyFilters,
      resetFilters: state.resetFilters,
    }))
  );
}
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
