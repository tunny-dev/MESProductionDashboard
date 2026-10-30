import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TriangleAlert, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/core/utils/utils';
import { formatInt, formatPercent, formatClockSeconds, EMPTY_DASH } from '@/core/utils/format';
import { useShifts } from '@/hooks/useProduction';

function KpiTile({ label, value, hint, tone = 'neutral', to }) {
  const toneClass = {
    positive: 'text-success',
    warning: 'text-warning',
    error: 'text-error-strong',
    neutral: 'text-muted-foreground',
  }[tone];

  const content = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold table-nums text-foreground sm:text-2xl">{value}</p>
      {hint ? <p className={cn('mt-1.5 text-xs', toneClass)}>{hint}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="min-w-0 p-5 transition-colors outline-hidden hover:bg-surface-hover sm:p-6"
      >
        {content}
      </Link>
    );
  }

  return <div className="min-w-0 p-5 sm:p-6">{content}</div>;
}

export function KpiRow({ kpi, shift, shiftId = null, onShiftChange, updatedAt }) {
  const { t } = useTranslation();

  return (
    <section aria-label={t('kpi.label')} className="rounded-lg border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="mr-auto min-w-0">
          <h2 className="text-base font-semibold text-foreground">{shift.name}</h2>
          <p className="text-xs text-muted-foreground">{t('shift.cumulativeTargetNote')}</p>
        </div>

        <ShiftPicker current={shift} shiftId={shiftId} onChange={onShiftChange} />

        {updatedAt ? (
          <p className="shrink-0 text-xs text-muted-foreground table-nums">
            {t('freshness.updatedAt')}{' '}
            <time dateTime={new Date(updatedAt).toISOString()}>
              {formatClockSeconds(new Date(updatedAt))}
            </time>
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        <KpiTile
          label={t('kpi.totalOutput')}
          value={formatInt(kpi.passCount)}
          hint={t('kpi.failuresSuffix', { count: formatInt(kpi.failCount) })}
        />
        <KpiTile
          label={t('kpi.targetSoFar')}
          value={formatInt(kpi.targetSoFar)}
          hint={t('kpi.linesTracked', { count: formatInt(kpi.lineCount) })}
        />
        <div className="min-w-0 p-5 sm:p-6">
          <p className="text-xs font-medium text-muted-foreground">{t('kpi.overallAchievement')}</p>
          <p className="mt-1.5 text-xl font-semibold table-nums text-foreground sm:text-2xl">
            {formatPercent(kpi.achievement)}
          </p>
          <div
            className="mt-2 h-1.5 rounded-full bg-foreground/5"
            role="progressbar"
            aria-valuenow={kpi.achievement ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('kpi.overallAchievement')}
          >
            <div
              className="h-full rounded-full bg-chart-fill"
              style={{ width: `${Math.min(100, Math.max(0, kpi.achievement ?? 0))}%` }}
            />
          </div>
          <p className={cn('mt-1.5 text-xs', achievementTone(kpi.achievement))}>
            {achievementHint(kpi.achievement, t)}
          </p>
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <p className="text-xs font-medium text-muted-foreground">{t('kpi.linesByStatus')}</p>
          <StatusRatioBar
            onTrack={kpi.onTrackCount}
            attention={kpi.attentionCount}
            noWo={kpi.noWoCount}
          />
          <ul className="mt-1 grid grid-cols-3 items-baseline gap-x-2 text-sm">
            <li className="min-w-0">
              <span className="text-lg font-semibold table-nums text-success-text">
                {formatInt(kpi.onTrackCount)}
              </span>{' '}
              <span className="truncate text-xs text-muted-foreground">
                {t('kpi.onTrackShort')}
              </span>
            </li>
            <li className="min-w-0">
              <span className="text-lg font-semibold table-nums text-error-text">
                {formatInt(kpi.attentionCount)}
              </span>{' '}
              <span className="truncate text-xs text-muted-foreground">
                {t('kpi.attentionShort')}
              </span>
            </li>
            <li className="min-w-0">
              <span className="text-lg font-semibold table-nums text-foreground">
                {formatInt(kpi.noWoCount)}
              </span>{' '}
              <span className="truncate text-xs text-muted-foreground">{t('kpi.noWoShort')}</span>
            </li>
          </ul>
          {kpi.attentionCount > 0 && (
            <p className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-medium whitespace-nowrap text-error-text">
              <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
              {t('kpi.attentionLines', { count: formatInt(kpi.attentionCount) })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ShiftPicker({ current, shiftId, onChange }) {
  const { data: shifts = [] } = useShifts();
  const { t } = useTranslation();

  if (shifts.length <= 1) return null;

  return (
    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
      <span className="hidden sm:inline">{t('shift.label')}</span>
      {shifts.map((shift) => {
        const isActive = (shiftId ?? current.id) === shift.id;
        return (
          <button
            key={shift.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange?.(shift.id === current.id ? null : shift.id)}
            className={
              isActive
                ? 'relative cursor-pointer rounded-sm bg-secondary px-2 py-0.5 font-medium text-foreground before:absolute before:-inset-x-1 before:-inset-y-2'
                : 'relative cursor-pointer rounded-sm px-2 py-0.5 transition-colors outline-hidden before:absolute before:-inset-x-1 before:-inset-y-2 hover:bg-foreground/5 hover:text-foreground'
            }
          >
            {shift.name}
          </button>
        );
      })}
    </div>
  );
}

function StatusRatioBar({ onTrack, attention, noWo }) {
  const total = onTrack + attention + noWo;
  if (total === 0) return <div className="mt-1.5 h-1.5 rounded-full bg-foreground/5" />;

  const segments = [
    { value: onTrack, color: 'var(--success)' },
    { value: attention, color: 'var(--error)' },
    { value: noWo, color: 'var(--neutral)' },
  ].filter((segment) => segment.value > 0);

  return (
    <div aria-hidden className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-foreground/5">
      {segments.map((segment, index) => (
        <span
          key={index}
          className="h-full"
          style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
        />
      ))}
    </div>
  );
}

function achievementHint(achievement, t) {
  if (achievement === null) return t('kpi.noWorkingMinutes');
  if (achievement >= 100) return t('kpi.aheadOfPlan');
  return t('kpi.belowThreshold');
}

function achievementTone(achievement) {
  if (achievement === null) return 'text-muted-foreground';
  if (achievement >= 100) return 'text-success-text';
  return 'text-warning-text';
}

export function TrendHint({ value, invert = false }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">{EMPTY_DASH}</span>;
  }
  const isUp = value >= 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isGood ? 'text-success' : 'text-error-strong'
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {formatInt(Math.abs(value))}
    </span>
  );
}
