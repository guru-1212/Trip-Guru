'use client';

import { cn } from '@/lib/utils';
import { getProgressPercent } from '@/lib/nutrition/nutritionUtils';
import type { NutrientsPerServing } from '@/types/nutrition';

interface MacroBar {
  key: keyof Pick<NutrientsPerServing, 'proteinG' | 'carbsG' | 'fatG' | 'fiberG'>;
  label: string;
  colorClass: string;
}

const MACROS: MacroBar[] = [
  { key: 'proteinG', label: 'Protein', colorClass: 'ft-diet-bar-protein' },
  { key: 'carbsG', label: 'Carbs', colorClass: 'ft-diet-bar-carbs' },
  { key: 'fatG', label: 'Fat', colorClass: 'ft-diet-bar-fat' },
  { key: 'fiberG', label: 'Fibre', colorClass: 'ft-diet-bar-fibre' },
];

interface MacroProgressBarsProps {
  totals: NutrientsPerServing;
  targets: NutrientsPerServing;
  className?: string;
}

export function MacroProgressBars({ totals, targets, className }: MacroProgressBarsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Macros</p>
      {MACROS.map(({ key, label, colorClass }) => {
        const current = totals[key];
        const target = targets[key];
        const pct = getProgressPercent(current, target);
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(current * 10) / 10}g / {target}g
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', colorClass)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
