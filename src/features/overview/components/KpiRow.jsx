import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, Percent, Layers, AlertTriangle, Sun, Moon, Clock } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { formatInt, formatPercent, formatClockSeconds } from '@/core/utils/format';
import { useOverviewShifts } from '@/hooks/useOverview';

export function KpiRow({ kpi, shift, shiftId = null, onShiftChange, updatedAt }) {
  const { t } = useTranslation();

  const isDayShift = shift?.id === '1' || shift?.startMinutes < 720;

  return (
    <section aria-label={t('kpi.label', 'Chỉ số KPI')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              isDayShift
                ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-400 dark:bg-indigo-500/20'
            )}
          >
            {isDayShift ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {shift?.name || t('shift.label', 'Ca làm việc')}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t('status.active', 'Đang diễn ra')}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{t('shift.cumulativeTargetNote')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ShiftPicker current={shift} shiftId={shiftId} onChange={onShiftChange} />

          {updatedAt ? (
            <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground table-nums border-l border-border pl-3">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>{t('freshness.updatedAt', 'Cập nhật')}:</span>
              <time
                className="font-semibold text-foreground"
                dateTime={new Date(updatedAt).toISOString()}
              >
                {formatClockSeconds(new Date(updatedAt))}
              </time>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng sản lượng */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-2xs transition-all hover:border-primary/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('kpi.totalOutput', 'Tổng sản lượng')}
            </span>
            <div className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground table-nums">
              {formatInt(kpi.passCount)}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              {kpi.failCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded bg-error/10 px-1.5 py-0.5 font-semibold text-error-strong table-nums">
                  <AlertTriangle className="size-3" />
                  {formatInt(kpi.failCount)} {t('kpi.failures', 'lỗi')}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {t('kpi.noFailures', 'Không có lỗi')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Target đến giờ */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-2xs transition-all hover:border-indigo-500/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('kpi.targetSoFar', 'Target đến giờ')}
            </span>
            <div className="flex size-7.5 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Target className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground table-nums">
              {formatInt(kpi.targetSoFar)}
            </span>
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatInt(kpi.lineCount)}</span>{' '}
              {t('kpi.linesTrackedSuffix', 'chuyền đang theo dõi')}
            </p>
          </div>
        </div>

        {/* % Đạt toàn nhà máy */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-2xs transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('kpi.overallAchievement', '% Đạt toàn nhà máy')}
            </span>
            <div className="flex size-7.5 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Percent className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-foreground table-nums">
                {formatPercent(kpi.achievement)}
              </span>
              <span className={cn('text-xs font-semibold', achievementTone(kpi.achievement))}>
                {achievementHint(kpi.achievement, t)}
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={kpi.achievement ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  (kpi.achievement ?? 0) >= 100
                    ? 'bg-emerald-500'
                    : (kpi.achievement ?? 0) >= 90
                      ? 'bg-primary'
                      : 'bg-amber-500'
                )}
                style={{ width: `${Math.min(100, Math.max(0, kpi.achievement ?? 0))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Phân bổ trạng thái chuyền */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface p-4 shadow-2xs transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('kpi.linesByStatus', 'Trạng thái chuyền')}
            </span>
            <div className="flex size-7.5 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            {/* Status distribution bar */}
            <StatusRatioBar
              onTrack={kpi.onTrackCount}
              attention={kpi.attentionCount}
              noWo={kpi.noWoCount}
            />
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold table-nums">
                <span className="size-2 rounded-full bg-emerald-500" />
                {kpi.onTrackCount} {t('kpi.onTrackShort', 'Đạt')}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold table-nums">
                <span className="size-2 rounded-full bg-amber-500" />
                {kpi.attentionCount} {t('kpi.attentionShort', 'Cần chú ý')}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold table-nums">
                <span className="size-2 rounded-full bg-muted-foreground/50" />
                {kpi.noWoCount} {t('kpi.noWoShort', 'Chưa có WO')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShiftPicker({ current, shiftId, onChange }) {
  const { data: shifts = [] } = useOverviewShifts();

  if (shifts.length <= 1) return null;

  return (
    <div className="flex shrink-0 items-center rounded-lg border border-border bg-surface-muted/60 p-0.5">
      {shifts.map((s) => {
        const isActive = (shiftId ?? current?.id) === s.id;
        const isDay = s.id === '1' || s.id.includes('1');
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange?.(s.id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
              isActive
                ? 'bg-surface text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isDay ? (
              <Sun className="size-3 text-amber-500" />
            ) : (
              <Moon className="size-3 text-indigo-400" />
            )}
            <span>{s.name || (isDay ? 'Ca ngày' : 'Ca đêm')}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusRatioBar({ onTrack = 0, attention = 0, noWo = 0 }) {
  const total = onTrack + attention + noWo;
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />;
  }

  const segments = [
    { value: onTrack, color: 'bg-emerald-500' },
    { value: attention, color: 'bg-amber-500' },
    { value: noWo, color: 'bg-muted-foreground/40' },
  ];

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((seg, i) => (
        <span
          key={i}
          className={cn('h-full transition-all duration-300', seg.color)}
          style={{ width: `${(seg.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function achievementHint(achievement, t) {
  if (achievement === null || achievement === undefined)
    return t('kpi.noWorkingMinutes', 'Chưa có dữ liệu');
  if (achievement >= 100) return t('kpi.aheadOfPlan', 'Vượt chỉ tiêu');
  if (achievement >= 90) return t('kpi.onTarget', 'Đạt chỉ tiêu');
  return t('kpi.belowThreshold', 'Dưới ngưỡng 90%');
}

function achievementTone(achievement) {
  if (achievement === null || achievement === undefined) return 'text-muted-foreground';
  if (achievement >= 100) return 'text-emerald-600 dark:text-emerald-400';
  if (achievement >= 90) return 'text-primary';
  return 'text-amber-600 dark:text-amber-400';
}
