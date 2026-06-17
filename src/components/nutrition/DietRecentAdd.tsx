'use client';

import { cn } from '@/lib/utils';
import type { FoodItem } from '@/types/nutrition';

interface DietRecentAddProps {
  recentFoods: FoodItem[];
  onAdd: (food: FoodItem) => void;
  disabled?: boolean;
  className?: string;
}

export function DietRecentAdd({ recentFoods, onAdd, disabled, className }: DietRecentAddProps) {
  if (recentFoods.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium">Recently added</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {recentFoods.map((food) => (
          <button
            key={food.id}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(food)}
            className="snap-start shrink-0 flex flex-col items-center justify-center min-w-[84px] rounded-xl border border-border bg-muted/20 px-2 py-2.5 active:scale-95 transition-transform disabled:opacity-50"
          >
            <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
              {food.name.split(' ')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1 tabular-nums">
              {food.nutrients.calories} kcal
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
