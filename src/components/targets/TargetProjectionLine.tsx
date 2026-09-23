'use client';

import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import type { Target, TargetProjection } from '@/workout/targets';
import { MIN_TESTS_FOR_PROJECTION } from '@/workout/targets';

interface TargetProjectionLineProps {
  target: Target;
  projection: TargetProjection;
  className?: string;
}

/**
 * The "when will I get there" line. Says nothing rather than inventing a date:
 * under three tests there is no honest trend to extrapolate.
 */
export function TargetProjectionLine({
  target,
  projection,
  className,
}: TargetProjectionLineProps) {
  const base = cn('text-sm', className);

  if (projection.status === 'achieved') {
    return <p className={cn(base, 'ft-pace-ahead font-semibold')}>Goal reached 🎉</p>;
  }

  if (projection.status === 'insufficientData') {
    const n = projection.testsUntilProjectable;
    return (
      <p className={cn(base, 'text-muted-foreground')}>
        {n} more test {n === 1 ? 'session' : 'sessions'} to project your date
        {projection.testsUntilProjectable === MIN_TESTS_FOR_PROJECTION ? '' : ' — keep going'}
      </p>
    );
  }

  if (projection.status === 'stalled') {
    return (
      <p className={cn(base, 'text-muted-foreground')}>
        Flat across your recent tests — no date yet. Time to change the stimulus rather than push
        harder.
      </p>
    );
  }

  const date = projection.projectedDate ? dayjs(projection.projectedDate).format('D MMM YYYY') : null;
  const tone =
    projection.status === 'behind'
      ? 'ft-pace-behind'
      : projection.status === 'ahead'
        ? 'ft-pace-ahead'
        : 'ft-pace-on-track';
  const label =
    projection.status === 'behind'
      ? 'Behind pace'
      : projection.status === 'ahead'
        ? 'Ahead of pace'
        : 'On pace';

  return (
    <div className={base}>
      <p>
        <span className={cn('font-semibold', tone)}>{label}</span>
        {date && <span className="text-muted-foreground"> · projected {date}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {projection.recentRatePerWeek}/week now
        {projection.requiredRatePerWeek !== null &&
          target.targetDate &&
          ` · ${projection.requiredRatePerWeek}/week needed for ${dayjs(target.targetDate).format('D MMM')}`}
      </p>
    </div>
  );
}
