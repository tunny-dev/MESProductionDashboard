import { useMemo, useState } from 'react';
import { cn } from '@/core/utils/utils';
import { CommonTableToolbar } from './CommonTableToolbar';
import { CommonTableFooter } from './CommonTableFooter';
import { CommonTableSkeleton } from './CommonTableSkeleton';

/**
 * Props:
 *  - data               any[]
 *  - columns            ColDef[]
 *  - isLoading          boolean
 *  - searchFields       string[]
 *  - searchPlaceholder  string
 *  - pageSize           number
 *  - pageSizeOptions    number[]
 *  - skeletonColumnCount number
 *  - skeletonRowCount   number
 *  - children           action buttons
 *
 * ColDef:
 *  - key        string
 *  - header     string | () => JSX
 *  - cell       (row, index) => JSX
 *  - className  string
 *  - headClass  string
 */
export function CommonDataTable({
  data = [],
  columns = [],
  isLoading = false,
  searchFields = [],
  searchPlaceholder = 'Tìm kiếm...',
  pageSize: defaultPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  skeletonColumnCount,
  skeletonRowCount = 8,
  children,
  className,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filteredData = useMemo(() => {
    if (!searchQuery || searchFields.length === 0) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      searchFields.some((field) => {
        const v = row[field];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [data, searchQuery, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pagedData = filteredData.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function handleSearch(q) {
    setSearchQuery(q);
    setPageIndex(0);
  }

  function handlePageSizeChange(size) {
    setPageSize(size);
    setPageIndex(0);
  }

  if (isLoading) {
    return (
      <CommonTableSkeleton
        columnCount={skeletonColumnCount ?? (columns.length || 5)}
        rowCount={skeletonRowCount}
      />
    );
  }

  const colCount = columns.length;

  return (
    <div className={cn('w-full space-y-2.5', className)}>
      <CommonTableToolbar
        onSearch={handleSearch}
        activeQuery={searchQuery}
        searchPlaceholder={searchPlaceholder}
      >
        {children}
      </CommonTableToolbar>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full caption-bottom text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'h-10 px-2 text-left align-middle text-sm font-semibold border border-border whitespace-nowrap',
                    col.headClass,
                    col.className
                  )}
                >
                  {typeof col.header === 'function' ? col.header() : col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="border border-border h-24 text-center text-sm text-muted-foreground"
                >
                  {searchQuery ? `Không tìm thấy kết quả cho "${searchQuery}"` : 'Không có dữ liệu'}
                </td>
              </tr>
            ) : (
              pagedData.map((row, idx) => (
                <tr
                  key={row.id ?? `${safePage}-${idx}`}
                  className="border-b border-border transition-colors hover:bg-muted/50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('p-2 align-middle border border-border', col.className)}
                    >
                      {col.cell(row, safePage * pageSize + idx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CommonTableFooter
        total={filteredData.length}
        pageIndex={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        pageSizeOptions={pageSizeOptions}
        onPageChange={setPageIndex}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
