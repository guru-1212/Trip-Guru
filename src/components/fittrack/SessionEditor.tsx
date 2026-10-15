'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { applyWorkoutEdit, displayWeight, inputToKg, type EditedSet } from '@/workout/utils';
import type { WeightUnit, WorkoutSession } from '@/workout/types';

interface SessionEditorProps {
  session: WorkoutSession;
  unit: WeightUnit;
  onSave: (updated: WorkoutSession) => void;
  onCancel: () => void;
}

interface SetDraft {
  weight: string;
  reps: string;
  /** Weight text as first shown, and the exact kg it came from. */
  origText: string;
  origKg: number | null;
}

interface ExerciseDraft {
  /** Index into session.exercises. */
  index: number;
  name: string;
  variation: string;
  sets: SetDraft[];
}

function buildDrafts(session: WorkoutSession, unit: WeightUnit): ExerciseDraft[] {
  const drafts: ExerciseDraft[] = [];
  session.exercises.forEach((ex, index) => {
    const done = ex.sets.filter((s) => s.done && (s.weight > 0 || s.reps > 0));
    if (done.length === 0) return;
    drafts.push({
      index,
      name: ex.name,
      variation: ex.variation,
      sets: done.map((s) => {
        const text = s.weight > 0 ? String(displayWeight(s.weight, unit)) : '';
        return { weight: text, reps: s.reps > 0 ? String(s.reps) : '', origText: text, origKg: s.weight };
      }),
    });
  });
  return drafts;
}

function parseSet(set: SetDraft, unit: WeightUnit): EditedSet {
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

/** Inline editor for the sets of one saved session (weight and reps per set). */
export function SessionEditor({ session, unit, onSave, onCancel }: Readonly<SessionEditorProps>) {
  const [drafts, setDrafts] = useState(() => buildDrafts(session, unit));

  const patchSets = (exIndex: number, patch: (sets: SetDraft[]) => SetDraft[]) =>
    setDrafts((prev) => prev.map((d) => (d.index === exIndex ? { ...d, sets: patch(d.sets) } : d)));

  const updateSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) =>
    patchSets(exIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)));

  const removeSet = (exIndex: number, setIndex: number) =>
    patchSets(exIndex, (sets) => sets.filter((_, i) => i !== setIndex));

  const addSet = (exIndex: number) =>
    patchSets(exIndex, (sets) => {
      const last = sets[sets.length - 1];
      return [...sets, { weight: last?.weight ?? '', reps: last?.reps ?? '', origText: '', origKg: null }];
    });

  const edits = new Map<number, EditedSet[]>(
    drafts.map((d) => [d.index, d.sets.map((s) => parseSet(s, unit))])
  );
  const hasAnySet = Array.from(edits.values()).some((sets) => sets.some((s) => s.weight > 0 || s.reps > 0));

  return (
    <div className="space-y-4">
      {drafts.map((d) => (
        <div key={d.index} className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {d.name}
            {d.variation && d.variation !== 'Standard' && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{d.variation}</span>
            )}
          </p>
          {d.sets.map((s, i) => (
            <div key={`${d.index}-${i}`} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs text-muted-foreground">Set {i + 1}</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  aria-label={`${d.name} set ${i + 1} weight`}
                  className="ft-input !py-1.5 pr-10 text-sm tabular-nums"
                  value={s.weight}
                  placeholder="0"
                  onChange={(e) => updateSet(d.index, i, 'weight', e.target.value)}
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
                  aria-label={`${d.name} set ${i + 1} reps`}
                  className="ft-input !py-1.5 pr-12 text-sm tabular-nums"
                  value={s.reps}
                  placeholder="0"
                  onChange={(e) => updateSet(d.index, i, 'reps', e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  reps
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeSet(d.index, i)}
                className="ft-btn ft-btn--ghost ft-btn--icon shrink-0"
                aria-label={`Remove set ${i + 1} of ${d.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addSet(d.index)}
            className="ft-btn ft-btn--ghost ft-btn--sm inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add set
          </button>
        </div>
      ))}

      {!hasAnySet && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Keep at least one set, or cancel to leave this workout as it is.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="ft-btn ft-btn--secondary flex-1">
          Cancel
        </button>
        <button
          type="button"
          disabled={!hasAnySet}
          onClick={() => onSave(applyWorkoutEdit(session, edits))}
          className="ft-btn ft-btn--primary flex-1"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
