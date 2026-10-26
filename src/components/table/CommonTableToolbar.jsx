import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/core/utils/utils';

/**
 * Props:
 *  - onSearch(query: string)
 *  - activeQuery: string
 *  - searchPlaceholder: string
 *  - children
 */
export function CommonTableToolbar({
  onSearch,
  activeQuery = '',
  searchPlaceholder = 'Tìm kiếm...',
  children,
  className,
  ...props
}) {
  const [draft, setDraft] = useState(activeQuery);

  function handleSearch() {
    onSearch(draft.trim());
  }

  function handleClear() {
    setDraft('');
    onSearch('');
  }

  return (
    <div
      className={cn('flex w-full items-center justify-between gap-2 overflow-auto p-1', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8 w-80 pl-8"
          />
        </div>

        <Button size="sm" className="h-8" onClick={handleSearch}>
          Tìm kiếm
        </Button>

        {activeQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Xóa
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
