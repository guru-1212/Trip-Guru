'use client';

import { cn } from '@/lib/utils';
import { formatTargetValue } from '@/workout/targets';
import type { TargetUnit } from '@/workout/targets';

interface TargetRingProps {
  current: number;
  goal: number;
  unit: TargetUnit;
  size?: number;
  className?: string;
}

/**
 * Progress ring for a target. Forked from NutritionCalorieRing for its
 * accessibility attributes and CSS-token strokes (which theme correctly in both
 * light and dark) rather than the hardcoded hex used by ConsistencyGauge.
 */
export function TargetRing({ current, goal, unit, size = 180, className }: TargetRingProps) {
  const percent = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const remaining = Math.max(0, goal - current);
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={`${formatTargetValue(current, unit)} of ${formatTargetValue(goal, unit)}`}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="ft-diet-ring-track"
            strokeWidth="16"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="ft-diet-ring-fill"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span
            className={cn(
              'font-bold tabular-nums leading-none',
              size <= 140 ? 'text-2xl' : 'text-3xl sm:text-4xl'
            )}
          >
            {formatTargetValue(current, unit)}
          </span>
          <span
            className={cn('text-muted-foreground mt-1', size <= 140 ? 'text-[10px]' : 'text-xs')}
          >
            of {formatTargetValue(goal, unit)}
          </span>
        </div>
      </div>
      {remaining > 0 && (
        <p className="text-sm text-muted-foreground mt-3 text-center">
          <span className="text-foreground font-medium">{formatTargetValue(remaining, unit)}</span>{' '}
          to go
        </p>
      )}
    </div>
  );
}
