import { useEffect, useMemo, useRef, useState } from 'react';
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
import { formatNumber } from '@/core/utils/format';
import { cn } from '@/core/utils/utils';

const PAGE_SIZE = 8;

function formatScanTime(t) {
  if (!t || typeof t !== 'string' || t.trim().length < 6) return null;
  const s = t.trim();
  return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
}

function renderStatusBadge(status) {
  switch (status) {
    case '2':
      return (
        <span className="inline-flex items-center rounded border border-production-blue/30 bg-production-blue/15 px-1.5 py-0.5 text-[10px] font-medium text-production-blue">
          Đang SX
        </span>
      );
    case '1':
      return (
        <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
          Mới mở
        </span>
      );
    default:
      return null;
  }
}

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

export function WoPickerDialog({
  open,
  onOpenChange,
  woList = [],
  value,
  onSelect,
  copy,
  themeStyle,
  loading = false,
}) {
  const t = copy.woPicker;
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const allowClose = useRef(false);

  // Chỉ lấy các đơn có trạng thái '1' (Mới mở) hoặc '2' (Đang sản xuất), bỏ hoàn toàn đơn đóng ('5', '6')
  const validWoList = useMemo(
    () =>
      woList.filter((w) => {
        const s = String(w.status ?? '').trim();
        return s === '1' || s === '2';
      }),
    [woList]
  );

  // Danh sách các đơn có quét thực tế trong ngày đã chọn
  const todayMos = useMemo(
    () => validWoList.filter((w) => w.isActiveToday || (w.todayQty && w.todayQty > 0)),
    [validWoList]
  );

  // Mặc định chọn tab 'today' nếu có đơn quét hôm nay, ngược lại chọn 'all'
  const [tab, setTab] = useState(() => (todayMos.length > 0 ? 'today' : 'all'));

  // Đồng bộ tab khi mở dialog hoặc khi danh sách đơn có quét thay đổi
  useEffect(() => {
    if (open) {
      setTab(todayMos.length > 0 ? 'today' : 'all');
      setKeyword('');
      setPage(0);
    }
  }, [open, todayMos.length]);

  const baseList = useMemo(() => {
    if (tab === 'today') {
      return todayMos.length > 0 ? todayMos : validWoList;
    }
    return validWoList;
  }, [tab, todayMos, validWoList]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((w) =>
      [w.mo, w.partNumber, w.modelName].some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(q)
      )
    );
  }, [baseList, keyword]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleKeywordChange(event) {
    setKeyword(event.target.value);
    setPage(0);
  }

  function handleTabChange(nextTab) {
    setTab(nextTab);
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
        style={themeStyle}
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
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            {t.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.description}
          </DialogDescription>
        </DialogHeader>

        {/* Tab chuyển đổi: Đang chạy trong ngày vs Tất cả */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-hover)] p-0.5">
            <button
              type="button"
              onClick={() => handleTabChange('today')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all select-none',
                tab === 'today'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="size-2 rounded-full bg-emerald-400" />
              Có sản xuất trong ngày ({todayMos.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all select-none',
                tab === 'all'
                  ? 'bg-production-blue/20 text-production-blue shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tất cả đơn mở & đang SX ({validWoList.length})
            </button>
          </div>

          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={keyword}
              onChange={handleKeywordChange}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="h-8 border-border-strong bg-[var(--surface)] pr-2.5 pl-8 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Loader2
              aria-hidden="true"
              className="size-6 animate-spin text-production-blue mb-2.5"
            />
            <p className="text-xs font-medium text-muted-foreground">
              {copy.loadingWo || 'Đang tải danh sách lệnh sản xuất...'}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {tab === 'today'
                ? 'Không có đơn nào quét barcode trong ngày này (nhà máy nghỉ hoặc chưa quét).'
                : t.empty}
            </p>
            {tab === 'today' && validWoList.length > 0 ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => handleTabChange('all')}
                className="mt-1 text-xs text-production-blue"
              >
                Xem tất cả {validWoList.length} đơn mở & đang sản xuất của chuyền
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 text-center tabular-nums">{t.colIndex}</TableHead>
                    <TableHead>{t.colWo}</TableHead>
                    <TableHead>{t.colPartNumber}</TableHead>
                    <TableHead>{t.colModel}</TableHead>
                    <TableHead className="text-right tabular-nums">{t.colPlan}</TableHead>
                    <TableHead className="text-right tabular-nums">Đã quét trong ngày</TableHead>
                    <TableHead className="w-24 text-center">
                      {t.colStatus ?? 'Trạng thái'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((w, index) => {
                    const selected = w.mo === value;
                    const isTodayActive = w.isActiveToday || (w.todayQty && w.todayQty > 0);
                    const scanTimeStr = formatScanTime(w.lastScanTime);

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
                          'cursor-pointer hover:bg-[var(--surface-hover)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none transition-colors',
                          selected && 'bg-production-blue/15 hover:bg-production-blue/20'
                        )}
                      >
                        <TableCell className="text-center text-muted-foreground tabular-nums text-xs">
                          {safePage * PAGE_SIZE + index + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs">{w.mo}</span>
                            {isTodayActive ? (
                              <span className="inline-flex items-center rounded bg-emerald-500/15 px-1 py-0.2 text-[9px] font-medium text-emerald-400">
                                Có quét
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-44 truncate text-xs" title={w.partNumber ?? ''}>
                          {w.partNumber ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-52 truncate text-xs" title={w.modelName ?? ''}>
                          {w.modelName ?? '—'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums text-xs font-medium">
                          {formatNumber(w.planQty)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums text-xs">
                          {w.todayQty && w.todayQty > 0 ? (
                            <div>
                              <span className="font-semibold text-emerald-400">
                                {formatNumber(w.todayQty)} PCS
                              </span>
                              {scanTimeStr ? (
                                <div className="text-[10px] text-muted-foreground">
                                  {scanTimeStr}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {renderStatusBadge(w.status)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
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
