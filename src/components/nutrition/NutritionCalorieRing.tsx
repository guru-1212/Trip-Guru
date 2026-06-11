'use client';

import { cn } from '@/lib/utils';
import { formatKcal, getProgressPercent } from '@/lib/nutrition/nutritionUtils';

interface NutritionCalorieRingProps {
  eaten: number;
  target: number;
  size?: number;
  className?: string;
}

export function NutritionCalorieRing({
  eaten,
  target,
  size = 200,
  className,
}: NutritionCalorieRingProps) {
  const percent = getProgressPercent(eaten, target);
  const left = Math.max(0, target - eaten);
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className="relative inline-flex items-center justify-center ft-diet-ring"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={eaten}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`${formatKcal(eaten)} of ${formatKcal(target)} kcal eaten`}
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
          <span className={cn(
            "font-bold tabular-nums leading-none",
            size <= 140 ? "text-2xl" : "text-3xl sm:text-4xl"
          )}>
            {formatKcal(eaten)}
          </span>
          <span className={cn(
            "text-muted-foreground mt-1",
            size <= 140 ? "text-[10px]" : "text-xs"
          )}>
            kcal eaten
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        Target {formatKcal(target)} kcal · <span className="text-foreground font-medium">{formatKcal(left)} left</span>
      </p>
    </div>
  );
}
