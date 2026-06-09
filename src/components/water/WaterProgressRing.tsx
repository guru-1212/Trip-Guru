'use client';

import { formatMl, getProgressPercent } from '@/lib/water/waterUtils';
import { cn } from '@/lib/utils';

interface WaterProgressRingProps {
  totalMl: number;
  goalMl: number;
  size?: number;
  className?: string;
}

export function WaterProgressRing({
  totalMl,
  goalMl,
  size = 180,
  className,
}: WaterProgressRingProps) {
  const percent = getProgressPercent(totalMl, goalMl);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center ft-water-ring', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={totalMl}
      aria-valuemin={0}
      aria-valuemax={goalMl}
      aria-label={`Water intake: ${formatMl(totalMl)} of ${formatMl(goalMl)}`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="ft-water-track"
          strokeWidth="14"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="ft-water-fill"
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="text-2xl sm:text-3xl font-bold tabular-nums">{formatMl(totalMl)}</span>
        <span className="text-xs text-muted-foreground mt-0.5">
          of {formatMl(goalMl)}
        </span>
        <span className="text-sm font-semibold mt-1">{percent}%</span>
      </div>
    </div>
  );
}
