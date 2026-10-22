import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

/**
 * Ô WO trên header: readonly, bấm mở dialog chọn từ bảng.
 * Chưa chọn thì hiện placeholder, không cho gõ tay.
 */
export function WoPickerTrigger({
  label,
  valueLabel,
  placeholder,
  loadingText,
  disabled,
  loading,
  onOpen,
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="truncate text-[10px] font-medium text-muted-foreground xl:text-[11px]">
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || loading}
        onClick={onOpen}
        aria-haspopup="dialog"
        className="h-9 w-full min-w-0 justify-start gap-2 border-border-strong bg-[var(--surface)] px-2.5 text-base font-normal text-foreground hover:bg-[var(--surface-hover)] md:text-sm"
      >
        <span
          className={cn(
            'flex-1 truncate text-left',
            !valueLabel && 'font-normal text-muted-foreground'
          )}
        >
          {loading ? (loadingText ?? '…') : valueLabel || placeholder}
        </span>
        {loading ? (
          <Loader2
            aria-hidden="true"
            className="size-4 shrink-0 animate-spin text-production-blue"
          />
        ) : (
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

/**
 * Dialog chọn WO: tìm kiếm + bảng + phân trang.
 * Bấm vào dòng là chọn ngay và đóng dialog.
 */
export function WoPickerDialog({ open, onOpenChange, woList = [], value, onSelect, copy }) {
  const t = copy.woPicker;
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const allowClose = useRef(false);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return woList;
    return woList.filter((w) =>
      [w.mo, w.partNumber, w.modelName].some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(q)
      )
    );
  }, [woList, keyword]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleKeywordChange(event) {
    setKeyword(event.target.value);
    setPage(0);
  }

  function handleSelect(mo) {
    onSelect(mo);
    closeDialog();
  }

  function closeDialog() {
    allowClose.current = true;
    onOpenChange(false);
  }

  function handleOpenChange(next) {
    if (!next && !allowClose.current) return;
    allowClose.current = false;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="border border-border-strong bg-[var(--surface)] text-foreground shadow-modal sm:max-w-4xl"
      >
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Close"
          className="absolute top-2 right-2 inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none select-none hover:bg-[var(--surface-hover)] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={keyword}
            onChange={handleKeywordChange}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className="border-border-strong bg-[var(--surface)] pr-2.5 pl-8"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 tabular-nums">{t.colIndex}</TableHead>
                  <TableHead>{t.colWo}</TableHead>
                  <TableHead>{t.colPartNumber}</TableHead>
                  <TableHead>{t.colModel}</TableHead>
                  <TableHead className="text-right tabular-nums">{t.colPlan}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w, index) => {
                  const selected = w.mo === value;
                  return (
                    <TableRow
                      key={w.mo}
                      tabIndex={0}
                      aria-selected={selected}
                      onClick={() => handleSelect(w.mo)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelect(w.mo);
                        }
                      }}
                      className={cn(
                        'cursor-pointer hover:bg-[var(--surface-hover)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                        selected && 'bg-production-blue/10 hover:bg-production-blue/15'
                      )}
                    >
                      <TableCell className="text-muted-foreground tabular-nums">
                        {safePage * PAGE_SIZE + index + 1}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap">{w.mo}</TableCell>
                      <TableCell className="max-w-52 truncate" title={w.partNumber ?? ''}>
                        {w.partNumber ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-52 truncate" title={w.modelName ?? ''}>
                        {w.modelName ?? '—'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatNumber(w.planQty)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {t.showing(
                  safePage * PAGE_SIZE + 1,
                  Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE),
                  filtered.length
                )}
              </p>
              {pageCount > 1 ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    aria-label={t.prevPage}
                    title={t.prevPage}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t.page(safePage + 1, pageCount)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    aria-label={t.nextPage}
                    title={t.nextPage}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
