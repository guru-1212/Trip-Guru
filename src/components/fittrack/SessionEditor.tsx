'use client';

import { useState } from 'react';
import { applyWorkoutEdit, type EditedSet } from '@/workout/utils';
import type { WeightUnit, WorkoutSession } from '@/workout/types';
import { newSetDraft, parseSetDraft, SetDraftRows, toSetDraft, type SetDraft } from './SetDraftRows';

interface SessionEditorProps {
  session: WorkoutSession;
  unit: WeightUnit;
  onSave: (updated: WorkoutSession) => void;
  onCancel: () => void;
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
      sets: done.map((s) => toSetDraft(s.weight, s.reps, unit)),
    });
  });
  return drafts;
}

/** Inline editor for the sets of one saved session (weight and reps per set). */
export function SessionEditor({ session, unit, onSave, onCancel }: Readonly<SessionEditorProps>) {
  const [drafts, setDrafts] = useState(() => buildDrafts(session, unit));

  const patchSets = (exIndex: number, patch: (sets: SetDraft[]) => SetDraft[]) =>
    setDrafts((prev) => prev.map((d) => (d.index === exIndex ? { ...d, sets: patch(d.sets) } : d)));

  const edits = new Map<number, EditedSet[]>(
    drafts.map((d) => [d.index, d.sets.map((s) => parseSetDraft(s, unit))])
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
          <SetDraftRows
            label={d.name}
            unit={unit}
            sets={d.sets}
            onChange={(i, field, value) =>
              patchSets(d.index, (sets) => sets.map((s, k) => (k === i ? { ...s, [field]: value } : s)))
            }
            onRemove={(i) => patchSets(d.index, (sets) => sets.filter((_, k) => k !== i))}
            onAdd={() => patchSets(d.index, (sets) => [...sets, newSetDraft(sets[sets.length - 1])])}
          />
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
