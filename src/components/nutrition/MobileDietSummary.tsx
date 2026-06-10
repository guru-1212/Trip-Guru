'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MacroProgressBars } from '@/components/nutrition/MacroProgressBars';
import type { MicronutrientCoverage, NutrientsPerServing } from '@/types/nutrition';
import { formatKcal } from '@/lib/nutrition/nutritionUtils';

interface MobileDietSummaryProps {
  totals: NutrientsPerServing;
  targets: NutrientsPerServing;
  caloriesLeft: number;
  proteinLeft: number;
  coverage: MicronutrientCoverage;
  className?: string;
}

export function MobileDietSummary({
  totals,
  targets,
  caloriesLeft,
  proteinLeft,
  coverage,
  className,
}: MobileDietSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('ft-card overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full ft-card-padded flex items-center gap-3 text-left"
      >
        <div className="shrink-0 w-[88px] h-[88px] rounded-full border-4 border-primary/30 flex flex-col items-center justify-center bg-primary/5">
          <span className="text-lg font-bold tabular-nums leading-none">{totals.calories}</span>
          <span className="text-[9px] text-muted-foreground">kcal</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {formatKcal(caloriesLeft)} kcal left
          </p>
          <p className="text-xs text-muted-foreground">
            {proteinLeft}g protein left · {coverage.protein}% protein goal
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4">
          <MacroProgressBars totals={totals} targets={targets} />
        </div>
      )}
    </div>
  );
}
