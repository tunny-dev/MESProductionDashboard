import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, RotateCcw, CheckSquare, Check, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/core/utils/utils';
import { STATION_COLUMN_DEFINITIONS } from '@/features/production-dashboard/hooks/useStationColumns';

export const ColumnSettingsDropdown = memo(function ColumnSettingsDropdown({
  columns,
  onToggle,
  onSelectAll,
  onResetDefault,
  activeCount,
  totalCount,
  wipLimit = 300,
  onWipLimitChange,
  onResetWipLimit,
  defaultWipLimit = 300,
}) {
  const { t } = useTranslation();

  const buttonText = t('productionDashboard.table.columnSettings.button', 'Cài đặt hiển thị');
  const titleText = t(
    'productionDashboard.table.columnSettings.title',
    'Cài đặt hiển thị & Cảnh báo'
  );
  const subtitleText = t(
    'productionDashboard.table.columnSettings.subtitle',
    'Tùy chỉnh cột hiển thị và ngưỡng cảnh báo tồn WIP'
  );
  const selectAllText = t('productionDashboard.table.columnSettings.selectAll', 'Chọn tất cả');
  const resetDefaultText = t('productionDashboard.table.columnSettings.resetDefault', 'Mặc định');

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7.5 gap-1.5 border-border-strong bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)] text-xs font-medium cursor-pointer shadow-xs transition-colors"
            title={titleText}
          />
        }
      >
        <SlidersHorizontal className="size-3.5 text-production-blue" aria-hidden="true" />
        <span>{buttonText}</span>
        <Badge
          variant="secondary"
          className="ml-0.5 px-1 py-0 text-[10px] font-bold h-4 bg-production-blue/10 text-production-blue border border-production-blue/20"
        >
          {activeCount}/{totalCount}
        </Badge>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-80 p-0 border border-border-strong bg-[var(--surface-overlay)] text-foreground shadow-2xl rounded-xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-3 pb-2 border-b border-border/70 bg-[var(--surface-muted)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">{titleText}</span>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold h-4.5 px-1.5 border-border-strong bg-[var(--surface)] text-muted-foreground"
            >
              {activeCount}/{totalCount} cột
            </Badge>
          </div>
          <p className="text-[10px] font-normal text-muted-foreground mt-0.5">{subtitleText}</p>
        </div>

        {/* Danh sách hiển thị cột */}
        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-clean">
          {STATION_COLUMN_DEFINITIONS.map((col) => {
            const isChecked = Boolean(columns[col.id]);
            const label = t(
              `productionDashboard.table.columnSettings.columns.${col.id}`,
              col.fallbackLabel
            );
            const groupName = t(
              `productionDashboard.table.columnSettings.groups.${col.groupKey}`,
              col.fallbackGroup
            );

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => onToggle(col.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer select-none',
                  isChecked
                    ? 'hover:bg-production-blue/10 text-foreground font-medium'
                    : 'hover:bg-foreground/5 text-muted-foreground line-through opacity-70'
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isChecked
                        ? 'border-production-blue bg-production-blue text-white'
                        : 'border-border-strong bg-transparent'
                    )}
                  >
                    {isChecked && <Check className="size-3 stroke-3" />}
                  </div>
                  <span className="truncate">{label}</span>
                </div>
                <span className="text-[9px] text-muted-foreground/70 font-normal shrink-0 ml-2">
                  {groupName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Nút Chọn tất cả / Mặc định cho cột */}
        <div className="flex items-center justify-between border-t border-border/70 p-2 bg-[var(--surface-muted)]">
          <button
            type="button"
            onClick={onSelectAll}
            className="flex items-center gap-1 text-[11px] font-bold text-production-blue hover:underline px-2 py-0.5 rounded hover:bg-production-blue/10 transition-colors cursor-pointer"
          >
            <CheckSquare className="size-3" />
            <span>{selectAllText}</span>
          </button>

          <button
            type="button"
            onClick={onResetDefault}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-foreground/5 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3" />
            <span>{resetDefaultText}</span>
          </button>
        </div>

        {/* Cài đặt Ngưỡng cảnh báo WIP (Lưu cục bộ vào trình duyệt máy người dùng) */}
        {onWipLimitChange && (
          <div className="p-3 border-t border-border/70 bg-[var(--surface-muted)]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-500" />
                {t('productionDashboard.wipLimit.title', 'Ngưỡng cảnh báo tồn WIP')}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {wipLimit} PCS
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {t(
                'productionDashboard.wipLimit.desc',
                'Tồn đọng dở dang giữa 2 công đoạn vượt mức này sẽ kích hoạt cảnh báo đỏ 🔴'
              )}
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={99999}
                value={wipLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) onWipLimitChange(val);
                }}
                className="h-7 text-xs font-bold px-2 py-0 w-24 bg-background border-border-strong"
              />
              <span className="text-[11px] font-medium text-muted-foreground">PCS</span>

              {onResetWipLimit && wipLimit !== defaultWipLimit && (
                <button
                  type="button"
                  onClick={onResetWipLimit}
                  className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  title={`Khôi phục mặc định (${defaultWipLimit} PCS)`}
                >
                  {t('productionDashboard.wipLimit.reset', 'Khôi phục')}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 pt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground/80 mr-1">
                {t('productionDashboard.wipLimit.presetLabel', 'Gợi ý:')}
              </span>
              {[
                { label: '50 (SMT)', val: 50 },
                { label: '150 (DIP)', val: 150 },
                { label: '300 (FA)', val: 300 },
                { label: '500', val: 500 },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() => onWipLimitChange(chip.val)}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer',
                    wipLimit === chip.val
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

export default ColumnSettingsDropdown;
