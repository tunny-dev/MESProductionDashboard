import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLines } from '@/hooks/useLine';

const linePickerSchema = z.object({
  process: z.string().min(1, 'Select a process.'),
  lineId: z.string().min(1, 'Select a production line.'),
});

export function LinePickerDialog({ open, onOpenChange, stageList = [], onApply, copy }) {
  const form = useForm({
    resolver: zodResolver(linePickerSchema),
    defaultValues: { process: '', lineId: '' },
  });
  const process = useWatch({ control: form.control, name: 'process' });
  const selectedLineId = useWatch({ control: form.control, name: 'lineId' });

  const deptCode = useMemo(() => {
    if (!process) return null;
    const found = stageList.find((s) => (typeof s === 'string' ? s : s.id) === process);
    return found?.deptCode ?? null;
  }, [process, stageList]);

  const { data: lines = [], isLoading: linesLoading } = useLines(deptCode);

  const processes = stageList.map((s) => (typeof s === 'string' ? s : s.id));

  const selectedLine = lines.find((line) => line.id === selectedLineId) ?? null;

  function handleProcessChange(next) {
    form.setValue('process', next, { shouldDirty: true, shouldValidate: false });
    form.setValue('lineId', '', { shouldDirty: true, shouldValidate: false });
  }

  function handleLineChange(id) {
    form.setValue('lineId', id, { shouldDirty: true, shouldValidate: true });
  }

  function handleApply({ process: selectedProcess, lineId }) {
    const line = lines.find((item) => item.id === lineId);
    if (line) onApply(line.id, selectedProcess);
  }

  // Reset line select khi đổi process - dùng key để force remount
  const lineSelectKey = `line-select-${process ?? 'none'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border-strong bg-[var(--surface)] text-foreground shadow-modal sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.picker.title}</DialogTitle>
          <DialogDescription>{copy.picker.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleApply)} className="flex flex-col gap-3">
          <FieldGroup>
            <Controller
              control={form.control}
              name="process"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="line-picker-process">{copy.filters.process}</FieldLabel>
                  <Select value={field.value} onValueChange={handleProcessChange}>
                    <SelectTrigger
                      id="line-picker-process"
                      aria-invalid={fieldState.invalid}
                      className="w-full border-border-strong bg-[var(--surface)]"
                    >
                      <SelectValue placeholder={copy.filters.selectProcess} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-production-blue">
                          {copy.filters.process}
                        </SelectLabel>
                        {processes.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="lineId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="line-picker-line">{copy.filters.line}</FieldLabel>
                  <Select
                    key={lineSelectKey}
                    value={field.value}
                    onValueChange={handleLineChange}
                    disabled={!process || linesLoading}
                  >
                    <SelectTrigger
                      id="line-picker-line"
                      aria-invalid={fieldState.invalid}
                      className="w-full border-border-strong bg-[var(--surface)]"
                    >
                      {selectedLine ? (
                        <span className="flex-1 truncate text-left">{selectedLine.name}</span>
                      ) : (
                        <span className="flex-1 truncate text-left text-muted-foreground">
                          {copy.picker.linePlaceholder}
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-production-blue">
                          {copy.filters.line}
                        </SelectLabel>
                        {lines.map((line) => (
                          <SelectItem key={line.id} value={line.id}>
                            {line.name || line.id}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="gap-2">
            <DialogClose
              render={
                <Button type="button" variant="outline">
                  {copy.picker.cancel}
                </Button>
              }
            />
            <Button type="submit" disabled={form.formState.isSubmitting || !selectedLine}>
              {copy.picker.apply}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
