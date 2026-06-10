'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { nutrientsForServings } from '@/lib/nutrition/nutritionUtils';
import type { NutritionLogEntry, NutrientsPerServing } from '@/types/nutrition';

const SERVING_PRESETS = [0.5, 1, 1.5, 2, 3];

interface EditFoodEntrySheetProps {
  entry: NutritionLogEntry | null;
  open: boolean;
  onClose: () => void;
  onSave: (entryId: string, servings: number, nutrients: NutrientsPerServing) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
  disabled?: boolean;
}

export function EditFoodEntrySheet({
  entry,
  open,
  onClose,
  onSave,
  onDelete,
  disabled,
}: EditFoodEntrySheetProps) {
  const [servings, setServings] = useState(1);
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && entry) {
      setServings(entry.servings);
      if (entry.isCustom) {
        setCustomCalories(String(entry.nutrients.calories));
        setCustomProtein(String(entry.nutrients.proteinG));
      }
    }
  }, [open, entry]);

  const preview = useMemo(() => {
    if (!entry) return null;
    if (entry.isCustom && customCalories) {
      return {
        ...entry.nutrients,
        calories: Number(customCalories) || 0,
        proteinG: Number(customProtein) || 0,
      };
    }
    return nutrientsForServings(entry, servings);
  }, [entry, servings, customCalories, customProtein]);

  if (!open || !entry) return null;

  const stepServings = (delta: number) => {
    setServings((s) => Math.max(0.5, Math.round((s + delta) * 2) / 2));
  };

  const handleSave = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      await onSave(entry.id, entry.isCustom ? 1 : servings, preview);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onDelete(entry.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold">Edit quantity</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="font-medium">{entry.name}</p>
            {preview && (
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                {preview.calories} kcal · {preview.proteinG}g protein
              </p>
            )}
          </div>

          {entry.isCustom ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Calories</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="ft-input w-full mt-1 min-h-[48px] text-base"
                  value={customCalories}
                  onChange={(e) => setCustomCalories(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Protein (g)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="ft-input w-full mt-1 min-h-[48px] text-base"
                  value={customProtein}
                  onChange={(e) => setCustomProtein(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                How many servings?
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => stepServings(-0.5)}
                  className="h-12 w-12 rounded-full border border-border flex items-center justify-center active:bg-muted"
                  aria-label="Decrease"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="text-3xl font-bold tabular-nums min-w-[64px] text-center">
                  {servings}×
                </span>
                <button
                  type="button"
                  onClick={() => stepServings(0.5)}
                  className="h-12 w-12 rounded-full border border-border flex items-center justify-center active:bg-muted"
                  aria-label="Increase"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SERVING_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServings(s)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium min-h-[40px] border',
                      servings === s ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-4 pb-6 border-t border-border flex gap-2">
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={() => void handleDelete()}
            className="ft-btn ft-btn--secondary min-h-[48px] px-4 text-destructive border-destructive/30"
            aria-label="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={disabled || submitting}
            onClick={() => void handleSave()}
            className="ft-btn ft-btn--primary flex-1 min-h-[48px] text-base"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
