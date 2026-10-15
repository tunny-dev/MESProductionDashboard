import { useState, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Pause, Play, RotateCw, Download } from 'lucide-react';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  normalizeWipSummaryRows,
  mergeWipStationColumns,
} from '@/features/wip-report/api/wip-report';
import { getProcessStations } from '@/features/wip-report/lib/wip-station-config';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const RELOAD_SECONDS = 280;

/* ─── Column definitions ────────────────────────────────────────────────────
 * KHÔNG sticky ngang cột nào: `position: sticky; left` trên td tương tác xấu
 * với vùng scroll (kéo gần cuối thì kẹt, thiếu ~1 cột) nên toàn bộ bảng scroll
 * theo như web cũ. Trường `sticky`/`left`/`lastSticky` giữ lại cho đủ shape
 * nhưng không còn tác dụng dính.
 * Cột trạm do `mergeWipStationColumns` dựng từ danh sách fix cứng theo công
 * đoạn rồi nối vào sau BASE_COLS.
 * ─────────────────────────────────────────────────────────────────────────── */
// widths:  seq=40  model=90  upn=130  mo=130  line=60  → total sticky = 450
const BASE_COLS = [
  { key: 'seq',            label: '#',               w: 40,  align: 'center', sticky: true, left: 0,   lastSticky: false },
  // Model hien FULL text (wrap xuong dong neu dai) thay vi cat "…" — ten
  // model dai (~35 ky tu) nen cot rong 150; cac cot sticky sau dich left theo.
  // UPN = Model (part) nen BỎ cột UPN, chỉ giữ Model.
  { key: 'model',          label: 'Model',           w: 150, sticky: true,  left: 40,  lastSticky: false, wrap: true },
  { key: 'mo',             label: 'MO',              w: 130, sticky: true,  left: 190, lastSticky: false, link: true },
  // Line hiện mã + tên chuyền (2 dòng), wrap khi dài.
  { key: 'line',           label: 'Line',            w: 130, sticky: true,  left: 320, lastSticky: true, wrap: true },
  // scrollable
  { key: 'moType',         label: 'MO Type',         w: 80  },
  { key: 'moDays',         label: 'MO Days',         w: 75,  align: 'right', numeric: true },
  { key: 'sapLot',         label: 'SapLot',          w: 70,  align: 'right', numeric: true },
  { key: 'input',          label: 'Input',           w: 70,  align: 'right', numeric: true },
  { key: 'output',         label: 'Output',          w: 70,  align: 'right', numeric: true },
  { key: 'wip',            label: 'WIP',             w: 70,  align: 'right', numeric: true, highlight: true },
  { key: 'notInput',       label: 'NotInput',        w: 75,  align: 'right', numeric: true },

];

const BASE_FOOTER_NUMERIC_KEYS = [
  'moDays','sapLot','input','output','wip',
  'notInput',
];

/* ─── Inline style helpers (avoid Tailwind JIT misses for dynamic values) ── */
// BỎ sticky ngang toàn bảng + BỎ maxWidth kẹp cột: `position: sticky; left`
// trên td và max-width trên table-cell là 2 thứ làm vùng scroll ngang sai
// (kéo gần cuối thì kẹt, thiếu ~1 cột). Toàn bộ cột scroll theo như web cũ.
// width/minWidth giữ làm độ rộng tối thiểu; min-width: 100% ở table dãn cột
// cho đầy khung khi màn rộng (không còn khoảng chết vì cột được dãn thật,
// không bị kẹp).
function stickyStyle(col) {
  return { width: col.w, minWidth: col.w };
}
function headerStickyStyle(col) {
  return { width: col.w, minWidth: col.w };
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function WipSummaryTab({ data, stationData, mfgType, isLoading, reportTime, moCreateDateFrom, moCreateDateTo, onRefetch }) {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [paused, setPaused]     = useState(false);
  const [countdown, setCountdown] = useState(RELOAD_SECONDS);

  // Dữ liệu thật từ GET_WIP_SUMMARY + GET_WIP_STATION. Hết fake:
  // không có rows thì bảng trống (empty state), footer = 0.
  const { rows, cols, footerKeys, extraStationCount } = useMemo(() => {
    const summary = normalizeWipSummaryRows(data, mfgType);
    // Cot tram lay tu danh sach fix cung theo cong doan (moType nao cung
    // map vao dung cot cua no; tram MO khong di qua hien '—').
    const merged = mergeWipStationColumns(
      summary,
      stationData,
      getProcessStations(mfgType)
    );
    const stationCols = merged.stationCols.map((c) => ({
      key: c.key,
      label: c.label,
      title: c.title,
      w: 90,
      align: 'right',
      numeric: true,
    }));
    const cols = [...BASE_COLS, ...stationCols];
    return {
      rows: merged.rows,
      cols,
      footerKeys: [...BASE_FOOTER_NUMERIC_KEYS, ...stationCols.map((c) => c.key)],
      extraStationCount: merged.extraCount,
    };
  }, [data, stationData, mfgType]);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageRows   = rows.slice((page - 1) * pageSize, page * pageSize);

  // Footer cộng dồn từ số thật: SubTotal = trang đang xem, Total = tất cả.
  const footerKeyString = footerKeys.join('|');
  const subtotal = useMemo(() => {
    const keys = footerKeyString.split('|');
    const out = {};
    for (const k of keys) {
      out[k] = pageRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    }
    return out;
  }, [pageRows, footerKeyString]);
  const total = useMemo(() => {
    const keys = footerKeyString.split('|');
    const out = {};
    for (const k of keys) {
      out[k] = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    }
    return out;
  }, [rows, footerKeyString]);

  const dateRangeLabel = [moCreateDateFrom, moCreateDateTo].filter(Boolean).join(' ~ ');

  /* countdown */
  const handleReload = useCallback(() => {
    setCountdown(RELOAD_SECONDS);
    onRefetch?.();
  }, [onRefetch]);

  useEffect(() => {
    if (paused) return undefined;
    if (countdown > 0) {
      const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(id);
    }
    // Hết giờ: dời reload sang task sau để không setState đồng bộ trong effect.
    const id = setTimeout(handleReload, 0);
    return () => clearTimeout(id);
  }, [paused, countdown, handleReload]);

  if (isLoading) {
    return (
      <div className="py-2" role="status" aria-live="polite" aria-label="Loading WIP data">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Loading WIP data…
        </div>
        <div className="space-y-1.5" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Toolbar — fixed height */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="rounded bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
            Report Time: {reportTime ?? format(new Date(), 'yyyy/MM/dd HH:mm:ss')}
          </p>
          {dateRangeLabel && (
            <p className="rounded bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
              MO Create Date: {dateRangeLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tabular-nums text-xs text-muted-foreground">
            Auto Reload Countdown: {countdown}
          </span>
          <Button variant="outline" size="icon-sm" aria-label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Refresh now" onClick={handleReload}>
            <RotateCw className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Download">
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Table — scroll ngang DUY NHẤT ở đây (khung bảng), height tự co theo số rows.
        overscroll-x-contain: kéo tới cuối bảng thì DỪNG ở đó, không tuồn
        scroll ra trang ngoài làm vỡ layout (scroll-chaining).
        [scrollbar-gutter:stable]: thanh scroll giữ chỗ cố định, không đè
        lên dòng Total/footer khi hiện ra. */}
      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border [scrollbar-gutter:stable]">
        <table
          // Rộng theo nội dung THẬT (max-content) + min-width 100% dãn đầy
          // khung khi màn rộng: cột co giãn tự nhiên (không kẹp max), vùng
          // scroll luôn đúng bằng bảng nên cột cuối tới được tay kéo ở mọi
          // cỡ màn hình. border separate + spacing 0 vẽ lưới ô từng cell.
          style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}
          // Lưới ô rõ như web cũ: mỗi th/td có border dưới + phải.
          className="text-xs [&_td]:border-b [&_td]:border-r [&_td]:border-border [&_th]:border-b [&_th]:border-r [&_th]:border-border"
        >
          <caption className="sr-only">WIP Report Summary</caption>

          {/* ── Head — KHÔNG sticky: `position: sticky` trên cả thẻ thead
            (sticky box full-width) làm sai vùng scroll ngang (kéo thiếu
            ~1 cột cuối). Khung bảng không scroll dọc nên sticky dọc cũng
            vô dụng — bỏ hẳn, header scroll cùng body như web cũ. */}
          <thead>
            <tr style={{ backgroundColor: 'var(--color-muted, #f0f3f5)' }}>
              {cols.map((col) => {
                const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
                return (
                  <th
                    key={col.key}
                    title={col.title ?? col.label}
                    style={{
                      ...headerStickyStyle(col),
                      textAlign: align,
                      backgroundColor: 'var(--color-muted, #f0f3f5)',
                    }}
                    className={cn(
                      'px-1.5 py-2 font-medium text-foreground leading-tight',
                      col.sticky ? 'whitespace-nowrap' : 'whitespace-normal'
                    )}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {pageRows.length > 0 ? (
              pageRows.map((row, ri) => (
                <BodyRow key={`${row.mo}|${row.line}|${ri}`} row={row} cols={cols} />
              ))
            ) : (
              <tr>
                <td colSpan={cols.length} className="px-3 py-8 text-center text-muted-foreground">
                  No data — adjust filters and press Query.
                </td>
              </tr>
            )}
          </tbody>

          {/* ── Footer: cộng dồn từ số thật ── */}
          <tfoot>
            <FooterRow label="SubTotal" data={subtotal} cols={cols} footerKeys={footerKeys} bold={false} topBorder />
            <FooterRow label="Total"    data={total} cols={cols} footerKeys={footerKeys} bold />
          </tfoot>
        </table>
      </div>
      {extraStationCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          +{extraStationCount} more station(s) not shown — too many to fit.
        </p>
      ) : null}

      {/* Pagination — fixed at bottom */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        {/* left: count + page buttons */}
        <span className="shrink-0 text-muted-foreground">Total {totalItems} items</span>

        <div className="flex items-center gap-1">
          <NavBtn disabled={page === 1}           onClick={() => setPage(1)}                              label="First">«</NavBtn>
          <NavBtn disabled={page === 1}           onClick={() => setPage((p) => Math.max(1, p - 1))}     label="Prev">‹</NavBtn>
          {getPaginationRange(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon-xs"
                onClick={() => setPage(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}>
                {p}
              </Button>
            )
          )}
          <NavBtn disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} label="Next">›</NavBtn>
          <NavBtn disabled={page === totalPages} onClick={() => setPage(totalPages)}                          label="Last">»</NavBtn>
        </div>

        {/* right: page-size */}
        <div className="ml-auto flex items-center gap-2">
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-6 rounded border border-input bg-transparent px-1 text-xs outline-none">
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ─── Body row — extracted so hover bg works cleanly via group ──────────── */
function BodyRow({ row, cols }) {
  const [hovered, setHovered] = useState(false);


  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: hovered ? 'var(--color-surface-hover, #f5f7f9)' : undefined }}
      className="transition-colors"
    >
      {cols.map((col) => {
        const val = row[col.key];
        const align = col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left';
        const isHighlight = col.highlight && Number(val) > 0;
        // Ô trạm mà MO không đi qua = null → '—'. Ô số thiếu = 0, ô chữ thiếu = '—'.
        const display = val === null || val === undefined ? (col.numeric ? (col.key.startsWith('st:') ? '—' : 0) : '—') : val;

        const text = col.link ? val : display;
        return (
          <td
            key={col.key}
            title={col.title ?? (typeof text === 'string' && text !== '—' ? text : undefined)}
            style={{
              ...stickyStyle(col),
              textAlign: align,
            }}
            className={cn(
              col.wrap ? 'px-1.5 py-1.5 break-words whitespace-normal' : 'overflow-hidden px-1.5 py-1.5 text-ellipsis whitespace-nowrap',
              col.align === 'right' && 'table-nums',
              isHighlight && 'font-medium text-primary underline underline-offset-2'
            )}
          >
            {col.link ? (
              <span className="cursor-pointer text-primary underline-offset-2 hover:underline">{val}</span>
            ) : col.key === 'line' && row.lineName ? (
              <span className="block">
                <span className="block font-medium">{val}</span>
                <span className="block truncate text-muted-foreground" title={row.lineName}>
                  {row.lineName}
                </span>
              </span>
            ) : (
              display
            )}
          </td>
        );
      })}
    </tr>
  );
}

/* ─── Footer row ─────────────────────────────────────────────────────────── */
function FooterRow({ label, data, cols, footerKeys, bold, topBorder }) {
  const bg = bold
    ? 'var(--color-muted, #f0f3f5)'
    : 'var(--color-surface-hover, #f5f7f9)';

  const stickyCols = cols.filter((c) => c.sticky);
  const scrollCols = cols.filter((c) => !c.sticky);
  const stickyTotalW = stickyCols.reduce((s, c) => s + c.w, 0);

  return (
    <tr style={{ backgroundColor: bg }}>
      {/* One merged cell for all sticky columns — label right-aligned */}
      <td
        colSpan={stickyCols.length}
        style={{
          width: stickyTotalW,
          minWidth: stickyTotalW,
          backgroundColor: bg,
          textAlign: 'right',
        }}
        className={cn(
          'overflow-hidden px-2 py-1.5 text-ellipsis whitespace-nowrap',
          topBorder && 'border-t-2 border-t-border',
          bold ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
        )}
      >
        {label}
      </td>

      {/* Scrollable cols */}
      {scrollCols.map((col) => {
        const isNumeric = footerKeys.includes(col.key);
        return (
          <td
            key={col.key}
            style={{ width: col.w, minWidth: col.w, textAlign: isNumeric ? 'right' : 'left' }}
            className={cn(
              'overflow-hidden px-1.5 py-1.5 text-ellipsis whitespace-nowrap',
              topBorder && 'border-t-2 border-t-border',
              isNumeric && 'table-nums',
              bold ? 'font-semibold text-foreground' : 'font-medium text-foreground'
            )}
          >
            {isNumeric ? (data[col.key] ?? 0) : ''}
          </td>
        );
      })}
    </tr>
  );
}

/* ─── Pagination button ──────────────────────────────────────────────────── */
function NavBtn({ disabled, onClick, label, children }) {
  return (
    <Button variant="outline" size="icon-xs" disabled={disabled} onClick={onClick} aria-label={label}>
      {children}
    </Button>
  );
}

/* ─── Pagination range ───────────────────────────────────────────────────── */
function getPaginationRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
