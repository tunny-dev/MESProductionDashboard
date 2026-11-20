import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, MonitorPlay } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ExportReportDialog } from '@/features/production-dashboard/components/ExportReportDialog';
import { ColumnSettingsDropdown } from '@/features/production-dashboard/components/ColumnSettingsDropdown';
import { useAuthStore } from '@/store/authStore';

export const ScopeBar = memo(function ScopeBar({
  copy,
  lineId,
  lineLabel,
  date,
  shift,
  mo,
  deptCode,
  stations = [],
  columnSettings,
  wipLimit,
  onWipLimitChange,
  onResetWipLimit,
  defaultWipLimit,
}) {
  const { t } = useTranslation();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const items = [{ id: 'DAY', label: copy.scopeBar.day, hint: copy.scopeBar.dayHint }];

  const authUser = useAuthStore((state) => state.user);
  const currentEmpNo = (
    authUser?.id ||
    authUser?.username ||
    authUser?.name ||
    authUser?.empNo ||
    ''
  )
    .trim()
    .toUpperCase();
  const canViewBoard = currentEmpNo === 'K00136';

  const shiftParam = shift === 'night' || shift === '2' ? '2' : '1';
  const dateParam = date ? String(date).replace(/-/g, '').trim() : '';
  const moParam = mo ? String(mo).trim() : '';

  return (
    <>
      <div
        role="group"
        aria-label={copy.scopeBar.label}
        className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border border-border bg-card px-3 py-1.5"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            id="production-scope-label"
            className="shrink-0 text-[10px] font-medium text-muted-foreground xl:text-[11px]"
          >
            {copy.scopeBar.label}
          </span>

          <ToggleGroup
            aria-labelledby="production-scope-label"
            value={['DAY']}
            variant="outline"
            size="sm"
            spacing={1}
            className="shrink-0"
          >
            {items.map(({ id, label, hint }) => (
              <Tooltip key={id}>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value={id}
                      aria-label={hint}
                      className="gap-1.5 px-3 text-xs data-[pressed]:bg-secondary data-[pressed]:text-foreground font-medium cursor-pointer"
                    />
                  }
                >
                  {label}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {hint}
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>

          {lineId && canViewBoard ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    asChild
                    className="size-7.5 shrink-0 border-production-blue/45 bg-production-blue/10 text-production-blue hover:bg-production-blue/20 hover:text-production-blue shadow-xs"
                  />
                }
              >
                <Link
                  to={`/production-board?line=${encodeURIComponent(lineId)}&date=${encodeURIComponent(dateParam)}&shift=${encodeURIComponent(shiftParam)}${moParam ? `&mo=${encodeURIComponent(moParam)}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MonitorPlay className="size-4" aria-hidden="true" />
                  <span className="sr-only">
                    {t('productionBoard.openBoard', {
                      line: lineLabel || lineId,
                      defaultValue: `Bảng Sản Lượng Chuyền (${lineLabel || lineId})`,
                    })}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs font-medium">
                {t('productionBoard.openBoard', {
                  line: lineLabel || lineId,
                  defaultValue: `Bảng Sản Lượng Chuyền (${lineLabel || lineId})`,
                })}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {/* Nút Cài đặt hiển thị cột & Nút Xuất Báo Cáo góc phải ScopeBar */}
        <div className="flex items-center gap-2">
          {columnSettings && (
            <ColumnSettingsDropdown
              columns={columnSettings.columns}
              onToggle={columnSettings.toggleColumn}
              onSelectAll={columnSettings.selectAll}
              onResetDefault={columnSettings.resetDefault}
              activeCount={columnSettings.activeCount}
              totalCount={columnSettings.totalCount}
              wipLimit={wipLimit}
              onWipLimitChange={onWipLimitChange}
              onResetWipLimit={onResetWipLimit}
              defaultWipLimit={defaultWipLimit}
            />
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            className="h-7.5 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-medium cursor-pointer shadow-xs transition-colors"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" aria-hidden="true" />
            <span>{t('exportDialog.button', 'Xuất báo cáo')}</span>
          </Button>
        </div>
      </div>

      {exportDialogOpen ? (
        <ExportReportDialog
          open
          onOpenChange={setExportDialogOpen}
          lineId={lineId}
          lineLabel={lineLabel}
          mo={mo}
          deptCode={deptCode}
          selectedDate={date}
          shift={shiftParam}
          stations={stations}
        />
      ) : null}
    </>
  );
});
