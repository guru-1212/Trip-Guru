'use client';

import { cn } from '@/lib/utils';
import type { FoodSuggestion } from '@/lib/nutrition/nutritionSuggestions';

interface SuggestionChipsProps {
  suggestions: FoodSuggestion[];
  onSelect: (suggestion: FoodSuggestion) => void;
  disabled?: boolean;
  className?: string;
}

export function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
  className,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium">Suggested to hit your targets today</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {suggestions.map((s) => (
          <button
            key={`${s.food.id}-${s.servings}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            className="shrink-0 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium hover:bg-muted/60 hover:border-primary/40 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {s.label}{' '}
            <span className="text-muted-foreground">({s.benefit})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
