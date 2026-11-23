import { useMemo, useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Download,
  Filter,
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

// Chia các khung giờ theo ca sản xuất
const SHIFT_1_SLOTS = [
  { id: '0', label: '08-10', startH: 8, endH: 10 },
  { id: '1', label: '10-12', startH: 10, endH: 12 },
  { id: '2', label: '12-14', startH: 12, endH: 14 },
  { id: '3', label: '14-16', startH: 14, endH: 16 },
  { id: '4', label: '16-18', startH: 16, endH: 18 },
  { id: '5', label: '18-20', startH: 18, endH: 20 },
];

const SHIFT_2_SLOTS = [
  { id: '0', label: '20-22', startH: 20, endH: 22 },
  { id: '1', label: '22-24', startH: 22, endH: 24 },
  { id: '2', label: '00-02', startH: 0, endH: 2 },
  { id: '3', label: '02-04', startH: 2, endH: 4 },
  { id: '4', label: '04-06', startH: 4, endH: 6 },
  { id: '5', label: '06-08', startH: 6, endH: 8 },
];

function getSlotForTimestamp(scanDateTime, shift = '1') {
  if (!scanDateTime || scanDateTime.length < 10) return null;
  const hour = parseInt(scanDateTime.substring(8, 10), 10);
  if (Number.isNaN(hour)) return null;

  if (shift === '2') {
    if (hour >= 20 && hour < 22) return { id: '0', label: '20-22' };
    if (hour >= 22 && hour < 24) return { id: '1', label: '22-24' };
    if (hour >= 0 && hour < 2) return { id: '2', label: '00-02' };
    if (hour >= 2 && hour < 4) return { id: '3', label: '02-04' };
    if (hour >= 4 && hour < 6) return { id: '4', label: '04-06' };
    if (hour >= 6 && hour < 8) return { id: '5', label: '06-08' };
    return { id: 'other', label: 'Khác' };
  }

  // Ca 1 (mặc định)
  if (hour >= 8 && hour < 10) return { id: '0', label: '08-10' };
  if (hour >= 10 && hour < 12) return { id: '1', label: '10-12' };
  if (hour >= 12 && hour < 14) return { id: '2', label: '12-14' };
  if (hour >= 14 && hour < 16) return { id: '3', label: '14-16' };
  if (hour >= 16 && hour < 18) return { id: '4', label: '16-18' };
  if (hour >= 18 && hour < 20) return { id: '5', label: '18-20' };
  return { id: 'other', label: 'Khác' };
}

function formatScanDateTime(raw) {
  if (!raw || raw.length < 14) return raw || '—';
  const y = raw.substring(0, 4);
  const m = raw.substring(4, 6);
  const d = raw.substring(6, 8);
  const hh = raw.substring(8, 10);
  const mm = raw.substring(10, 12);
  const ss = raw.substring(12, 14);
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function StationPassNgDialog({
  open,
  onOpenChange,
  station,
  type = 'PASS', // 'PASS' | 'NG'
  params,
  themeStyle,
}) {
  const [selectedSlot, setSelectedSlot] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copiedSn, setCopiedSn] = useState(null);

  const isNg = type === 'NG';
  const categoryParam = isNg ? 'NG' : 'FINISH';

  useEffect(() => {
    if (open) {
      setSelectedSlot('ALL');
      setSearch('');
      setPage(1);
    }
  }, [open, type, station]);

  const stationId = station?.stationId;
  const mo = params?.mo;
  const line = params?.line;
  const sDate = params?.sDate;
  const shift = params?.shift || '1';

  const queryParams = useMemo(() => {
    if (!open || !mo || !stationId) return null;
    return {
      mo,
      station: stationId,
      line,
      sDate,
      shift,
      category: categoryParam,
    };
  }, [open, mo, stationId, line, sDate, shift, categoryParam]);

  const {
    data: rawData = [],
    isLoading,
    isFetching,
    refetch,
  } = useStationSerials(queryParams, { enabled: Boolean(open && queryParams) });

  const data = useMemo(() => {
    const arr = Array.isArray(rawData) ? rawData : rawData?.data || [];
    return arr.map((item) => {
      const slotInfo = getSlotForTimestamp(item.scanDateTime, params?.shift || '1');
      return {
        ...item,
        slotId: slotInfo?.id ?? 'other',
        slotLabel: slotInfo?.label ?? 'Khác',
      };
    });
  }, [rawData, params?.shift]);

  // Danh sách slot tương ứng với ca
  const slotList = useMemo(() => {
    const baseSlots = params?.shift === '2' ? SHIFT_2_SLOTS : SHIFT_1_SLOTS;
    return baseSlots.map((slot) => {
      const count = data.filter((item) => item.slotId === slot.id).length;
      return {
        ...slot,
        count,
      };
    });
  }, [data, params?.shift]);

  // Lọc dữ liệu theo slot và từ khóa tìm kiếm
  const filteredData = useMemo(() => {
    let result = data;
    if (selectedSlot !== 'ALL') {
      result = result.filter((item) => item.slotId === selectedSlot);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.sn?.toLowerCase().includes(q) ||
          item.statusDesc?.toLowerCase().includes(q) ||
          item.userId?.toLowerCase().includes(q) ||
          item.userName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, selectedSlot, search]);

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
      .join('\n');
    navigator.clipboard?.writeText(snList);
    setCopiedSn('ALL');
    setTimeout(() => setCopiedSn(null), 1500);
  };

  const handleExportCsv = () => {
    const headers = [
      'STT',
      'Serial Number',
      'Khung gio',
      'Thoi gian scan',
      'Ket qua',
      'Nguoi scan',
      'Chuyen',
    ];
    const rows = filteredData.map((d, index) => [
      index + 1,
      `"${d.sn || ''}"`,
      `"${d.slotLabel || ''}"`,
      `"${formatScanDateTime(d.scanDateTime)}"`,
      `"${d.statusDesc || (isNg ? 'NG Lỗi' : 'Pass Đạt')}"`,
      `"${d.userId || ''} ${d.userName || ''}".trim()`,
      `"${d.line || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${type}_${station?.stationId}_${params?.sDate || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              {isNg ? (
                <AlertCircle className="size-5 text-rose-500 shrink-0" />
              ) : (
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
              )}
              <span>Chi tiết Serial {isNg ? 'BỊ LỖI (NG)' : 'ĐẠT (PASS)'} trong ca</span>
              <Badge
                variant="outline"
                className={cn(
                  'ml-1',
                  isNg
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                Trạm: {station?.stationId} {station?.stationName ? `(${station.stationName})` : ''}
              </Badge>
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
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
              Ca:{' '}
              <strong className="text-foreground">
                {params?.shift === '2' ? 'Ca đêm (2)' : 'Ca ngày (1)'}
              </strong>
            </span>
            <span>
              Tổng bản ghi:{' '}
              <strong className={isNg ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                {formatNumber(data.length)} PCS
              </strong>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Filter className="size-3.5 text-production-blue" />
            <span>Xem theo Khung giờ:</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedSlot('ALL');
                  setPage(1);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all shadow-2xs',
                  selectedSlot === 'ALL'
                    ? isNg
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[var(--surface)] text-muted-foreground hover:bg-[var(--surface-hover)] hover:text-foreground border border-border/80'
                )}
              >
                <span>Tất cả ca</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-black',
                    selectedSlot === 'ALL'
                      ? 'bg-black/25 text-white'
                      : 'bg-foreground/10 text-foreground'
                  )}
                >
                  {formatNumber(data.length)}
                </span>
              </button>

              {slotList.map((slot) => {
                const isCurrentSlot = selectedSlot === slot.id;
                const hasData = slot.count > 0;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot.id);
                      setPage(1);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all',
                      isCurrentSlot
                        ? isNg
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                        : hasData
                          ? 'bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)] border border-border/80'
                          : 'bg-[var(--surface)]/50 text-muted-foreground/60 border border-border/40 cursor-default'
                    )}
                  >
                    <span>{slot.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-black',
                        isCurrentSlot
                          ? 'bg-black/25 text-white'
                          : hasData
                            ? isNg
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-foreground/5 text-muted-foreground'
                      )}
                    >
                      {slot.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-1.5">
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
                <span className="hidden sm:inline">Làm mới</span>
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
                    <span className="hidden sm:inline">Sao chép tất cả SN</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || !filteredData.length}
                onClick={handleExportCsv}
                className="h-8 gap-1.5 text-xs border-border-strong bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)]"
              >
                <Download className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Xuất CSV</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── SEARCH INPUT ── */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm Serial Number, mã người quét..."
            className="h-8.5 pl-8 text-xs bg-[var(--surface)] border-border-strong"
          />
          {search && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              Tìm thấy {formatNumber(filteredData.length)} bản ghi
            </span>
          )}
        </div>

        <div className="relative rounded-lg border border-border-strong bg-card overflow-hidden">
          <div className="max-h-90 overflow-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-[var(--surface-overlay)] border-b border-border/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center text-foreground font-bold">STT</TableHead>
                  <TableHead className="w-48 text-foreground font-bold">Serial Number</TableHead>
                  <TableHead className="w-24 text-center text-foreground font-bold">
                    Khung giờ
                  </TableHead>
                  <TableHead className="w-40 text-foreground font-bold">Thời gian quét</TableHead>
                  <TableHead className="w-32 text-foreground font-bold">Kết quả</TableHead>
                  <TableHead className="w-36 text-foreground font-bold">Người quét</TableHead>
                  <TableHead className="w-24 text-foreground font-bold">Chuyền</TableHead>
                  <TableHead className="w-14 text-center text-foreground font-bold">Chép</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-44 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RotateCw className="size-6 animate-spin text-production-blue" />
                        <span>Đang tải danh sách Serial từ MES SFIS...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-muted-foreground">
                      Không có Serial nào trong khung giờ / điều kiện tìm kiếm này.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((item, index) => {
                    const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                    const isCopied = copiedSn === item.sn;
                    return (
                      <TableRow
                        key={`${item.sn}-${index}`}
                        className="hover:bg-[var(--surface-hover)] border-b border-border/50"
                      >
                        <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground tracking-wide">
                          {item.sn}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300">
                            {item.slotLabel}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {formatScanDateTime(item.scanDateTime)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black',
                              isNg
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            )}
                          >
                            {isNg ? (
                              <AlertCircle className="size-3" />
                            ) : (
                              <CheckCircle2 className="size-3" />
                            )}
                            {item.statusDesc || (isNg ? 'NG Lỗi' : 'Pass Đạt')}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px] truncate max-w-35">
                          {item.userId
                            ? `${item.userId}${item.userName ? ` - ${item.userName}` : ''}`
                            : '—'}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {item.line || params?.line || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            title="Sao chép Serial"
                            onClick={() => handleCopySn(item.sn)}
                            className="inline-flex size-6 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                          >
                            {isCopied ? (
                              <Check className="size-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="size-3.5 text-muted-foreground hover:text-foreground" />
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border/80 bg-[var(--surface-overlay)] px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Hiển thị <strong className="text-foreground">{pageRows.length}</strong> /{' '}
              <strong className="text-foreground">{formatNumber(filteredData.length)}</strong> bản
              ghi
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px]">
                Trang {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="size-7"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="size-7"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StationPassNgDialog;
