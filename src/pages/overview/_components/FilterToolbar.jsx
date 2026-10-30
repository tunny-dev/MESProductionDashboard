import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatInt } from '@/core/utils/format';
import { useDebouncedValue } from '@/hooks/useDebounce';
import { DateRangePicker } from '@/components/ui/date-picker';
import { STATUS_FILTERS } from '@/pages/overview/utils/statusMap';
import { fromIsoDate, hasActiveFilters } from '@/store/filterStore';

function StatusChip({ label, isActive, count, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap outline-hidden transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10 hover:text-foreground'
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            'text-xs tabular-nums',
            isActive ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterToolbar({
  filters,
  areas,
  counts,
  totalCount,
  onChange,
  onReset,
  showDateRange = false,
}) {
  const { t } = useTranslation();
  const showReset = hasActiveFilters(filters);

  const [queryValue, setQueryValue] = useState(filters.query);
  const debouncedQuery = useDebouncedValue(queryValue, 300);

  const [prevStoreQuery, setPrevStoreQuery] = useState(filters.query);
  if (filters.query !== prevStoreQuery) {
    setPrevStoreQuery(filters.query);
    setQueryValue(filters.query);
  }

  useEffect(() => {
    if (debouncedQuery !== filters.query) onChange({ query: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const clearQuery = () => {
    setQueryValue('');
    onChange({ query: '' });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={queryValue}
            onChange={(event) => setQueryValue(event.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            aria-label={t('filters.searchLabel')}
            className="h-9 pr-8 pl-9"
          />
          {queryValue && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label={t('filters.clearSearch')}
              className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors outline-hidden hover:bg-foreground/5 hover:text-foreground"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
        </div>

        {showDateRange && (
          <DateRangePicker
            className="w-full sm:w-64"
            value={{
              from: fromIsoDate(filters.dateFrom),
              to: fromIsoDate(filters.dateTo),
            }}
            onChange={({ from, to }) =>
              onChange({
                dateFrom: from ? format(from, 'yyyy-MM-dd') : null,
                dateTo: to ? format(to, 'yyyy-MM-dd') : null,
              })
            }
          />
        )}

        <Select
          value={filters.areaId ?? 'all'}
          onValueChange={(value) => onChange({ areaId: value === 'all' ? null : value })}
          items={[
            { value: 'all', label: t('filters.allAreas') },
            ...areas.map((area) => ({ value: area.id, label: area.name })),
          ]}
        >
          <SelectTrigger className="h-9 w-full sm:w-52" aria-label={t('filters.areaLabel')}>
            <SelectValue placeholder={t('filters.allAreas')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allAreas')}</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-md px-2 text-sm font-medium text-foreground/70 transition-colors outline-hidden hover:bg-foreground/5 hover:text-foreground"
          >
            {t('filters.clearFilters')}
          </button>
        )}

        <p className="ml-auto shrink-0 text-xs text-muted-foreground table-nums">
          {showReset || queryValue
            ? t('filters.resultCount', {
                shown: formatInt(counts.shown),
                total: formatInt(totalCount),
              })
            : t('filters.totalCount', { total: formatInt(totalCount) })}
        </p>
      </div>

      <div className="scrollbar-clean -mx-1 overflow-x-auto py-0.5">
        <div
          role="group"
          aria-label={t('filters.statusLabel')}
          className="flex items-center gap-2 px-1"
        >
          {STATUS_FILTERS.map((status) => (
            <StatusChip
              key={status.key}
              label={t(status.labelKey)}
              count={counts.byStatus[status.key] ?? totalCount}
              isActive={filters.status === status.key}
              onClick={() => onChange({ status: status.key })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
