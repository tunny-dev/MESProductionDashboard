import { Skeleton } from '@/components/ui/skeleton';

/**
 * Props:
 *  - columnCount: number
 *  - rowCount?: number   (default 8)
 */
export function CommonTableSkeleton({ columnCount = 5, rowCount = 8 }) {
  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between p-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-border bg-muted/50">
              {Array.from({ length: columnCount }).map((_, i) => (
                <th key={i} className="h-10 px-2 border border-border">
                  <Skeleton className="h-4 w-full" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {Array.from({ length: columnCount }).map((__, j) => (
                  <td key={j} className="p-2 border border-border">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-1">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
