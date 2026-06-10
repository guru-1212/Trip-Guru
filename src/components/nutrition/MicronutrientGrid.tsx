'use client';

import { cn } from '@/lib/utils';
import type { MicronutrientCoverage } from '@/types/nutrition';

const NUTRIENTS: { key: keyof Omit<MicronutrientCoverage, 'protein'>; label: string; color: string }[] = [
  { key: 'calcium', label: 'Calcium', color: 'ft-diet-micro-calcium' },
  { key: 'iron', label: 'Iron', color: 'ft-diet-micro-iron' },
  { key: 'magnesium', label: 'Magnesium', color: 'ft-diet-micro-mag' },
  { key: 'potassium', label: 'Potassium', color: 'ft-diet-micro-k' },
];

interface MicronutrientGridProps {
  coverage: MicronutrientCoverage;
  className?: string;
}

export function MicronutrientGrid({ coverage, className }: MicronutrientGridProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Nutrients today
      </p>
      <div className="grid grid-cols-2 gap-2">
        {NUTRIENTS.map(({ key, label, color }) => (
          <div
            key={key}
            className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-2"
          >
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold tabular-nums">{coverage[key]}%</span>
            <div className="h-1 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn('h-full rounded-full', color)}
                style={{ width: `${coverage[key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
