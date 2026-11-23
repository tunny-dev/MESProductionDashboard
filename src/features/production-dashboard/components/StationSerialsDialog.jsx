import { useMemo, useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  LogIn,
  MinusCircle,
  Clock,
  Search,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStationSerials } from '@/hooks/useProduction';
import { cn } from '@/core/utils/utils';
import { formatNumber } from '@/core/utils/format';

const PAGE_SIZE = 12;

const CATEGORIES = [
  {
    id: 'FINISH',
    label: 'Đã hoàn thành',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'WIP',
    label: 'Tồn dở dang (WIP)',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
  },
  { id: 'INPUT', label: 'Đầu vào trạm', icon: LogIn, color: 'text-blue-600 dark:text-blue-400' },
  {
    id: 'NG',
    label: 'Lỗi / Sửa chữa',
    icon: AlertCircle,
    color: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'NOT_INPUT',
    label: 'Chưa nhập chuyền',
    icon: MinusCircle,
    color: 'text-slate-600 dark:text-slate-400',
  },
];

export function StationSerialsDialog({
  open,
  onOpenChange,
  params,
  initialCategory = 'FINISH',
  themeStyle,
}) {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedSn, setCopiedSn] = useState(null);

  useEffect(() => {
    if (open) {
      setActiveCategory(initialCategory || 'FINISH');
      setSearch('');
      setPage(1);
    }
  }, [open, initialCategory]);

  const queryParams = useMemo(() => {
    if (!open || !params?.mo) return null;
    return {
      mo: params.mo,
      station: activeCategory === 'NOT_INPUT' ? undefined : params.station,
      line: params.line,
      sDate: params.sDate,
      shift: params.shift,
      category: activeCategory,
    };
  }, [open, params, activeCategory]);

  const {
    data: rawData = [],
    isLoading,
    isFetching,
    refetch,
  } = useStationSerials(queryParams, { enabled: Boolean(open && queryParams) });

  const data = useMemo(() => {
    return Array.isArray(rawData) ? rawData : rawData?.data || [];
  }, [rawData]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (item) =>
        item.sn?.toLowerCase().includes(q) ||
        item.statusDesc?.toLowerCase().includes(q) ||
        item.userId?.toLowerCase().includes(q) ||
        item.userName?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const handleCopySn = (sn) => {
    navigator.clipboard?.writeText(sn);
    setCopiedSn(sn);
    setTimeout(() => setCopiedSn(null), 1500);
  };

  const handleCopyAll = () => {
    const snList = filteredData
      .map((d) => d.sn?.trim())
      .filter(Boolean)
      .join(',');
    navigator.clipboard?.writeText(snList);
    setCopiedSn('ALL');
    setTimeout(() => setCopiedSn(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={themeStyle}
        className="w-[96vw] max-w-5xl border-border-strong bg-[var(--surface-overlay)] p-5 text-foreground shadow-2xl sm:max-w-5xl lg:max-w-6xl"
      >
        <DialogHeader className="gap-1 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <span>Chi tiết Serial Number theo trạm</span>
              {params?.station && (
                <Badge
                  variant="outline"
                  className="border-production-blue/50 text-production-blue bg-production-blue/10"
                >
                  Trạm: {params.station} {params.stationName ? `(${params.stationName})` : ''}
                </Badge>
              )}
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              WO: <strong className="text-foreground">{params?.mo || '—'}</strong>
            </span>
            {params?.line && (
              <span>
                Chuyền: <strong className="text-foreground">{params.line}</strong>
              </span>
            )}
            {params?.sDate && (
              <span>
                Ngày: <strong className="text-foreground">{params.sDate}</strong>
              </span>
            )}
            <span>
              Phạm vi: <strong className="text-foreground">Theo ca</strong>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setPage(1);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'bg-[var(--surface)] text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn('size-3.5', isActive ? 'text-primary-foreground' : cat.color)}
                  />
                  <span>{cat.label}</span>
                  {isActive && !isLoading && (
                    <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-bold">
                      {formatNumber(data.length)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="Làm mới dữ liệu từ server"
              disabled={isFetching}
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs border-border-strong bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)]"
            >
              <RotateCw
                className={cn('size-3.5', isFetching && 'animate-spin text-production-blue')}
              />
              <span>Làm mới</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || !filteredData.length}
              onClick={handleCopyAll}
              className="h-8 gap-1.5 text-xs border-border-strong bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)]"
            >
              {copiedSn === 'ALL' ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span>Đã chép {formatNumber(filteredData.length)} SN</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-muted-foreground" />
                  <span>Sao chép tất cả SN</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo Serial Number (SN), trạng thái, người thao tác..."
            className="h-8.5 pl-8 text-xs border-border-strong bg-[var(--surface)] text-foreground"
          />
        </div>

        {activeCategory === 'WIP' && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300/80 bg-amber-50/90 px-3.5 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {params?.wipDiff !== undefined && params?.wipDiff !== null ? (
                  <>
                    Chênh lệch sản lượng ca:{' '}
                    <strong className="font-bold text-amber-950 dark:text-white">
                      {formatNumber(params.wipDiff)} PCS
                    </strong>
                    <span className="mx-2 text-amber-500/60 dark:text-amber-400/50">•</span>
                  </>
                ) : null}
                Serial thực tế đang chờ trạm kế tiếp:{' '}
                <strong className="font-bold text-amber-950 dark:text-white">
                  {formatNumber(data.length)} SN
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-amber-800/80 italic dark:text-amber-300/80">
              (Bao gồm sản phẩm tồn đọng do trạm sau đang xử lý gối đầu hàng ca trước)
            </span>
          </div>
        )}

        {/* Table content */}
        <div className="relative min-h-80 max-h-105 overflow-auto rounded-md border border-border-strong bg-[var(--surface)]">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50 backdrop-blur-[1px]">
              <Loader2 className="size-7 animate-spin text-production-blue" />
              <span className="text-xs text-muted-foreground">
                Đang tải chi tiết danh sách Serial...
              </span>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
              <span>Không có bản ghi Serial nào phù hợp</span>
              {search && <span>với từ khóa "{search}"</span>}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[var(--surface-overlay)]">
                <TableRow className="border-b border-border-strong text-[11px]">
                  <TableHead className="w-12 text-center">STT</TableHead>
                  <TableHead className="w-48">Số Serial Number (SN)</TableHead>
                  <TableHead className="w-24 text-center">Trạm</TableHead>
                  <TableHead className="w-24 text-center">Chuyền</TableHead>
                  <TableHead className="w-36 text-center">Thời gian quét</TableHead>
                  <TableHead className="w-32 text-center">Trạng thái</TableHead>
                  <TableHead className="w-52 text-left">Người quét</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <TableRow
                      key={row.sn + idx}
                      className="border-b border-border/40 text-xs hover:bg-[var(--surface-hover)]"
                    >
                      <TableCell className="text-center tabular-nums text-muted-foreground py-2">
                        {globalIdx}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-foreground py-2">
                        <div className="flex items-center gap-1.5">
                          <span>{row.sn}</span>
                          <button
                            type="button"
                            onClick={() => handleCopySn(row.sn)}
                            title="Sao chép SN"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {copiedSn === row.sn ? (
                              <Check className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground py-2">
                        {row.station || '—'}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground py-2">
                        {row.line || '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground py-2">
                        {row.scanDateTime
                          ? `${row.scanDateTime.substring(0, 4)}-${row.scanDateTime.substring(4, 6)}-${row.scanDateTime.substring(6, 8)} ${row.scanDateTime.substring(8, 10)}:${row.scanDateTime.substring(10, 12)}:${row.scanDateTime.substring(12, 14)}`
                          : row.scanDate
                            ? `${row.scanDate} ${row.scanTime || ''}`
                            : '—'}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span
                          className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium',
                            row.status === '1' &&
                              'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                            row.status === '2' && 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
                            row.status === '3' && 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
                            row.status === '4' && 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
                            row.status === '0' &&
                              'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                            (row.status === 'WIP' || row.category === 'WIP') &&
                              'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
                          )}
                        >
                          {row.statusDesc || row.status || 'OK'}
                        </span>
                      </TableCell>
                      <TableCell className="text-left text-muted-foreground py-2 truncate max-w-55">
                        <span title={row.userName ? `${row.userId} (${row.userName})` : row.userId}>
                          {row.userName || row.userId || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer with pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>
            Hiển thị <strong>{pageRows.length}</strong> /{' '}
            <strong>{formatNumber(filteredData.length)}</strong> Serial
            {search && ` (lọc từ ${formatNumber(data.length)})`}
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7 border-border-strong bg-[var(--surface)] text-foreground"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7 border-border-strong bg-[var(--surface)] text-foreground"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
