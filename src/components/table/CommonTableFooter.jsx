import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Props:
 *  - total: number
 *  - pageIndex: number      (0-indexed)
 *  - pageSize: number
 *  - totalPages: number
 *  - pageSizeOptions: number[]
 *  - onPageChange(index: number)
 *  - onPageSizeChange(size: number)
 */
export function CommonTableFooter({
  total,
  pageIndex,
  pageSize,
  totalPages,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}) {
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  return (
    <div className="flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8">
      <p className="flex-1 whitespace-nowrap text-sm text-muted-foreground">
        Hiển thị <span className="font-medium text-foreground">{total}</span> bản ghi
      </p>

      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="whitespace-nowrap text-sm font-medium">Số hàng mỗi trang</p>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-18">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <PagBtn onClick={() => onPageChange(0)} disabled={!canPrev} aria-label="Trang đầu">
            <ChevronsLeft className="size-4" />
          </PagBtn>
          <PagBtn
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canPrev}
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </PagBtn>

          {getPageItems(pageIndex, totalPages).map((item, i) =>
            item.type === 'ellipsis' ? (
              <span key={`e${i}`} className="px-2 text-sm text-muted-foreground select-none">
                …
              </span>
            ) : (
              <PagBtn
                key={item.page}
                active={item.active}
                onClick={() => onPageChange(item.page)}
                aria-label={`Trang ${item.page + 1}`}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.page + 1}
              </PagBtn>
            )
          )}

          <PagBtn
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canNext}
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </PagBtn>
          <PagBtn
            onClick={() => onPageChange(totalPages - 1)}
            disabled={!canNext}
            aria-label="Trang cuối"
          >
            <ChevronsRight className="size-4" />
          </PagBtn>
        </div>
      </div>
    </div>
  );
}

function PagBtn({ active, children, ...props }) {
  return (
    <Button variant={active ? 'default' : 'outline'} size="icon-sm" className="size-8" {...props}>
      {children}
    </Button>
  );
}

function getPageItems(current, total) {
  if (total <= 1) return [{ type: 'page', page: 0, active: true }];
  const items = [];
  const left = Math.max(1, current - 1);
  const right = Math.min(total - 2, current + 1);

  items.push({ type: 'page', page: 0, active: current === 0 });
  if (left > 1) items.push({ type: 'ellipsis' });
  for (let i = left; i <= right; i++) {
    items.push({ type: 'page', page: i, active: current === i });
  }
  if (right < total - 2) items.push({ type: 'ellipsis' });
  if (total > 1) items.push({ type: 'page', page: total - 1, active: current === total - 1 });
  return items;
}
