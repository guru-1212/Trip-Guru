'use client';

import { cn } from '@/lib/utils';
import type { VitaminCoverage } from '@/types/nutrition';

const VITAMINS: { key: keyof VitaminCoverage; label: string; color: string; unit: string }[] = [
  { key: 'vitaminA', label: 'Vitamin A', color: 'bg-orange-500', unit: 'mcg' },
  { key: 'vitaminC', label: 'Vitamin C', color: 'bg-yellow-500', unit: 'mg' },
  { key: 'vitaminD', label: 'Vitamin D', color: 'bg-blue-400', unit: 'mcg' },
  { key: 'vitaminB12', label: 'Vitamin B12', color: 'bg-indigo-500', unit: 'mcg' },
];

interface VitaminGridProps {
  coverage: VitaminCoverage;
  className?: string;
}

export function VitaminGrid({ coverage, className }: VitaminGridProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Vitamins today
      </p>
      <div className="grid grid-cols-2 gap-2">
        {VITAMINS.map(({ key, label, color }) => (
          <div
            key={key}
            className="rounded-xl border border-border/60 bg-muted/20 p-3 flex flex-col gap-2 shadow-sm"
          >
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{coverage[key]}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500 ease-out', color)}
                style={{ width: `${Math.min(100, coverage[key])}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
