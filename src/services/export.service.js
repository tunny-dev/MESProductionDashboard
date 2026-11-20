import * as XLSX from 'xlsx';
import { ENDPOINTS } from '@/config/api';
import { http } from '@/lib/http';

/** Lấy dữ liệu báo cáo dạng bảng từ ExportAPI (dùng cho preview và export). */
export async function getExportReportData(request) {
  return await http.post(ENDPOINTS.export.reportData, request);
}

/**
 * Xuất dữ liệu ra file Excel (.xlsx).
 * @param {{ fileName?: string, sheetName?: string, columns: Array<object>, rows: Array<object> }} options
 */
export function generateExcelReport({
  fileName = 'BaoCao_SanXuat',
  sheetName = 'Báo cáo',
  columns = [],
  rows = [],
}) {
  const wb = XLSX.utils.book_new();

  // Header row
  const headerRow = columns.map((col) => col.title);
  const aoa = [headerRow];

  // Data rows
  rows.forEach((row) => {
    const dataRow = columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (col.format === 'number' && typeof val !== 'number') {
        const num = Number(val);
        return isNaN(num) ? val : num;
      }
      return val;
    });
    aoa.push(dataRow);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto calculate column widths
  const colWidths = columns.map((col) => {
    let maxLen = (col.title || '').length;
    rows.forEach((r) => {
      const cellVal = String(r[col.key] ?? '');
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    });
    const customWidth = col.width || 14;
    return { wch: Math.max(customWidth, Math.min(maxLen + 4, 45)) };
  });
  ws['!cols'] = colWidths;

  if (columns.length > 0 && rows.length > 0) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length, c: columns.length - 1 },
      }),
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

  const cleanFileName = (fileName || 'BaoCao_MES').replace(/[\\/:*?"<>|]/g, '_').trim();
  XLSX.writeFile(wb, `${cleanFileName}.xlsx`, { bookType: 'xlsx', type: 'binary' });
}

/** Xuất dữ liệu bảng ra file CSV. */
export function generateCsvReport({ fileName = 'BaoCao_SanXuat', columns = [], rows = [] }) {
  const header = columns.map((c) => `"${(c.title || '').replace(/"/g, '""')}"`).join(',');
  const lines = rows.map((r) =>
    columns
      .map((c) => {
        const val = r[c.key];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [header, ...lines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanFileName = (fileName || 'BaoCao_MES').replace(/[\\/:*?"<>|]/g, '_').trim();
  link.setAttribute('href', url);
  link.setAttribute('download', `${cleanFileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
