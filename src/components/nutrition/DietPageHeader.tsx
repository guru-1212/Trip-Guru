'use client';

import { ChevronLeft, ChevronRight, Plus, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateLabel } from '@/lib/nutrition/nutritionUtils';

interface DietPageHeaderProps {
  dateKey: string;
  timezone: string;
  isToday: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onLogMeal: () => void;
  className?: string;
}

export function DietPageHeader({
  dateKey,
  timezone,
  isToday,
  onPrevDay,
  onNextDay,
  onLogMeal,
  className,
}: DietPageHeaderProps) {
  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-2">
        <Utensils className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
        <div>
          <h1 className="ft-title-lg">Diet Tracker</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              type="button"
              onClick={onPrevDay}
              className="p-1 rounded-lg hover:bg-muted"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground min-w-[140px] text-center">
              {formatDateLabel(dateKey, timezone)}
            </span>
            <button
              type="button"
              onClick={onNextDay}
              disabled={isToday}
              className="p-1 rounded-lg hover:bg-muted disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogMeal}
        className="ft-btn ft-btn--primary flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
      >
        <Plus className="h-4 w-4" />
        Log meal
      </button>
    </header>
  );
}
