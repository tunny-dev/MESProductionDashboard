import { useState } from 'react';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { CalendarIcon, ChevronDown, X, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  useWipMfgTypes,
  useWipLineOptions,
  useWipModelOptions,
  useWipMoOptions,
} from '@/features/wip-report/hooks/use-wip-report';
import { SimplePagination } from '@/features/wip-report/components/simple-pagination';

// Số lựa chọn mỗi trang trong dialog multi-select (Model / Line / MO).
const DIALOG_PAGE_SIZE = 20;

// Khoảng "MO Create Date" tối đa cho phép query: max 30
const MAX_RANGE_DAYS = 30;

// Mốc hôm nay (00:00) — dùng để chặn chọn ngày tương lai.
const TODAY_START = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

// Mặc định điền sẵn khoảng 1 tháng gần nhất
const DEFAULT_FORM = {
  mfgType: '',
  moCreateDateFrom: subDays(TODAY_START, MAX_RANGE_DAYS - 1),
  moCreateDateTo: TODAY_START,
  moDays: '',
  models: [], // multi-select array (part code)
  lines: [], // multi-select array
  mos: [], // multi-select array
};

export function WipQueryTab({ onQuery }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const {
    data: mfgTypes = [],
    isLoading: mfgTypesLoading,
    isError: mfgTypesError,
  } = useWipMfgTypes();

  const activeType = mfgTypes.find((t) => t.code === form.mfgType) ?? mfgTypes[0] ?? null;

  function handleMfgType(type) {
    setForm((prev) => ({
      ...prev,
      mfgType: type.code,
      models: [],
      lines: [],
      mos: [],
    }));
  }

  const { data: lineOptions = [] } = useWipLineOptions({ deptCode: activeType?.code });
  const { data: modelOptions = [] } = useWipModelOptions({
    mfgType: activeType?.code,
    line: form.lines.join(','),
  });
  const { data: moOptions = [] } = useWipMoOptions({
    mfgType: activeType?.code,
    line: form.lines.join(','),
    models: form.models,
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClear() {
    setForm(DEFAULT_FORM);
  }

  const canPickDates = Boolean(form.moCreateDateFrom && form.moCreateDateTo);

  const rangeDays = canPickDates
    ? differenceInCalendarDays(form.moCreateDateTo, form.moCreateDateFrom) + 1
    : 0;
  const rangeTooLong = rangeDays > MAX_RANGE_DAYS;
  const rangeReversed = canPickDates && rangeDays <= 0;

  const canQuery = canPickDates && !rangeTooLong && !rangeReversed && Boolean(activeType?.code);

  function handleQuery() {
    if (!canQuery) return;
    onQuery?.({
      ...form,
      mfgType: activeType?.code,
      mfgTypeName: activeType?.name,
      line: form.lines.join(','),
      mo: form.mos.join(','),
      model: form.models,
      moCreateDateFrom: form.moCreateDateFrom
        ? format(form.moCreateDateFrom, 'yyyy/MM/dd')
        : undefined,
      moCreateDateTo: form.moCreateDateTo ? format(form.moCreateDateTo, 'yyyy/MM/dd') : undefined,
    });
  }

  return (
    <div className="w-full max-w-2xl">
      <FormRow label="MFG Type" required>
        <div className="flex min-h-8 flex-wrap items-center gap-4">
          {mfgTypes.map((type) => (
            <label
              key={type.code}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
              title={`${type.name} — gửi xuống SP: ${type.code}`}
            >
              <input
                type="radio"
                name="mfgType"
                value={type.code}
                checked={activeType?.code === type.code}
                onChange={() => handleMfgType(type)}
                className="accent-primary"
              />
              {type.name}
              <span className="text-xs text-muted-foreground">({type.code})</span>
            </label>
          ))}
          {mfgTypes.length === 0 && (
            <span className="text-xs text-muted-foreground">
              {mfgTypesLoading
                ? 'Đang tải bộ phận…'
                : mfgTypesError
                  ? 'Không tải được danh sách bộ phận (getMfgType).'
                  : 'Không có bộ phận nào cho nhà máy này.'}
            </span>
          )}
        </div>
      </FormRow>

      <FormRow label="MO Create Date" required>
        <div className="flex flex-wrap items-center gap-2">
          <DateButton
            value={form.moCreateDateFrom}
            open={fromOpen}
            onOpenChange={setFromOpen}
            onSelect={(d) => {
              set('moCreateDateFrom', d);
              setFromOpen(false);
            }}
          />
          <span className="text-muted-foreground">-</span>
          <DateButton
            value={form.moCreateDateTo}
            open={toOpen}
            onOpenChange={setToOpen}
            onSelect={(d) => {
              set('moCreateDateTo', d);
              setToOpen(false);
            }}
          />
          <span className="rounded bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
            Format: yyyy/mm/dd
          </span>
          <span className="text-xs text-muted-foreground">Max range: {MAX_RANGE_DAYS} days</span>
          <span className="w-full text-xs text-muted-foreground">
            Lọc theo ngày tạo MO, hoặc MO có scan trong khoảng (giống màn MES cũ) — chọn 1 ngày vẫn
            ra hoạt động của ngày đó.
          </span>
        </div>
      </FormRow>

      <FormRow label="MO Days">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">~</span>
          <Input
            className="h-8 w-24"
            value={form.moDays}
            onChange={(e) => set('moDays', e.target.value)}
          />
        </div>
      </FormRow>

      <FormRow label="Model">
        <MultiSelectDialog
          title="Select Models"
          columnLabel="Model"
          numbered
          options={modelOptions}
          getLabel={(o) => {
            const name = o.name ?? o.NAME ?? '';
            const code = o.code ?? o.CODE ?? '';
            return name && code && name !== code ? `${name} (${code})` : name || code || String(o);
          }}
          getValue={(o) => o.code ?? o.CODE ?? String(o)}
          selected={form.models}
          onChange={(v) => set('models', v)}
        />
      </FormRow>

      <FormRow label="Line">
        <MultiSelectDialog
          title="Select Lines"
          columnLabel="Line"
          numbered
          options={lineOptions}
          getLabel={(o) => {
            const id = o.lineId ?? o.LINE ?? o.line ?? '';
            const name = o.lineName ?? o.LINE_NAME ?? '';
            return id && name && name !== id ? `${id} – ${name}` : id || name || String(o);
          }}
          getValue={(o) => o.lineId ?? o.LINE ?? o.line ?? String(o)}
          selected={form.lines}
          onChange={(v) => set('lines', v)}
        />
      </FormRow>

      <FormRow label="MO">
        <MultiSelectDialog
          title="Select MOs"
          columnLabel="MO"
          columns={[
            {
              key: 'stt',
              label: 'STT',
              className: 'w-12 text-right tabular-nums text-muted-foreground',
            },
            { key: 'mo', label: 'MO' },
            { key: 'createDate', label: 'Created Date', className: 'w-28 whitespace-nowrap' },
          ]}
          getRow={(o, i) => ({
            stt: i + 1,
            mo: o.mo ?? o.MO ?? '',
            createDate: formatCellDate(o.createDate ?? o.CREATE_DATE),
          })}
          options={moOptions}
          getLabel={(o) => o.mo ?? o.MO ?? String(o)}
          getValue={(o) => o.mo ?? o.MO ?? String(o)}
          selected={form.mos}
          onChange={(v) => set('mos', v)}
        />
      </FormRow>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleClear} className="w-20">
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleQuery}
          disabled={!canQuery}
          title={canQuery ? undefined : 'Select MO Create Date first'}
          className="w-20"
        >
          Query
        </Button>
        {!canPickDates ? (
          <span className="text-xs text-muted-foreground">
            Select MO Create Date to enable Query
          </span>
        ) : rangeReversed ? (
          <span className="text-xs text-error">End date must be on or after start date</span>
        ) : rangeTooLong ? (
          <span className="text-xs text-error">
            Date range must be within {MAX_RANGE_DAYS} days
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FormRow({ label, required, children }) {
  return (
    <div className="flex min-h-9 items-start gap-3 border-b border-border py-2 last:border-0">
      <span className="w-32 shrink-0 pt-1.5 text-right text-sm text-muted-foreground">
        {required && <span className="mr-0.5 text-error">*</span>}
        {label}:
      </span>
      <div className="flex flex-1 flex-wrap items-start">{children}</div>
    </div>
  );
}

function formatCellDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : format(d, 'yyyy/MM/dd');
}

function DateButton({ value, open, onOpenChange, onSelect }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'h-8 w-34 justify-start gap-1.5 px-2.5 text-sm font-normal',
              !value && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {value ? format(value, 'yyyy/MM/dd') : 'yyyy/mm/dd'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          initialFocus
          disabled={{ after: TODAY_START }}
        />
      </PopoverContent>
    </Popover>
  );
}

function MultiSelectDialog({
  title,
  columnLabel,
  columns,
  numbered = false,
  getRow,
  options,
  getLabel,
  getValue,
  selected,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(selected);

  const tableColumns =
    columns && columns.length > 0
      ? columns
      : numbered
        ? [
            {
              key: '__stt',
              label: 'STT',
              className: 'w-12 text-right tabular-nums text-muted-foreground',
            },
            { key: '__value', label: columnLabel ?? '' },
          ]
        : [{ key: '__value', label: columnLabel ?? '' }];

  function handleOpen() {
    setDraft(selected);
    setSearch('');
    setPage(1);
    setOpen(true);
  }

  function toggle(val) {
    setDraft((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  function handleOk() {
    onChange(draft);
    setOpen(false);
  }

  function removeTag(val) {
    onChange(selected.filter((v) => v !== val));
  }

  const filtered = options.filter((o) => getLabel(o).toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / DIALOG_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * DIALOG_PAGE_SIZE,
    currentPage * DIALOG_PAGE_SIZE
  );

  return (
    <div className="min-w-0 flex-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="outline"
          size="sm"
          className="h-auto min-h-8 w-80 max-w-full justify-between gap-1 px-2 py-1 font-normal"
          onClick={handleOpen}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">Select…</span>
            ) : (
              selected.map((val) => (
                <span
                  key={val}
                  className="inline-flex max-w-40 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                >
                  <span className="truncate">{val}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${val}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        removeTag(val);
                      }
                    }}
                    className="flex shrink-0 cursor-pointer items-center rounded-full hover:text-error"
                  >
                    <X className="size-3" />
                  </span>
                </span>
              ))
            )}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </Button>

        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <Input
            className="h-8"
            placeholder="Search…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            autoFocus
          />

          <div className="max-h-96 overflow-y-auto rounded border border-border">
            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="w-9 border-b border-border px-3 py-2" aria-hidden="true" />
                  {tableColumns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'border-b border-border px-2 py-2 text-left text-xs font-medium text-muted-foreground',
                        col.className
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColumns.length + 1}
                      className="px-3 py-6 text-center text-xs text-muted-foreground"
                    >
                      No options available
                    </td>
                  </tr>
                ) : (
                  pageItems.map((o, i) => {
                    const rowIndex = (currentPage - 1) * DIALOG_PAGE_SIZE + i;
                    const val = getValue(o);
                    const checked = draft.includes(val);
                    const cells = getRow
                      ? getRow(o, rowIndex)
                      : numbered
                        ? { __stt: rowIndex + 1, __value: getLabel(o) }
                        : { __value: getLabel(o) };
                    return (
                      <tr
                        key={i}
                        tabIndex={0}
                        onClick={() => toggle(val)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggle(val);
                          }
                        }}
                        className={cn(
                          'cursor-pointer outline-none transition-colors hover:bg-surface-hover',
                          checked && 'bg-primary/5'
                        )}
                      >
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'flex size-4 items-center justify-center rounded border',
                              checked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input'
                            )}
                          >
                            {checked && <Check className="size-3" />}
                          </span>
                        </td>
                        {tableColumns.map((col) => (
                          <td key={col.key} className={cn('truncate px-2 py-2', col.className)}>
                            {cells[col.key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Total {filtered.length} items</span>
            <SimplePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button size="sm" onClick={handleOk}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
