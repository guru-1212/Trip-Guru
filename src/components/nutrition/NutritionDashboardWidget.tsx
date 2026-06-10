'use client';

import Link from 'next/link';
import { ArrowUpRight, Utensils } from 'lucide-react';
import { NutritionCalorieRing } from '@/components/nutrition/NutritionCalorieRing';
import { MacroProgressBars } from '@/components/nutrition/MacroProgressBars';
import { useDietTracker } from '@/hooks/useDietTracker';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface NutritionDashboardWidgetProps {
  className?: string;
}

export function NutritionDashboardWidget({ className }: NutritionDashboardWidgetProps) {
  const {
    totals,
    targets,
    caloriesLeft,
    loading,
  } = useDietTracker();

  return (
    <section className={cn('ft-card ft-card-padded', className)} aria-label="Nutrition summary">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="ft-title text-base">Nutrition</h2>
        </div>
        <Link
          href="/fittrack/diet"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Details
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
          <LoadingSpinner />
          <span>Loading nutrition…</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <NutritionCalorieRing
            eaten={totals.calories}
            target={targets.calories || 2500}
            size={120}
            className="shrink-0"
          />
          <div className="flex-1 w-full min-w-0">
            <p className="text-sm font-medium mb-2">
              {caloriesLeft > 0 ? `${caloriesLeft} kcal left today` : 'Daily goal reached'}
            </p>
            <MacroProgressBars totals={totals} targets={targets} />
          </div>
        </div>
      )}
    </section>
  );
}
