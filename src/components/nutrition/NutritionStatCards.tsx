'use client';

import { cn } from '@/lib/utils';
import { formatKcal } from '@/lib/nutrition/nutritionUtils';

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  className?: string;
}

function StatCard({ label, value, subtitle, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-muted/20 p-4 space-y-1', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

interface NutritionStatCardsProps {
  caloriesLeft: number;
  calorieTarget: number;
  proteinLeft: number;
  proteinTarget: number;
  streak: number;
  surplusAvg: number;
  className?: string;
}

export function NutritionStatCards({
  caloriesLeft,
  calorieTarget,
  proteinLeft,
  proteinTarget,
  streak,
  surplusAvg,
  className,
}: NutritionStatCardsProps) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      <StatCard
        label="Calories left"
        value={formatKcal(caloriesLeft)}
        subtitle={`of ${formatKcal(calorieTarget)} target`}
      />
      <StatCard
        label="Protein left"
        value={`${proteinLeft}g`}
        subtitle={`of ${proteinTarget}g target`}
      />
      <StatCard
        label="Streak"
        value={`${streak} days`}
        subtitle="logging consistently"
      />
      <StatCard
        label="Surplus avg"
        value={`${surplusAvg >= 0 ? '+' : ''}${surplusAvg} kcal/day`}
        subtitle="this week"
      />
    </div>
  );
}
