import { useState } from 'react';
import { format } from 'date-fns';
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
  useWipLineOptions,
  useWipModelOptions,
  useWipMoOptions,
} from '@/features/wip-report/hooks/use-wip-report';

const MFG_TYPES = ['SMT', 'DIP', 'FA'];

const EMPTY_FORM = {
  mfgType: 'SMT',
  moCreateDateFrom: null,
  moCreateDateTo: null,
  moDays: '',
  models: [], // multi-select array (part code)
  lines: [], // multi-select array
  mos: [], // multi-select array
};

export function WipQueryTab({ onQuery }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  function handleMfgType(type) {
    setForm((prev) => ({ ...prev, mfgType: type, models: [], lines: [], mos: [] }));
  }

  const { data: lineOptions = [] } = useWipLineOptions({ mfgType: form.mfgType });
  const { data: modelOptions = [] } = useWipModelOptions({
    mfgType: form.mfgType,
    line: form.lines.join(','),
  });
  const { data: moOptions = [] } = useWipMoOptions({
    mfgType: form.mfgType,
    line: form.lines.join(','),
    models: form.models,
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClear() {
    setForm(EMPTY_FORM);
  }

  const canQuery = Boolean(form.moCreateDateFrom && form.moCreateDateTo);

  function handleQuery() {
    if (!canQuery) return;
    onQuery?.({
      ...form,
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
        <div className="flex flex-wrap gap-4">
          {MFG_TYPES.map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="mfgType"
                value={type}
                checked={form.mfgType === type}
                onChange={() => handleMfgType(type)}
                className="accent-primary"
              />
              {type}
            </label>
          ))}
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
        {!canQuery ? (
          <span className="text-xs text-muted-foreground">
            Select MO Create Date to enable Query
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

const TODAY_START = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

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

function MultiSelectDialog({ title, options, getLabel, getValue, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(selected);

  function handleOpen() {
    setDraft(selected);
    setSearch('');
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

  const displayOptions = filtered.length > 0 ? filtered : [];

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

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <Input
            className="h-8"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto rounded border border-border">
            {displayOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No options available
              </p>
            ) : (
              displayOptions.map((o, i) => {
                const val = getValue(o);
                const checked = draft.includes(val);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(val)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover',
                      checked && 'bg-primary/5'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border',
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      )}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{getLabel(o)}</span>
                  </button>
                );
              })
            )}
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
