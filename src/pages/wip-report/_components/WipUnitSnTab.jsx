import { useMemo, useState } from 'react';
import { Download, Loader2, SearchX, X } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeWipUnitSnRows } from '@/services/wipReport.service';
import { useWipUnitSnList } from '@/hooks/useWipReport';
import {
  DRILL_META,
  DRILL_NOT_INPUT,
  DRILL_WIP,
  DRILL_STATION,
} from '@/pages/wip-report/utils/wipDrill';

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

const COLS = [
  { key: 'seq', label: '#', w: 50, minW: 50, align: 'center' },
  { key: 'sn', label: 'S/N', w: 160, minW: 140, wrap: true },
  { key: 'mo', label: 'MO', w: 150, minW: 130, wrap: true },
  { key: 'model', label: 'Model', w: 220, minW: 180, wrap: true },
  { key: 'partNumber', label: 'Part Number', w: 150, minW: 120, wrap: true },
  { key: 'line', label: 'Line', w: 140, minW: 120, wrap: true },
  { key: 'station', label: 'Station', w: 170, minW: 130, wrap: true },
];

export function WipUnitSnTab({ selection, params, queryKey, onBackToSummary }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const mode = selection?.mode ?? DRILL_WIP;
  const meta = DRILL_META[mode] ?? DRILL_META[DRILL_WIP];
  const snPlaceholder =
    mode === DRILL_NOT_INPUT ? meta.snPlaceholder : DRILL_META[DRILL_WIP].snPlaceholder;
  const stationPlaceholder =
    mode === DRILL_NOT_INPUT ? meta.stationPlaceholder : DRILL_META[DRILL_WIP].stationPlaceholder;

  const enabled = Boolean(selection?.mo && selection?.line);
  const { data, isLoading, error, refetch } = useWipUnitSnList({
    params,
    mo: selection?.mo,
    line: selection?.line,
    source: mode,
    station: mode === DRILL_STATION ? selection?.station : undefined,
    enabled,
    queryKey,
  });

  const rows = useMemo(() => normalizeWipUnitSnRows(data), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => searchableText(r, snPlaceholder, stationPlaceholder).includes(q));
  }, [rows, search, snPlaceholder, stationPlaceholder]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!enabled) {
    return (
      <EmptyState
        title="No MO-line selected"
        hint="Click a WIP or NotInput number in the Summary tab to list the units of that MO."
        action={onBackToSummary ? { label: 'Back to Summary', onClick: onBackToSummary } : null}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-2" role="status" aria-live="polite" aria-label="Loading unit list">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Loading {meta.loadingPhrase}…
        </div>
        <div className="space-y-1.5" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load the unit list"
        hint={error.message ?? 'Request failed. Try again.'}
        action={{ label: 'Retry', onClick: () => refetch() }}
      />
    );
  }

  if (totalItems === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <ContextBar selection={selection} meta={meta} total={rows.length} />
        <FilterBar
          search={search}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onClear={() => {
            setSearch('');
            setPage(1);
          }}
        />
        <div className="rounded-lg border border-border">
          <EmptyState
            variant="plain"
            title={search ? `No unit matches “${search}”` : meta.emptyTitle}
            hint={
              search
                ? `This MO-line has ${rows.length} unit${rows.length === 1 ? '' : 's'} in ${meta.label} — none matches the filter.`
                : meta.emptyHint.replace('{mo}', selection.mo).replace('{line}', selection.line)
            }
            action={
              search
                ? {
                    label: 'Clear filter',
                    onClick: () => {
                      setSearch('');
                      setPage(1);
                    },
                  }
                : onBackToSummary
                  ? { label: 'Back to Summary', onClick: onBackToSummary }
                  : null
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <ContextBar selection={selection} meta={meta} total={totalItems} />

      <FilterBar
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onClear={() => {
          setSearch('');
          setPage(1);
        }}
      />

      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border">
        <table
          style={{
            width: '100%',
            minWidth: '960px',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
          className="text-xs [&_td]:border-b [&_td]:border-r [&_td]:border-border [&_td:last-child]:border-r-0 [&_th]:border-b [&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0"
        >
          <caption className="sr-only">
            Units of MO {selection.mo} on line {selection.line} — {meta.label}
          </caption>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-muted, #f0f3f5)' }}>
              {COLS.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.w === 'auto' ? undefined : col.w,
                    minWidth: col.minW || col.w,
                    textAlign: col.align === 'center' ? 'center' : 'left',
                    backgroundColor: 'var(--color-muted, #f0f3f5)',
                  }}
                  className="px-2 py-2 font-medium whitespace-nowrap text-foreground leading-tight"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={`${row.sn || 'pending'}-${i}`}
                className="transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      width: col.w === 'auto' ? undefined : col.w,
                      minWidth: col.minW || col.w,
                      textAlign: col.align === 'center' ? 'center' : 'left',
                    }}
                    title={cellText(row, col.key, snPlaceholder, stationPlaceholder) || undefined}
                    className={cn(
                      col.wrap
                        ? 'px-2 py-1.5 break-words whitespace-normal'
                        : 'overflow-hidden px-2 py-1.5 text-ellipsis whitespace-nowrap',
                      col.align === 'center' && 'table-nums',
                      isPlaceholder(row, col.key) && 'text-muted-foreground italic'
                    )}
                  >
                    {cellContent(row, col.key, snPlaceholder, stationPlaceholder)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="shrink-0 text-muted-foreground">Total {totalItems} items</span>
        <div className="flex items-center gap-1">
          <NavBtn disabled={currentPage === 1} onClick={() => setPage(1)} label="First">
            «
          </NavBtn>
          <NavBtn
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            label="Prev"
          >
            ‹
          </NavBtn>
          {getPaginationRange(currentPage, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === currentPage ? 'default' : 'outline'}
                size="icon-xs"
                onClick={() => setPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? 'page' : undefined}
              >
                {p}
              </Button>
            )
          )}
          <NavBtn
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            label="Next"
          >
            ›
          </NavBtn>
          <NavBtn
            disabled={currentPage === totalPages}
            onClick={() => setPage(totalPages)}
            label="Last"
          >
            »
          </NavBtn>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-6 rounded border border-input bg-transparent px-1 text-xs outline-none"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ContextBar({ selection, meta, total }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <Chip label={meta.label} value={`${total} unit${total === 1 ? '' : 's'}`} />
      <Chip label="MO" value={selection.mo} />
      <Chip
        label="Line"
        value={selection.lineName ? `${selection.line} – ${selection.lineName}` : selection.line}
      />
      <Chip label="Model" value={selection.model} />
      <Chip label="Part Number" value={selection.partNumber} />
    </div>
  );
}

function FilterBar({ search, onSearch, onClear }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div className="relative w-64">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Filter S/N, model, station…"
          className="h-8 pr-7 text-xs"
          aria-label="Filter serial numbers"
        />
        {search ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear filter"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <Button variant="outline" size="icon-sm" aria-label="Download">
        <Download className="size-3.5" />
      </Button>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value || '—'}</span>
    </span>
  );
}

function cellContent(row, key, snPlaceholder, stationPlaceholder) {
  if (key === 'line') {
    return (
      <span className="block">
        <span className="block font-medium">{row.line || '—'}</span>
        {row.lineName ? (
          <span className="block truncate text-muted-foreground">{row.lineName}</span>
        ) : null}
      </span>
    );
  }
  if (key === 'station') {
    if (!row.station) return stationPlaceholder;
    return (
      <span className="block">
        <span className="block font-medium">{row.station}</span>
        {row.stationName ? (
          <span className="block truncate text-muted-foreground">{row.stationName}</span>
        ) : null}
      </span>
    );
  }
  if (key === 'sn') return row.sn || snPlaceholder;
  const value = row[key];
  return value === '' || value === undefined ? '—' : value;
}

function isPlaceholder(row, key) {
  if (key === 'sn') return !row.sn;
  if (key === 'station') return !row.station;
  return false;
}

function cellText(row, key, snPlaceholder, stationPlaceholder) {
  if (key === 'line') return [row.line, row.lineName].filter(Boolean).join(' – ');
  if (key === 'station')
    return row.station
      ? [row.station, row.stationName].filter(Boolean).join(' – ')
      : stationPlaceholder;
  if (key === 'sn') return row.sn || snPlaceholder;
  return row[key] ?? '';
}

function searchableText(row, snPlaceholder, stationPlaceholder) {
  return cellText(row, 'sn', snPlaceholder, stationPlaceholder)
    .concat(
      ' ',
      cellText(row, 'model', snPlaceholder, stationPlaceholder),
      ' ',
      cellText(row, 'partNumber', snPlaceholder, stationPlaceholder),
      ' ',
      cellText(row, 'station', snPlaceholder, stationPlaceholder)
    )
    .toLowerCase();
}

function EmptyState({ title, hint, action, variant = 'card' }) {
  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-2 px-4 py-10 text-center',
        variant === 'card' && 'rounded-lg border border-dashed border-border bg-surface'
      )}
    >
      <SearchX className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="max-w-[52ch] text-xs text-muted-foreground">{hint}</p> : null}
      {action ? (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function NavBtn({ disabled, onClick, label, children }) {
  return (
    <Button
      variant="outline"
      size="icon-xs"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function getPaginationRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
