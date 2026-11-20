import { useQuery } from '@tanstack/react-query';
import { systemLogsService } from '@/services/system-logs.service';

/**
 * Query Key Factory chuẩn hóa cho phân hệ System Logs.
 */
export const systemLogKeys = {
  all: ['system-logs'],
  dates: () => [...systemLogKeys.all, 'dates'],
  traces: (params) => [...systemLogKeys.all, 'traces', params],
  files: (date) => [...systemLogKeys.all, 'files', date ?? ''],
};

export const SYSTEM_LOG_KEYS = systemLogKeys;

/**
 * React Query hook: Fetch available log dates from server
 */
export function useSystemLogDates(options = {}) {
  return useQuery({
    queryKey: systemLogKeys.dates(),
    queryFn: () => systemLogsService.getDates(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

/**
 * React Query hook: Fetch traces with time range, pagination and filters.
 * Supports auto-refresh polling interval and placeholderData for smooth paging.
 */
export function useSystemLogTraces({
  date,
  from,
  to,
  search,
  traceId,
  onlyErrors,
  onlySlow,
  onlySql,
  onlyInfo,
  onlyWarn,
  page = 1,
  pageSize = 20,
  autoRefreshInterval = 0,
  enabled = true,
}) {
  let effSearch = search || '';
  if (onlySql && !effSearch.includes('SQL') && !effSearch.includes('Dapper')) {
    effSearch = effSearch ? `${effSearch} SQL` : 'SQL';
  }
  if (onlyInfo && !effSearch.includes('Information')) {
    effSearch = effSearch ? `${effSearch} Information` : 'Information';
  }
  if (onlyWarn && !effSearch.includes('Warning')) {
    effSearch = effSearch ? `${effSearch} Warning` : 'Warning';
  }

  const queryParams = {
    date,
    from,
    to,
    search: effSearch,
    traceId,
    onlyErrors,
    onlySlow,
    page,
    pageSize,
  };

  return useQuery({
    queryKey: systemLogKeys.traces(queryParams),
    queryFn: async () => {
      return systemLogsService.getTraces(queryParams);
    },
    enabled: !!enabled,
    refetchInterval: autoRefreshInterval > 0 ? autoRefreshInterval * 1000 : false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
    retry: 1,
  });
}

/**
 * React Query hook: Fetch files in a specific date folder
 */
export function useSystemLogFiles(date, options = {}) {
  return useQuery({
    queryKey: systemLogKeys.files(date),
    queryFn: () => systemLogsService.getFiles(date),
    enabled: !!date,
    staleTime: 30 * 1000,
    ...options,
  });
}
