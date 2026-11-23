import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
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

export function LinePickerDialog({ open, onOpenChange, stageList = [], onApply, copy }) {
  const [process, setProcess] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);

  const deptCode = useMemo(() => {
    if (!process) return null;
    const found = stageList.find((s) => (typeof s === 'string' ? s : s.id) === process);
    return found?.deptCode ?? null;
  }, [process, stageList]);

  const { data: lines = [], isLoading: linesLoading } = useLines(deptCode);

  const processes = stageList.map((s) => (typeof s === 'string' ? s : s.id));

  function handleProcessChange(next) {
    setProcess(next);
    setSelectedLine(null);
  }

  function handleLineChange(id) {
    const line = lines.find((l) => l.id === id) ?? null;
    setSelectedLine(line);
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
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {copy.filters.process}
            </span>
            <Select value={process ?? ''} onValueChange={handleProcessChange}>
              <SelectTrigger className="w-full border-border-strong bg-[var(--surface)]">
                <SelectValue placeholder={copy.filters.selectProcess} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-production-blue">{copy.filters.process}</SelectLabel>
                  {processes.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{copy.filters.line}</span>
            <Select
              key={lineSelectKey}
              onValueChange={handleLineChange}
              disabled={!process || linesLoading}
            >
              <SelectTrigger className="w-full border-border-strong bg-[var(--surface)]">
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
                  <SelectLabel className="text-production-blue">{copy.filters.line}</SelectLabel>
                  {lines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {line.name || line.id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose
            render={
              <Button type="button" variant="outline">
                {copy.picker.cancel}
              </Button>
            }
          />
          <Button
            type="button"
            disabled={!selectedLine}
            onClick={() => selectedLine && onApply(selectedLine.id, process)}
          >
            {copy.picker.apply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
