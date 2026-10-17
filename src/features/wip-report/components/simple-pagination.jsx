import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

/** Danh sách số trang hiển thị, rút gọn bằng '...' khi nhiều trang. */
function getPaginationRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

/** Cụm nút phân trang « ‹ 1 2 3 › » — ẩn khi chỉ có 1 trang. */
export function SimplePagination({ page, totalPages, onPageChange, className }) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <NavBtn disabled={page <= 1} onClick={() => onPageChange?.(1)} label="First">
        «
      </NavBtn>
      <NavBtn
        disabled={page <= 1}
        onClick={() => onPageChange?.(Math.max(1, page - 1))}
        label="Prev"
      >
        ‹
      </NavBtn>
      {getPaginationRange(page, totalPages).map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="icon-xs"
            onClick={() => onPageChange?.(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Button>
        )
      )}
      <NavBtn
        disabled={page >= totalPages}
        onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
        label="Next"
      >
        ›
      </NavBtn>
      <NavBtn disabled={page >= totalPages} onClick={() => onPageChange?.(totalPages)} label="Last">
        »
      </NavBtn>
    </div>
  );
}
