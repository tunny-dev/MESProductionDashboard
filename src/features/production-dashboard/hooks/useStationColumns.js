import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '@/core/utils/storage';

const STORAGE_KEY = 'station_visible_columns_v2';

export const DEFAULT_STATION_COLUMNS = {
  planInput: true, // Kế hoạch đầu vào
  actualInput: true, // Thực tế đầu vào
  planOutput: true, // Kế hoạch đầu ra
  actualOutput: true, // Thực tế đầu ra
  targetUph: true, // UPH mục tiêu
  actualUph: true, // UPH thực tế
  wip: true, // Tồn dở dang (WIP)
  hourlyAchievement: true, // Tiến độ 6 khung giờ
  yield: true, // Tỷ lệ chất lượng (%)
  ngQty: true, // Số lượng NG (cột gốc với NgCell)
  totalPass: true, // Tổng Pass trong ca (cột mới)
  totalNg: true, // Tổng NG trong ca (cột mới)
  status: true, // Trạng thái trạm
};

export const STATION_COLUMN_DEFINITIONS = [
  {
    id: 'planInput',
    groupKey: 'output',
    fallbackLabel: 'Kế hoạch đầu vào',
    fallbackGroup: 'Sản lượng',
  },
  {
    id: 'actualInput',
    groupKey: 'output',
    fallbackLabel: 'Thực tế đầu vào',
    fallbackGroup: 'Sản lượng',
  },
  {
    id: 'planOutput',
    groupKey: 'output',
    fallbackLabel: 'Kế hoạch đầu ra',
    fallbackGroup: 'Sản lượng',
  },
  {
    id: 'actualOutput',
    groupKey: 'output',
    fallbackLabel: 'Thực tế đầu ra',
    fallbackGroup: 'Sản lượng',
  },
  {
    id: 'targetUph',
    groupKey: 'performance',
    fallbackLabel: 'UPH mục tiêu',
    fallbackGroup: 'Hiệu năng',
  },
  {
    id: 'actualUph',
    groupKey: 'performance',
    fallbackLabel: 'UPH thực tế',
    fallbackGroup: 'Hiệu năng',
  },
  {
    id: 'wip',
    groupKey: 'performance',
    fallbackLabel: 'Tồn dở dang (WIP)',
    fallbackGroup: 'Hiệu năng',
  },
  {
    id: 'hourlyAchievement',
    groupKey: 'shiftProgress',
    fallbackLabel: 'Tiến độ 6 khung giờ (%)',
    fallbackGroup: 'Tiến độ ca',
  },
  {
    id: 'yield',
    groupKey: 'quality',
    fallbackLabel: 'Tỷ lệ chất lượng (%)',
    fallbackGroup: 'Chất lượng',
  },
  {
    id: 'ngQty',
    groupKey: 'quality',
    fallbackLabel: 'NG tồn đọng (chưa sửa/retest)',
    fallbackGroup: 'Chất lượng',
  },
  {
    id: 'totalPass',
    groupKey: 'quality',
    fallbackLabel: 'Tổng Pass trong ca',
    fallbackGroup: 'Chất lượng',
  },
  {
    id: 'totalNg',
    groupKey: 'quality',
    fallbackLabel: 'Tổng phát sinh NG trong ca',
    fallbackGroup: 'Chất lượng',
  },
  {
    id: 'status',
    groupKey: 'operation',
    fallbackLabel: 'Trạng thái trạm',
    fallbackGroup: 'Vận hành',
  },
];

export function useStationColumns() {
  const [columns, setColumns] = useState(() => {
    const saved = storage.getJSON(STORAGE_KEY, null);
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_STATION_COLUMNS, ...saved };
    }
    return DEFAULT_STATION_COLUMNS;
  });

  // Đồng bộ cấu hình vào storage dùng chung của dự án
  useEffect(() => {
    storage.setJSON(STORAGE_KEY, columns);
  }, [columns]);

  const toggleColumn = useCallback((columnId) => {
    setColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  }, []);

  const selectAll = useCallback(() => {
    const all = {};
    for (const key of Object.keys(DEFAULT_STATION_COLUMNS)) {
      all[key] = true;
    }
    setColumns(all);
  }, []);

  const resetDefault = useCallback(() => {
    setColumns(DEFAULT_STATION_COLUMNS);
  }, []);

  const activeCount = useMemo(() => {
    return Object.values(columns).filter(Boolean).length;
  }, [columns]);

  const totalCount = Object.keys(DEFAULT_STATION_COLUMNS).length;

  return {
    columns,
    toggleColumn,
    selectAll,
    resetDefault,
    activeCount,
    totalCount,
  };
}

export default useStationColumns;
