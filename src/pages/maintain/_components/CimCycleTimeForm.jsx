import { useState, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/common/LoadingButton';
import { cn } from '@/core/utils/utils';
import { useCctMfgTypes, useCctLines, useCctModels } from '@/hooks/useCimCycleTime';
import { validateCctForm } from '@/validations/cimCycleTimeSchema';

// Helpers
const EMPTY_FORM = {
  modelName: '',
  partNumber: '',
  mfgType: '',
  stage: '',
  stageDes: '',
  peopleCount: '',
  stationCount: '',
  cycleTime: '',
  targetUph: '',
  effectiveFrom: '',
  effectiveTo: '',
};

function formFromRow(row) {
  if (!row) return EMPTY_FORM;
  const fmtDate = (v) => (v ? String(v).slice(0, 10) : '');
  return {
    modelName: row.modelName ?? '',
    partNumber: row.partNumber ?? '',
    mfgType: row.mfgType ?? '',
    stage: row.stage ?? '',
    stageDes: row.stageDes ?? '',
    peopleCount: row.peopleCount != null ? String(row.peopleCount) : '',
    stationCount: row.stationCount != null ? String(row.stationCount) : '',
    cycleTime: row.cycleTime != null ? String(row.cycleTime) : '',
    targetUph: row.targetUph != null ? String(row.targetUph) : '',
    effectiveFrom: fmtDate(row.effectiveFrom),
    effectiveTo: fmtDate(row.effectiveTo),
  };
}

function strToDate(str) {
  if (!str) return undefined;
  const d = parse(str, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

// ---------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------
function DatePicker({ value, onChange, placeholder = 'Chọn ngày', error }) {
  const [open, setOpen] = useState(false);
  const selected = strToDate(value);

  function handleSelect(date) {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start gap-2 text-sm font-normal h-8',
              !value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
            type="button"
          />
        }
      >
        <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
        {value ? format(strToDate(value), 'dd/MM/yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          captionLayout="dropdown"
          defaultMonth={selected}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// Main Form Component
export function CimCycleTimeForm({ open, onOpenChange, editRow, isPending, onSubmit }) {
  const isEdit = Boolean(editRow);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [selectedLine, setSelectedLine] = useState('');

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(formFromRow(editRow));
      setErrors({});
      setSelectedLine('');
    }
  }, [open, editRow]);

  // Dropdown data
  const { data: mfgTypes = [], isLoading: mfgTypesLoading } = useCctMfgTypes();
  const activeMfg = mfgTypes.find((m) => m.id === form.mfgType) ?? null;
  const deptCode = activeMfg?.deptCode ?? null;

  const { data: lines = [], isLoading: linesLoading } = useCctLines({ deptCode });
  const { data: models = [], isLoading: modelsLoading } = useCctModels({
    lineId: selectedLine || null,
  });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleMfgTypeChange(val) {
    set('mfgType', val);
    setSelectedLine('');
  }

  function handleModelChange(partNumber) {
    const found = models.find((m) => m.partNumber === partNumber);
    setForm((prev) => ({
      ...prev,
      partNumber: found?.partNumber ?? partNumber,
      modelName: found?.modelName ?? prev.modelName,
    }));
    setErrors((prev) => ({ ...prev, partNumber: undefined, modelName: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { success, errors: errs } = validateCctForm(form);
    if (!success) {
      setErrors(errs);
      return;
    }
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" aria-labelledby="cct-form-title">
        <DialogHeader>
          <DialogTitle id="cct-form-title">
            {isEdit ? 'Sửa Cycle Time' : 'Thêm Cycle Time'}
          </DialogTitle>
        </DialogHeader>

        <form id="cct-form" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* ── Cột trái ── */}

            {/* MfgType */}
            <FormRow label="MfgType" required error={errors.mfgType}>
              <Select value={form.mfgType} onValueChange={handleMfgTypeChange}>
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={mfgTypesLoading ? 'Đang tải…' : 'Chọn MfgType'} />
                </SelectTrigger>
                <SelectContent>
                  {mfgTypes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            {/* Chuyền — cascade helper */}
            <FormRow label="Chuyền (lọc model)">
              <Select value={selectedLine} onValueChange={setSelectedLine} disabled={!deptCode}>
                <SelectTrigger className="w-full h-8">
                  <SelectValue
                    placeholder={
                      !deptCode ? 'Chọn MfgType trước' : linesLoading ? 'Đang tải…' : 'Chọn chuyền'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.id}
                      {l.name && l.name !== l.id ? ` – ${l.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            {/* Part Number */}
            <FormRow label="Part Number" required error={errors.partNumber}>
              {selectedLine ? (
                <Select
                  value={form.partNumber}
                  onValueChange={handleModelChange}
                  disabled={modelsLoading}
                >
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder={modelsLoading ? 'Đang tải…' : 'Chọn Part Number'} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.partNumber} value={m.partNumber}>
                        {m.partNumber}
                        {m.modelName && m.modelName !== m.partNumber ? ` – ${m.modelName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.partNumber}
                  onChange={(e) => set('partNumber', e.target.value)}
                  placeholder="VD: ABC-123"
                  aria-invalid={Boolean(errors.partNumber)}
                />
              )}
            </FormRow>

            {/* Model Name */}
            <FormRow label="Model Name" required error={errors.modelName}>
              <Input
                value={form.modelName}
                onChange={(e) => set('modelName', e.target.value)}
                placeholder="VD: Product X"
                aria-invalid={Boolean(errors.modelName)}
              />
            </FormRow>

            {/* Stage */}
            <FormRow label="Stage" required error={errors.stage}>
              <Input
                value={form.stage}
                onChange={(e) => set('stage', e.target.value)}
                placeholder="VD: MI11"
                aria-invalid={Boolean(errors.stage)}
              />
            </FormRow>

            {/* Stage Desc */}
            <FormRow label="Stage Desc" error={errors.stageDes}>
              <Input
                value={form.stageDes}
                onChange={(e) => set('stageDes', e.target.value)}
                placeholder="Mô tả trạm (tuỳ chọn)"
              />
            </FormRow>

            {/* Cycle Time */}
            <FormRow label="Cycle Time (min)" error={errors.cycleTime}>
              <Input
                type="number"
                min="0"
                step="0.000001"
                value={form.cycleTime}
                onChange={(e) => set('cycleTime', e.target.value)}
                placeholder="VD: 2.147"
                aria-invalid={Boolean(errors.cycleTime)}
              />
            </FormRow>

            {/* People Count */}
            <FormRow label="People Count" error={errors.peopleCount}>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.peopleCount}
                onChange={(e) => set('peopleCount', e.target.value)}
                placeholder="Số người (tuỳ chọn)"
                aria-invalid={Boolean(errors.peopleCount)}
              />
            </FormRow>

            {/* Station Count */}
            <FormRow label="Station Count" error={errors.stationCount}>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.stationCount}
                onChange={(e) => set('stationCount', e.target.value)}
                placeholder="Số trạm (tuỳ chọn)"
                aria-invalid={Boolean(errors.stationCount)}
              />
            </FormRow>

            {/* Target UPH */}
            <FormRow label="Target UPH (PCS/H)" error={errors.targetUph}>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.targetUph}
                  onChange={(e) => set('targetUph', e.target.value)}
                  placeholder="Mục tiêu UPH (VD: 200)"
                  aria-invalid={Boolean(errors.targetUph)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs text-muted-foreground hover:text-primary"
                  title="Tính nhanh từ Cycle Time và People Count: CEILING(60 / (CT / NOP))"
                  onClick={() => {
                    const ct = parseFloat(form.cycleTime);
                    const nop = parseInt(form.peopleCount, 10) || 1;
                    if (ct > 0) {
                      const eff = nop > 1 ? ct / nop : ct;
                      const uph = Math.ceil(60.0 / eff);
                      set('targetUph', String(uph));
                    }
                  }}
                >
                  Tính nhanh
                </Button>
              </div>
            </FormRow>

            {/* Effective From — DatePicker */}
            <FormRow label="Effective From" required error={errors.effectiveFrom}>
              <DatePicker
                value={form.effectiveFrom}
                onChange={(v) => set('effectiveFrom', v)}
                placeholder="Chọn ngày bắt đầu"
                error={Boolean(errors.effectiveFrom)}
              />
            </FormRow>

            {/* Effective To — DatePicker */}
            <FormRow label="Effective To" error={errors.effectiveTo}>
              <DatePicker
                value={form.effectiveTo}
                onChange={(v) => set('effectiveTo', v)}
                placeholder="Không giới hạn"
                error={Boolean(errors.effectiveTo)}
              />
              <p className="mt-0.5 text-xs text-muted-foreground">Để trống = không giới hạn</p>
            </FormRow>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <LoadingButton type="submit" form="cct-form" loading={isPending} loadingText="Đang lưu…">
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// FormRow
// ---------------------------------------------------------------------------
function FormRow({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">
        {required && <span className="mr-0.5 text-destructive">*</span>}
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
