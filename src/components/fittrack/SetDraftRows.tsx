'use client';

import { Plus, Trash2 } from 'lucide-react';
import { displayWeight, inputToKg, type EditedSet } from '@/workout/utils';
import type { WeightUnit } from '@/workout/types';

/** A set being edited: weight as typed (in the user's unit) and reps as typed. */
export interface SetDraft {
  weight: string;
  reps: string;
  /** Weight text as first shown, and the exact kg it came from. */
  origText: string;
  origKg: number | null;
}

export function toSetDraft(weightKg: number, reps: number, unit: WeightUnit): SetDraft {
  const text = weightKg > 0 ? String(displayWeight(weightKg, unit)) : '';
  return { weight: text, reps: reps > 0 ? String(reps) : '', origText: text, origKg: weightKg };
}

/** A new row that starts from the numbers of `like` (or blank). */
export function newSetDraft(like?: SetDraft): SetDraft {
  return { weight: like?.weight ?? '', reps: like?.reps ?? '', origText: '', origKg: null };
}

/** Typed values → kg + reps. Blank or invalid entries become 0. */
export function parseSetDraft(set: SetDraft, unit: WeightUnit): EditedSet {
  const text = set.weight.trim();
  // Untouched weights keep their exact stored kg value; converting lbs back
  // could otherwise nudge them by a rounding step.
  let weight = 0;
  if (text === set.origText && set.origKg !== null) {
    weight = set.origKg;
  } else {
    const n = Number.parseFloat(text);
    if (Number.isFinite(n) && n > 0) weight = inputToKg(n, unit);
  }
  const reps = Number.parseInt(set.reps, 10);
  return { weight, reps: Number.isFinite(reps) && reps > 0 ? reps : 0 };
}

interface SetDraftRowsProps {
  /** Exercise name, used for accessible labels. */
  label: string;
  unit: WeightUnit;
  sets: SetDraft[];
  onChange: (index: number, field: 'weight' | 'reps', value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

/** Weight × reps input rows for one exercise, with remove and "Add set". */
export function SetDraftRows({ label, unit, sets, onChange, onRemove, onAdd }: Readonly<SetDraftRowsProps>) {
  return (
    <>
      {sets.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs text-muted-foreground">Set {i + 1}</span>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              aria-label={`${label} set ${i + 1} weight`}
              className="ft-input !py-1.5 pr-10 text-sm tabular-nums"
              value={s.weight}
              placeholder="0"
              onChange={(e) => onChange(i, 'weight', e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {unit}
            </span>
          </div>
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              aria-label={`${label} set ${i + 1} reps`}
              className="ft-input !py-1.5 pr-12 text-sm tabular-nums"
              value={s.reps}
              placeholder="0"
              onChange={(e) => onChange(i, 'reps', e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              reps
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="ft-btn ft-btn--ghost ft-btn--icon shrink-0"
            aria-label={`Remove set ${i + 1} of ${label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className="ft-btn ft-btn--ghost ft-btn--sm inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add set
      </button>
    </>
  );
}
