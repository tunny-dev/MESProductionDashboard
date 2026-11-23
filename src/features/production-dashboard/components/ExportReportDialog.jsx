import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  Layers,
  Barcode,
  Workflow,
  BarChart3,
  ShieldAlert,
  Edit3,
  CheckCircle2,
  FileText,
  Search,
  Eye,
  EyeOff,
  Info,
  X,
  AlertCircle,
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
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OverlayScroll } from '@/components/common/OverlayScroll';
import { cn } from '@/core/utils/utils';
import {
  getExportReportData,
  generateExcelReport,
  generateCsvReport,
} from '@/services/export.service';

const exportFormSchema = z.object({
  activeTemplate: z.enum(['HOURLY_PRODUCTION', 'STATION_FLOW', 'STATION_SERIALS', 'YIELD_DEFECT']),
  customFileName: z.string(),
  selectedStation: z.string(),
  selectedCategory: z.enum(['FINISH', 'INPUT', 'WIP', 'NG', 'NOT_INPUT']),
  fileFormat: z.enum(['xlsx', 'csv']),
});

function formatToYyyyMmDd(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10).replace(/-/g, '');
  }
  const digits = s.replace(/\D/g, '');
  return digits.slice(0, 8);
}

export function ExportReportDialog({
  open,
  onOpenChange,
  lineId,
  lineLabel,
  mo,
  deptCode,
  selectedDate,
  shift,
  stations = [],
}) {
  const { t, i18n } = useTranslation();

  const exportForm = useForm({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      activeTemplate: 'HOURLY_PRODUCTION',
      customFileName: '',
      selectedStation: '',
      selectedCategory: 'FINISH',
      fileFormat: 'xlsx',
    },
  });
  const activeTemplate = useWatch({ control: exportForm.control, name: 'activeTemplate' });
  const customFileName = useWatch({ control: exportForm.control, name: 'customFileName' });
  const selectedStation = useWatch({ control: exportForm.control, name: 'selectedStation' });
  const selectedCategory = useWatch({ control: exportForm.control, name: 'selectedCategory' });
  const fileFormat = useWatch({ control: exportForm.control, name: 'fileFormat' });
  const setExportValue = exportForm.setValue;
  const setActiveTemplate = (value) => setExportValue('activeTemplate', value);
  const setCustomFileName = (value) => setExportValue('customFileName', value);
  const setSelectedStation = (value) => setExportValue('selectedStation', value);
  const setSelectedCategory = (value) => setExportValue('selectedCategory', value);
  const setFileFormat = (value) => setExportValue('fileFormat', value);

  // Trạng thái xem trước dữ liệu (on-demand: chỉ truy vấn khi bấm nút)
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const templates = useMemo(
    () => [
      {
        id: 'HOURLY_PRODUCTION',
        title: t('exportDialog.templates.hourly.title', 'Sản lượng Ca & Khung giờ'),
        subtitle: t('exportDialog.templates.hourly.subtitle', 'Sản lượng theo giờ & UPH'),
        desc: t(
          'exportDialog.templates.hourly.desc',
          'Sản lượng 6 khung giờ, UPH, kế hoạch vs thực tế theo từng trạm.'
        ),
        icon: BarChart3,
        color: 'from-blue-600 to-indigo-600',
        tag: t('exportDialog.templates.hourly.tag', 'Ca & Giờ'),
      },
      {
        id: 'STATION_FLOW',
        title: t('exportDialog.templates.flow.title', 'Tiến độ Lệnh & Công đoạn'),
        subtitle: t('exportDialog.templates.flow.subtitle', 'WIP & Routing công đoạn'),
        desc: t(
          'exportDialog.templates.flow.desc',
          'Đầu vào, hoàn thành, tồn WIP và tỷ lệ đạt từng công đoạn.'
        ),
        icon: Workflow,
        color: 'from-emerald-600 to-teal-600',
        tag: t('exportDialog.templates.flow.tag', 'Routing'),
      },
      {
        id: 'STATION_SERIALS',
        title: t('exportDialog.templates.serials.title', 'Chi tiết Serial Number Vào/Ra'),
        subtitle: t('exportDialog.templates.serials.subtitle', 'Truy vết mã Barcode Serial'),
        desc: t(
          'exportDialog.templates.serials.desc',
          'Danh sách chi tiết từng Serial Number: Đã hoàn thành, Đầu vào, Lỗi.'
        ),
        icon: Barcode,
        color: 'from-amber-600 to-orange-600',
        tag: t('exportDialog.templates.serials.tag', 'Serial Barcode'),
      },
      {
        id: 'YIELD_DEFECT',
        title: t('exportDialog.templates.yield.title', 'Tỷ lệ Chất lượng & Lỗi FPY'),
        subtitle: t('exportDialog.templates.yield.subtitle', 'Chỉ số FPY & Phân loại lỗi'),
        desc: t(
          'exportDialog.templates.yield.desc',
          'Báo cáo FPY, số lượng lỗi NG, phân loại mã lỗi và hiện tượng.'
        ),
        icon: ShieldAlert,
        color: 'from-rose-600 to-pink-600',
        tag: t('exportDialog.templates.yield.tag', 'Chất lượng'),
      },
    ],
    [t]
  );

  // Danh mục phân loại Serial
  const categories = useMemo(
    () => [
      { id: 'FINISH', label: t('exportDialog.catFinish', 'Đã hoàn thành (Finish)') },
      { id: 'INPUT', label: t('exportDialog.catInput', 'Đầu vào (Input)') },
      { id: 'WIP', label: t('exportDialog.catWip', 'Tồn dở dang (WIP)') },
      { id: 'NG', label: t('exportDialog.catNg', 'Bị lỗi / Sửa chữa (NG)') },
      { id: 'NOT_INPUT', label: t('exportDialog.catNotInput', 'Chưa nhập chuyền') },
    ],
    [t]
  );

  // Chuẩn hóa ngày an toàn dạng YYYYMMDD
  const cleanDateStr = useMemo(() => {
    return (
      formatToYyyyMmDd(selectedDate) || new Date().toISOString().slice(0, 10).replace(/-/g, '')
    );
  }, [selectedDate]);

  // Ngăn chặn đóng dialog khi bấm click ra ngoài backdrop
  const allowClose = useRef(false);

  const handleOpenChange = (next) => {
    if (!next && !allowClose.current) return;
    allowClose.current = false;
    onOpenChange(next);
  };

  const closeDialog = () => {
    allowClose.current = true;
    onOpenChange(false);
  };

  // Danh sách trạm công đoạn an toàn
  const stationOptions = useMemo(() => {
    if (!Array.isArray(stations) || stations.length === 0) return [];
    return stations
      .map((s) => {
        const code = String(
          s.stationId || s.opCode || s.stationCode || s.station || s.op || s.id || ''
        ).trim();
        const rawName = String(
          s.stationName || s.opName || s.opDes || s.stageDes || s.name || ''
        ).trim();
        const label = rawName && rawName !== code ? `${code} - ${rawName}` : code;
        return { code, label };
      })
      .filter((s) => Boolean(s.code));
  }, [stations]);

  // Cập nhật tên file gợi ý khi đổi template hoặc filter (hỗ trợ đa ngôn ngữ)
  useEffect(() => {
    if (open) {
      const linePart = lineId || 'Line';
      const moPart = mo || 'MO';
      const shiftPart =
        shift === '2' || shift === 'night'
          ? t('exportDialog.fileNameShiftNight', 'CaDem')
          : t('exportDialog.fileNameShiftDay', 'CaNgay');

      let prefix = t('exportDialog.fileNamePrefixHourly', 'BaoCao_SanLuongCa');
      if (activeTemplate === 'STATION_FLOW') {
        prefix = t('exportDialog.fileNamePrefixFlow', 'BaoCao_TienDoCongDoan');
      } else if (activeTemplate === 'STATION_SERIALS') {
        const serialPrefix = t('exportDialog.fileNamePrefixSerials', 'BaoCao_Serial');
        prefix = `${serialPrefix}_${selectedStation || 'All'}_${selectedCategory}`;
      } else if (activeTemplate === 'YIELD_DEFECT') {
        prefix = t('exportDialog.fileNamePrefixYield', 'BaoCao_ChatLuong_FPY');
      }

      setExportValue(
        'customFileName',
        `${prefix}_${linePart}_${moPart}_${cleanDateStr}_${shiftPart}`
      );

      // Reset trạng thái preview khi đổi template
      setPreviewData(null);
      setShowPreview(false);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [
    open,
    activeTemplate,
    lineId,
    mo,
    shift,
    cleanDateStr,
    selectedStation,
    selectedCategory,
    t,
    i18n.language,
    setExportValue,
  ]);

  // Hàm truy vấn 5 dòng dữ liệu xem trước khi người dùng chủ động bấm
  const handleFetchPreview = async () => {
    setPreviewLoading(true);
    setErrorMsg('');
    try {
      const cleanDept =
        deptCode && deptCode !== 'FA' && deptCode !== 'SMT' && deptCode !== 'DIP'
          ? deptCode
          : undefined;

      const payload = {
        reportType: activeTemplate,
        line: lineId,
        mo: mo,
        dept: cleanDept,
        date: cleanDateStr,
        shift: shift === '2' || shift === 'night' ? '2' : '1',
        station: selectedStation || undefined,
        category: selectedCategory,
        limit: 5,
      };

      const res = await getExportReportData(payload);
      setPreviewData(res);
      setShowPreview(true);
    } catch (err) {
      setErrorMsg(
        err.message || t('exportDialog.errorGeneric', 'Không thể tải dữ liệu xem trước từ máy chủ.')
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Mutation xuất báo cáo: giữ dialog mở, hiển thị spin lúc đang xuất
  const { mutate: handleDownload, isPending: isExporting } = useMutation({
    mutationFn: async () => {
      setErrorMsg('');
      setSuccessMsg('');
      const cleanDept =
        deptCode && deptCode !== 'FA' && deptCode !== 'SMT' && deptCode !== 'DIP'
          ? deptCode
          : undefined;

      const payload = {
        reportType: activeTemplate,
        line: lineId,
        mo: mo,
        dept: cleanDept,
        date: cleanDateStr,
        shift: shift === '2' || shift === 'night' ? '2' : '1',
        station: selectedStation || undefined,
        category: selectedCategory,
        limit: 5000,
      };

      const data = await getExportReportData(payload);
      if (!data || !data.rows || data.rows.length === 0) {
        throw new Error(
          t(
            'exportDialog.errorNoRecords',
            'Không có bản ghi nào khớp với điều kiện lọc để xuất file.'
          )
        );
      }
      return data;
    },
    onSuccess: (data) => {
      const fileNameToUse =
        customFileName.trim() || t('exportDialog.defaultFileName', 'BaoCao_MES');

      const localizedColumns = (data.columns || []).map((col) => ({
        ...col,
        title: col.key?.startsWith('slot')
          ? col.title
          : t(`exportDialog.columns.${col.key}`, col.title),
      }));

      const sheetName =
        activeTemplate === 'STATION_SERIALS'
          ? t('exportDialog.sheetSerial', 'Serial List')
          : t('exportDialog.sheetProduction', 'Production Report');

      const localizedRows = (data.rows || []).map((row) => {
        const item = { ...row };
        if (item.status) {
          if (item.status === 'Đang chạy' || item.status === 'Running') {
            item.status = t('exportDialog.statusRunning', 'Đang chạy');
          } else if (item.status === 'Chờ xử lý' || item.status === 'Pending') {
            item.status = t('exportDialog.statusPending', 'Chờ xử lý');
          } else if (item.status === 'Bất thường' || item.status === 'Abnormal') {
            item.status = t('exportDialog.statusAbnormal', 'Bất thường');
          }
        }
        if (item.category) {
          if (item.category === 'FINISH')
            item.category = t('exportDialog.catFinish', 'Đã hoàn thành');
          else if (item.category === 'INPUT') item.category = t('exportDialog.catInput', 'Đầu vào');
          else if (item.category === 'WIP')
            item.category = t('exportDialog.catWip', 'Tồn dở dang (WIP)');
          else if (item.category === 'NG')
            item.category = t('exportDialog.catNg', 'Bị lỗi / Sửa chữa');
          else if (item.category === 'NOT_INPUT')
            item.category = t('exportDialog.catNotInput', 'Chưa nhập chuyền');
        }
        return item;
      });

      if (fileFormat === 'xlsx') {
        generateExcelReport({
          fileName: fileNameToUse,
          sheetName,
          columns: localizedColumns,
          rows: localizedRows,
        });
      } else {
        generateCsvReport({
          fileName: fileNameToUse,
          columns: localizedColumns,
          rows: localizedRows,
        });
      }

      setSuccessMsg(
        t('exportDialog.successMsg', {
          count: data.totalRecords,
          file: `${fileNameToUse}.${fileFormat}`,
          defaultValue: `Đã xuất thành công ${data.totalRecords} bản ghi vào file ${fileNameToUse}.${fileFormat}`,
        })
      );
    },
    onError: (err) => {
      setErrorMsg(err.message || t('exportDialog.errorGeneric', 'Lỗi khi tạo file xuất báo cáo.'));
    },
  });

  const formatCellValue = (row, col) => {
    const val = row[col.key];
    if (val === null || val === undefined) return '-';
    if (col.key === 'status') {
      if (val === 'Đang chạy' || val === 'Running')
        return t('exportDialog.statusRunning', 'Đang chạy');
      if (val === 'Chờ xử lý' || val === 'Pending')
        return t('exportDialog.statusPending', 'Chờ xử lý');
      if (val === 'Bất thường' || val === 'Abnormal')
        return t('exportDialog.statusAbnormal', 'Bất thường');
    }
    if (col.key === 'category') {
      if (val === 'FINISH') return t('exportDialog.catFinish', 'Đã hoàn thành');
      if (val === 'INPUT') return t('exportDialog.catInput', 'Đầu vào');
      if (val === 'WIP') return t('exportDialog.catWip', 'Tồn dở dang (WIP)');
      if (val === 'NG') return t('exportDialog.catNg', 'Lỗi (NG)');
      if (val === 'NOT_INPUT') return t('exportDialog.catNotInput', 'Chưa nhập chuyền');
    }
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        style={{ width: 'min(1200px, 95vw)', maxWidth: 'min(1200px, 95vw)' }}
        className="border border-border-strong bg-card text-card-foreground shadow-2xl rounded-2xl overflow-hidden p-0 gap-0 sm:max-w-5xl max-h-[85vh] flex flex-col min-h-0"
      >
        <button
          type="button"
          onClick={closeDialog}
          disabled={isExporting}
          aria-label={t('exportDialog.cancel', 'Đóng hộp thoại')}
          className="absolute top-3.5 right-3.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground cursor-pointer z-20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center justify-between pr-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {t('exportDialog.title', 'Xuất Báo Cáo Dữ Liệu Sản Xuất')}
                  <Badge
                    variant="outline"
                    className="text-xs font-mono font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  >
                    ExportAPI
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    'exportDialog.description',
                    'Kết xuất dữ liệu phân tích sản xuất MES theo chuẩn Excel (.xlsx) và CSV thuần dữ liệu bảng.'
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <OverlayScroll
          className="flex-1 min-h-0"
          options={{
            scrollbars: {
              autoHide: 'leave',
              autoHideDelay: 300,
            },
          }}
        >
          <form
            id="export-report-form"
            onSubmit={exportForm.handleSubmit(() => handleDownload())}
            className="px-6 py-4 space-y-4"
          >
            {successMsg && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2.5">
                {t('exportDialog.section1', '1. Chọn Mẫu Báo Cáo (Report Template)')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {templates.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = activeTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      disabled={isExporting}
                      onClick={() => setActiveTemplate(tmpl.id)}
                      className={cn(
                        'text-left p-3.5 rounded-xl border transition-all duration-150 relative flex flex-col justify-between group cursor-pointer min-h-[120px]',
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/5 shadow-sm ring-2 ring-emerald-500/30'
                          : 'border-border/70 hover:border-border hover:bg-muted/40 bg-card',
                        isExporting && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={cn(
                              'p-2 rounded-lg text-white shadow-sm bg-gradient-to-br shrink-0',
                              tmpl.color
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border/50">
                            {tmpl.tag}
                          </span>
                        </div>
                        <div className="font-semibold text-sm leading-snug">{tmpl.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {tmpl.desc}
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground/90 flex items-center gap-1.5">
                        <span className="inline-flex size-1.5 rounded-full bg-emerald-500/80" />
                        <span className="truncate font-medium">{tmpl.subtitle}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {t('exportDialog.section2', '2. Phạm Vi & Bộ Lọc Áp Dụng')}
                </span>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="text-muted-foreground">
                    {t('exportDialog.line', 'Chuyền')}:{' '}
                    <strong className="text-foreground">
                      {lineLabel || lineId || t('exportDialog.all', 'Tất cả')}
                    </strong>
                  </span>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">
                    {t('exportDialog.mo', 'Lệnh (MO)')}:{' '}
                    <strong className="font-mono text-foreground">
                      {mo || t('exportDialog.all', 'Tất cả')}
                    </strong>
                  </span>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">
                    {t('exportDialog.date', 'Ngày')}:{' '}
                    <strong className="text-foreground">{cleanDateStr}</strong>
                  </span>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground">
                    {t('exportDialog.shift', 'Ca')}:{' '}
                    <strong className="text-foreground">
                      {shift === '2' || shift === 'night'
                        ? t('exportDialog.nightShift', 'Ca đêm')
                        : t('exportDialog.dayShift', 'Ca ngày')}
                    </strong>
                  </span>
                </div>
              </div>

              {activeTemplate === 'STATION_SERIALS' && (
                <div className="pt-2 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('exportDialog.station', 'Trạm công đoạn:')}
                    </label>
                    <Select
                      value={selectedStation || 'ALL'}
                      onValueChange={(val) => setSelectedStation(val === 'ALL' ? '' : val)}
                      disabled={isExporting}
                    >
                      <SelectTrigger className="w-full h-8 text-xs bg-background border-border/80">
                        <SelectValue placeholder={t('exportDialog.allStations', 'Tất cả trạm')} />
                      </SelectTrigger>
                      <SelectContent align="start" className="max-h-60 z-50">
                        <SelectItem value="ALL">
                          {t('exportDialog.allStations', 'Tất cả trạm')}
                        </SelectItem>
                        {stationOptions.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">
                      {t('exportDialog.category', 'Phân loại dữ liệu:')}
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          disabled={isExporting}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            'text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer',
                            selectedCategory === cat.id
                              ? 'bg-primary text-primary-foreground border-primary font-medium'
                              : 'bg-background text-muted-foreground border-border hover:bg-muted',
                            isExporting && 'opacity-60 cursor-not-allowed'
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                {t('exportDialog.section3', '3. Tùy Chỉnh Tên File & Định Dạng Xuất')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-2">
                  <div className="relative flex items-center">
                    <Input
                      value={customFileName}
                      disabled={isExporting}
                      aria-invalid={Boolean(exportForm.formState.errors.customFileName)}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder={t(
                        'exportDialog.fileNamePlaceholder',
                        'Nhập tên file báo cáo...'
                      )}
                      className="pr-16 font-mono text-xs h-9 bg-background border-border/80"
                    />
                    <span className="absolute right-3 text-xs font-mono font-bold text-muted-foreground pointer-events-none">
                      .{fileFormat}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-emerald-500" />
                    {t(
                      'exportDialog.fileNameHint',
                      'Bạn có thể đặt lại tên file tùy ý trước khi tải về.'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setFileFormat('xlsx')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                      fileFormat === 'xlsx'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/30 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted',
                      isExporting && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {t('exportDialog.formatExcel', 'Excel (.xlsx)')}
                  </button>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setFileFormat('csv')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                      fileFormat === 'csv'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 ring-1 ring-blue-500/30 font-semibold'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted',
                      isExporting && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    {t('exportDialog.formatCsv', 'CSV (.csv)')}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    {showPreview && previewData
                      ? t('exportDialog.previewShowing', {
                          total: previewData.totalRecords,
                          defaultValue: `Đang hiển thị 5 dòng xem trước (${previewData.totalRecords} dòng ghi nhận trong hệ thống).`,
                        })
                      : t(
                          'exportDialog.previewPrompt',
                          'Bạn có thể xem trước 5 dòng dữ liệu mẫu hoặc bấm Tải Báo Cáo ngay.'
                        )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={previewLoading || isExporting}
                      onClick={() => setShowPreview(false)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 mr-1" />
                      {t('exportDialog.collapse', 'Thu gọn')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={previewLoading || isExporting}
                    onClick={exportForm.handleSubmit(handleFetchPreview)}
                    className="h-8 gap-1.5 text-xs font-medium border-border/80 bg-background hover:bg-muted cursor-pointer"
                  >
                    {previewLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        {t('exportDialog.loadingPreview', 'Đang truy vấn...')}
                      </>
                    ) : (
                      <>
                        {showPreview ? (
                          <Search className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-primary" />
                        )}
                        {showPreview
                          ? t('exportDialog.refreshPreview', 'Làm mới xem trước')
                          : t('exportDialog.previewBtn', 'Xem trước (5 dòng)')}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {showPreview && (
                <div className="border border-border/70 rounded-xl overflow-hidden bg-card mt-2">
                  <OverlayScroll
                    className="max-h-56"
                    options={{
                      scrollbars: {
                        autoHide: 'leave',
                        autoHideDelay: 400,
                      },
                    }}
                  >
                    <table className="w-full caption-bottom text-xs border-collapse">
                      <TableHeader className="bg-muted/80 backdrop-blur-md sticky top-0 z-10">
                        <TableRow>
                          {(previewData?.columns || []).map((col) => (
                            <TableHead
                              key={col.key}
                              className={cn(
                                'text-[11px] font-bold text-foreground py-2.5 whitespace-nowrap px-3.5',
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                    ? 'text-center'
                                    : 'text-left'
                              )}
                            >
                              {col.key?.startsWith('slot')
                                ? col.title
                                : t(`exportDialog.columns.${col.key}`, col.title)}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewLoading ? (
                          <TableRow>
                            <TableCell
                              colSpan={Math.max(1, (previewData?.columns || []).length)}
                              className="h-24 text-center text-xs text-muted-foreground"
                            >
                              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-primary" />
                              {t(
                                'exportDialog.loadingPreview',
                                'Đang tải bảng dữ liệu xem trước...'
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (previewData?.rows || []).length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={Math.max(1, (previewData?.columns || []).length)}
                              className="h-20 text-center text-xs text-muted-foreground"
                            >
                              {t(
                                'exportDialog.emptyRecords',
                                'Không có bản ghi nào khớp với điều kiện lọc hiện tại.'
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          (previewData?.rows || []).map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              {(previewData.columns || []).map((col) => (
                                <TableCell
                                  key={col.key}
                                  className={cn(
                                    'text-xs py-2 whitespace-nowrap px-3.5',
                                    col.align === 'right'
                                      ? 'text-right font-mono'
                                      : col.align === 'center'
                                        ? 'text-center font-mono'
                                        : 'text-left'
                                  )}
                                >
                                  {formatCellValue(row, col)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </table>
                  </OverlayScroll>
                </div>
              )}
            </div>
          </form>
        </OverlayScroll>

        <div className="px-6 py-3.5 border-t border-border bg-muted/40 rounded-b-2xl flex items-center justify-between sm:justify-between shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {t(
              'exportDialog.footerNote',
              'Xuất dữ liệu chuẩn bảng (Header cột tại dòng 1, tự động AutoFilter).'
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={closeDialog}
              className="text-xs cursor-pointer"
            >
              {t('exportDialog.cancel', 'Hủy bỏ')}
            </Button>
            <Button
              type="submit"
              form="export-report-form"
              size="sm"
              disabled={isExporting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs min-w-[140px] justify-center"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('exportDialog.exporting', 'Đang xuất file...')}
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  {fileFormat === 'xlsx'
                    ? t('exportDialog.downloadExcel', 'Tải Báo Cáo (XLSX)')
                    : t('exportDialog.downloadCsv', 'Tải Báo Cáo (CSV)')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
