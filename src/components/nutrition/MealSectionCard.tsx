'use client';

import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMacroShort } from '@/lib/nutrition/nutritionUtils';
import type { MealSlot, NutritionLogEntry } from '@/types/nutrition';
import { MEAL_SLOT_LABELS } from '@/types/nutrition';

interface MealSectionCardProps {
  mealSlot: MealSlot;
  entries: NutritionLogEntry[];
  onAddFood: (slot: MealSlot) => void;
  onEditEntry: (entry: NutritionLogEntry) => void;
  onRemove: (entryId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function MealSectionCard({
  mealSlot,
  entries,
  onAddFood,
  onEditEntry,
  onRemove,
  disabled,
  className,
}: MealSectionCardProps) {
  const totalKcal = entries.reduce((s, e) => s + e.nutrients.calories, 0);
  const totalProtein = entries.reduce((s, e) => s + e.nutrients.proteinG, 0);
  const label = MEAL_SLOT_LABELS[mealSlot];
  const isEmpty = entries.length === 0;

  if (isEmpty) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAddFood(mealSlot)}
        className={cn(
          'w-full rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-4 flex items-center justify-between gap-3 min-h-[56px] active:bg-muted/30 disabled:opacity-50',
          className
        )}
      >
        <div className="text-left">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">Tap to add food</p>
        </div>
        <Plus className="h-5 w-5 text-primary shrink-0" />
      </button>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => onAddFood(mealSlot)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border/40 min-h-[52px] active:bg-muted/30"
      >
        <div className="text-left">
          <h3 className="font-semibold text-sm">{label}</h3>
          <p className="text-xs text-muted-foreground tabular-nums">
            {totalKcal} kcal · {Math.round(totalProtein)}g protein
          </p>
        </div>
        <div className="flex items-center gap-1 text-primary text-sm font-medium shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add</span>
          <ChevronRight className="h-4 w-4 sm:hidden" />
        </div>
      </button>

      <ul className="divide-y divide-border/40">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-2 px-4 py-3 min-h-[56px]"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onEditEntry(entry)}
              className="min-w-0 flex-1 text-left active:opacity-70 disabled:opacity-50"
            >
              <p className="text-sm font-medium truncate">
                {entry.name}
                {entry.servings !== 1 && (
                  <span className="text-primary font-semibold"> · {entry.servings}×</span>
                )}
                {entry.isCustom && (
                  <span className="text-muted-foreground font-normal text-xs"> (manual)</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {entry.nutrients.calories} kcal · {formatMacroShort(
                  entry.nutrients.proteinG,
                  entry.nutrients.carbsG,
                  entry.nutrients.fatG
                )}
              </p>
              <p className="text-[10px] text-primary mt-0.5">Tap to edit quantity</p>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(entry.id)}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-30 shrink-0"
              aria-label={`Remove ${entry.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
