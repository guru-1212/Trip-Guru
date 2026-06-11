'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_ADD_FOOD_IDS, getFoodById } from '@/lib/nutrition/indianFoodDatabase';
import type { FoodItem } from '@/types/nutrition';

interface DietQuickAddProps {
  onAdd: (food: FoodItem) => void;
  onAddCustom?: () => void;
  disabled?: boolean;
  className?: string;
}

const QUICK_FOODS = QUICK_ADD_FOOD_IDS.map((id) => getFoodById(id)).filter(Boolean) as FoodItem[];

export function DietQuickAdd({ onAdd, onAddCustom, disabled, className }: DietQuickAddProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium">Quick add — tap to set quantity</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {onAddCustom && (
          <button
            type="button"
            disabled={disabled}
            onClick={onAddCustom}
            className="snap-start shrink-0 flex flex-col items-center justify-center min-w-[72px] rounded-xl border border-primary/40 bg-primary/5 px-2 py-2.5 active:scale-95 transition-transform disabled:opacity-50 text-primary"
          >
            <Plus className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-semibold text-center leading-tight">
              New Custom
            </span>
          </button>
        )}
        {QUICK_FOODS.map((food) => (
          <button
            key={food.id}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(food)}
            className="snap-start shrink-0 flex flex-col items-center justify-center min-w-[72px] rounded-xl border border-border bg-muted/30 px-2 py-2.5 active:scale-95 transition-transform disabled:opacity-50"
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
