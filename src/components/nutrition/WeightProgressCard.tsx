'use client';

import { cn } from '@/lib/utils';
import { getProgressPercent } from '@/lib/nutrition/nutritionUtils';

interface WeightProgressCardProps {
  currentKg: number;
  targetKg: number;
  monthlyDelta?: number;
  projectionLabel?: string;
  className?: string;
}

export function WeightProgressCard({
  currentKg,
  targetKg,
  monthlyDelta,
  projectionLabel,
  className,
}: WeightProgressCardProps) {
  const kgToGo = Math.max(0, Math.round((targetKg - currentKg) * 10) / 10);
  const startKg = Math.min(currentKg, targetKg - 5);
  const pct = getProgressPercent(currentKg - startKg, targetKg - startKg);

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Weight progress
      </p>
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-bold tabular-nums">{currentKg} kg</p>
            {monthlyDelta != null && monthlyDelta !== 0 && (
              <p className={cn('text-xs font-medium mt-0.5', monthlyDelta > 0 ? 'text-green-500' : 'text-amber-500')}>
                {monthlyDelta > 0 ? '+' : ''}{monthlyDelta} kg this month
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Goal</p>
            <p className="text-lg font-semibold tabular-nums">{targetKg} kg</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
          <div
            className="h-full rounded-full ft-diet-bar-protein transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {kgToGo} kg to go
          {projectionLabel ? ` · ${projectionLabel}` : ''}
        </p>
      </div>
    </div>
  );
}
