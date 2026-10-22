import { memo, useState } from 'react';
import { format } from 'date-fns';
import { enUS, vi, zhCN } from 'react-day-picker/locale';
import { CalendarDays, Loader2, Maximize2, Minimize2, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import { DisplaySettingsDialog } from '@/components/common/preferences';
import {
  WoPickerDialog,
  WoPickerTrigger,
} from '@/features/production-dashboard/components/wo-picker-dialog';
import { DASHBOARD_CONFIG } from '@/features/production-dashboard/lib/dashboard-config';
import { Link } from 'react-router-dom';

const calendarLocales = { vi, en: enUS, zh: zhCN };
const weekdaysVi = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getProductionDateLabel(date, language) {
  const languageCode = String(language || 'vi').split('-')[0];
  const formattedDate = format(date, 'dd/MM/yyyy');

  if (languageCode === 'vi') return `${formattedDate} ${weekdaysVi[date.getDay()]}`;
  const weekday = new Intl.DateTimeFormat(languageCode, { weekday: 'long' }).format(date);
  return `${formattedDate} ${weekday}`;
}

function FilterSelect({
  id,
  label,
  value,
  valueLabel,
  valueTitle,
  placeholder,
  disabled = false,
  loading = false,
  loadingText,
  onValueChange,
  themeStyle,
  children,
}) {
  const displayText =
    typeof valueLabel === 'string' && valueLabel
      ? valueLabel
      : typeof value === 'string' && value
        ? value
        : null;

  return (
    <div className="grid min-w-0 gap-1">
      <label
        htmlFor={id}
        className="truncate text-[10px] font-medium text-muted-foreground xl:text-[11px]"
      >
        {label}
      </label>
      <Select value={value ?? ''} onValueChange={onValueChange} disabled={disabled || loading}>
        <SelectTrigger
          id={id}
          aria-label={label}
          title={typeof valueTitle === 'string' ? valueTitle : undefined}
          className="w-full min-w-0 border-border-strong bg-[var(--surface)] px-2.5 text-base text-foreground hover:bg-[var(--surface-hover)] md:text-sm data-[size=default]:h-9"
        >
          {loading ? (
            <span className="flex flex-1 items-center gap-1.5 truncate text-left text-muted-foreground">
              <Loader2 className="size-3.5 shrink-0 animate-spin text-production-blue" />
              <span className="truncate">{loadingText ?? '…'}</span>
            </span>
          ) : displayText ? (
            <span className="flex-1 truncate text-left">{displayText}</span>
          ) : (
            <span className="flex-1 truncate text-left text-muted-foreground">{placeholder}</span>
          )}
        </SelectTrigger>
        <SelectContent
          style={themeStyle}
          className="w-max min-w-full border-border-strong bg-popover text-popover-foreground"
          align="start"
          alignItemWithTrigger={false}
        >
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

export const DashboardHeader = memo(function DashboardHeader({
  lineType,
  language,
  process,
  processes,
  lines,
  linesLoading,
  lineId,
  lineLabel,
  wo,
  woLabel,
  woList = [],
  woLoading,
  shiftId,
  selectedDate,
  dateDisabled,
  clockTime,
  lastUpdated,
  isFetching,
  isSearching = false,
  isDisconnected,
  isFullscreen,
  fullscreenUnsupported,
  theme,
  themeStyle,
  copy,
  onProcessChange,
  onLineChange,
  onWoChange,
  onShiftChange,
  onDateChange,
  onSearch,
  canSearch,
  onThemeChange,
  onToggleFullscreen,
  onRetry,
}) {
  const activeLanguage = language || 'vi';
  const [woPickerOpen, setWoPickerOpen] = useState(false);
  const locale = calendarLocales[String(activeLanguage).split('-')[0]] || vi;
  const shiftLabels = {
    day: copy.dayShift,
    night: copy.nightShift,
  };
  const shiftTriggerLabels = {
    day: copy.dayShiftShort,
    night: copy.nightShiftShort,
  };

  return (
    <header className="sticky top-0 z-40 grid shrink-0 grid-cols-1 items-center gap-x-3 gap-y-3 border-b border-border/80 bg-background pb-2 sm:grid-cols-[minmax(0,1fr)_max-content] xl:grid-cols-[minmax(0,max-content)_minmax(0,1fr)_minmax(0,max-content)] xl:gap-4 2xl:gap-6">
      <div className="flex min-w-0 items-center gap-2.5 sm:col-start-1 sm:row-start-1">
        <Link
          to="/"
          className="flex shrink-0 items-center border-r border-border-strong pr-3 cursor-pointer"
        >
          <img src="/logo.png" alt="SENAO" className="h-10 w-auto 2xl:h-11" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-pretty text-sm font-semibold tracking-wide text-foreground 2xl:text-base">
            {copy.title(lineType)}
          </h1>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {copy.subtitle(lineType)}
          </p>
        </div>
      </div>

      <section
        aria-label={copy.filters.line}
        className="grid min-w-0 grid-cols-2 gap-2.5 sm:col-span-2 sm:col-start-1 sm:row-start-2 sm:grid-cols-3 xl:w-full xl:max-w-[1040px] xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:justify-self-start xl:gap-3 2xl:justify-self-center
        "
      >
        <FilterSelect
          id="production-process-filter"
          label={copy.filters.process}
          value={process}
          placeholder={copy.filters.selectProcess}
          themeStyle={themeStyle}
          onValueChange={onProcessChange}
        >
          <SelectGroup>
            <SelectLabel className="text-production-blue">{copy.filters.process}</SelectLabel>
            {processes.map((process) => (
              <SelectItem key={process} value={process}>
                {process}
              </SelectItem>
            ))}
          </SelectGroup>
        </FilterSelect>

        <FilterSelect
          id="production-line-filter"
          label={copy.filters.line}
          value={lineId}
          valueLabel={lineLabel || undefined}
          placeholder={copy.filters.selectLine}
          disabled={!process || linesLoading}
          loading={linesLoading}
          loadingText={copy.loadingShort}
          themeStyle={themeStyle}
          onValueChange={onLineChange}
        >
          <SelectGroup>
            <SelectLabel className="text-production-blue">{copy.filters.line}</SelectLabel>
            {lines.map((line) => (
              <SelectItem key={line.id} value={line.id}>
                {line.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </FilterSelect>

        <div className="grid min-w-0 gap-1">
          <span
            id="production-date-label"
            className="truncate text-[10px] font-medium text-muted-foreground xl:text-[11px]"
          >
            {copy.filters.date}
          </span>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={dateDisabled}
                  aria-label={`${copy.filters.date}: ${format(selectedDate, 'dd/MM/yyyy')}`}
                  className="h-9 w-full min-w-0 justify-start gap-2 border-border-strong bg-[var(--surface)] px-2.5 text-base font-normal text-foreground hover:bg-[var(--surface-hover)] md:text-sm"
                />
              }
            >
              <CalendarDays data-icon="inline-start" aria-hidden="true" />
              <span className="truncate">{format(selectedDate, 'dd/MM/yyyy')}</span>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              style={themeStyle}
              className="w-auto border-border-strong bg-popover p-2 text-popover-foreground"
            >
              <h2 className="sr-only">{copy.filters.date}</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                locale={locale}
                className="rounded-lg bg-transparent"
                classNames={{
                  day_button: 'text-foreground hover:bg-[var(--surface-hover)]',
                  selected: 'bg-production-blue text-background',
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <WoPickerTrigger
          label={copy.filters.wo ?? 'WO'}
          valueLabel={woLabel || undefined}
          placeholder={copy.filters.selectWo}
          loadingText={copy.loadingWo}
          disabled={!lineId || woLoading}
          loading={woLoading}
          onOpen={() => setWoPickerOpen(true)}
        />
        {woPickerOpen ? (
          <WoPickerDialog
            open
            onOpenChange={setWoPickerOpen}
            woList={woList}
            value={wo ?? null}
            onSelect={onWoChange}
            copy={copy}
          />
        ) : null}

        <FilterSelect
          id="production-shift-filter"
          label={copy.filters.shift}
          value={shiftId}
          placeholder={copy.filters.selectShift}
          disabled={!lineId}
          themeStyle={themeStyle}
          valueLabel={shiftId ? shiftTriggerLabels[shiftId] : undefined}
          valueTitle={shiftId ? shiftLabels[shiftId] : undefined}
          onValueChange={onShiftChange}
        >
          <SelectGroup>
            <SelectLabel className="text-production-blue">{copy.filters.shift}</SelectLabel>
            {DASHBOARD_CONFIG.shifts.map((shift) => (
              <SelectItem key={shift.id} value={shift.id}>
                {shiftLabels[shift.id]}
              </SelectItem>
            ))}
          </SelectGroup>
        </FilterSelect>

        <div className="grid min-w-0 content-end gap-1">
          <span
            aria-hidden="true"
            className="hidden truncate text-[10px] font-medium xl:block xl:text-[11px]"
          >
            &nbsp;
          </span>
          <Button
            type="button"
            variant="default"
            size="icon-lg"
            disabled={!canSearch || isSearching}
            onClick={onSearch}
            title={copy.filters.search}
            aria-label={copy.filters.search}
            className="shrink-0"
          >
            {isSearching ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Search aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
      </section>

      <div className="flex min-w-0 items-center justify-between gap-3 sm:col-start-2 sm:row-start-1 xl:min-w-[270px] xl:col-start-3 xl:justify-end">
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-[11px] font-medium text-foreground">
            {getProductionDateLabel(selectedDate, activeLanguage)}
          </p>
          <time
            dateTime={clockTime.toISOString()}
            className="block text-xl font-semibold leading-tight tracking-wide tabular-nums text-foreground 2xl:text-2xl"
          >
            {format(clockTime, 'HH:mm:ss')}
          </time>
          <div className="flex items-center justify-end gap-1 truncate text-[9px] text-muted-foreground">
            {isDisconnected ? (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                <span className="truncate">
                  {copy.errors.connection} {lastUpdated}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={copy.retry}
                  className="shrink-0 text-danger-text hover:bg-danger/10 hover:text-danger-text"
                  onClick={onRetry}
                >
                  <RefreshCw aria-hidden="true" />
                </Button>
              </>
            ) : (
              <>
                <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
                <span className="truncate">
                  {copy.lastUpdated}: {lastUpdated}
                  {isFetching ? ` · ${copy.refreshing}` : ''}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="shrink-0 border-border-strong bg-[var(--surface)] text-foreground hover:bg-[var(--surface-hover)]"
            aria-label={isFullscreen ? copy.exitFullscreen : copy.fullscreen}
            title={
              fullscreenUnsupported
                ? copy.fullscreenUnsupported
                : isFullscreen
                  ? copy.exitFullscreen
                  : copy.fullscreen
            }
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Button>
          <DisplaySettingsDialog
            language={activeLanguage}
            theme={theme}
            onThemeChange={onThemeChange}
            contentStyle={themeStyle}
          />
        </div>
      </div>
    </header>
  );
});
