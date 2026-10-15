'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, RotateCcw, X } from 'lucide-react';
import { newSetDraft, parseSetDraft, SetDraftRows, toSetDraft, type SetDraft } from '@/components/fittrack/SetDraftRows';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { getLastLoggedSets, repeatSessionPresetKey } from '@/workout/utils';
import type {
  PlannedExercise,
  TodayExercisePick,
  WeightUnit,
  WorkoutSession,
} from '@/workout/types';

interface WorkoutPlanSheetProps {
  open: boolean;
  splitName: string;
  /** The exercises (and variations) picked for this workout, in order. */
  picks: TodayExercisePick[];
  getExerciseName: (exerciseId: string) => string;
  /** The saved plan for this split, if any. */
  plan: PlannedExercise[] | undefined;
  workouts: WorkoutSession[];
  defaultSets: number;
  unit: WeightUnit;
  onSave: (plan: PlannedExercise[]) => void;
  onClose: () => void;
}

interface Row {
  pick: TodayExercisePick;
  sets: SetDraft[];
}

type SheetProps = Omit<WorkoutPlanSheetProps, 'open'>;

function lastSessionDrafts(
  workouts: WorkoutSession[],
  pick: TodayExercisePick,
  unit: WeightUnit
): SetDraft[] | null {
  const last = getLastLoggedSets(workouts, pick.exerciseId, pick.variation);
  return last ? last.map((s) => toSetDraft(s.weight, s.reps, unit)) : null;
}

/** Saved plan first, then what you did last time, then blank default rows. */
function seedRows({ picks, plan, workouts, defaultSets, unit }: SheetProps): Row[] {
  const planned = new Map(
    (plan ?? []).map((entry) => [repeatSessionPresetKey(entry.exerciseId, entry.variation), entry.sets] as const)
  );
  return picks.map((pick) => {
    const saved = planned.get(repeatSessionPresetKey(pick.exerciseId, pick.variation));
    if (saved?.length) return { pick, sets: saved.map((s) => toSetDraft(s.weight, s.reps, unit)) };
    return {
      pick,
      sets:
        lastSessionDrafts(workouts, pick, unit) ??
        Array.from({ length: Math.max(defaultSets, 1) }, () => newSetDraft()),
    };
  });
}

function PlanSheetBody(props: Readonly<SheetProps>) {
  const { splitName, picks, getExerciseName, plan, workouts, unit, onSave, onClose } = props;
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(() => seedRows(props));
  useDialogFocus(true, modalRef, onClose);

  const patchRow = (pickId: string, patch: (sets: SetDraft[]) => SetDraft[]) =>
    setRows((prev) => prev.map((r) => (r.pick.id === pickId ? { ...r, sets: patch(r.sets) } : r)));

  const resetToLastSession = (pickId: string) => {
    const row = rows.find((r) => r.pick.id === pickId);
    const drafts = row ? lastSessionDrafts(workouts, row.pick, unit) : null;
    if (drafts) patchRow(pickId, () => drafts);
  };

  const fillAllFromLast = () =>
    setRows((prev) =>
      prev.map((r) => ({ ...r, sets: lastSessionDrafts(workouts, r.pick, unit) ?? r.sets }))
    );

  const buildPlan = (): PlannedExercise[] =>
    rows.map((r) => ({
      exerciseId: r.pick.exerciseId,
      variation: r.pick.variation,
      sets: r.sets.map((s) => parseSetDraft(s, unit)),
    }));

  const hasAnySet = rows.some((r) =>
    r.sets.some((s) => {
      const p = parseSetDraft(s, unit);
      return p.weight > 0 || p.reps > 0;
    })
  );
  const hasLast = rows.some((r) => lastSessionDrafts(workouts, r.pick, unit) !== null);
  const hasSavedPlan = (plan?.length ?? 0) > 0;

  return (
    <div
      ref={backdropRef}
      className="ft-overlay"
      style={{ zIndex: 110 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-sheet-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="ft-modal ft-modal-lg w-full max-w-lg space-y-5 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="plan-sheet-title" className="ft-title">
                Plan {splitName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Set weights and reps now. In the gym, just press Start.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ft-btn ft-btn--ghost ft-btn--icon" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {picks.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-center">
            Pick today&apos;s exercises first, then come back to plan their sets.
          </p>
        ) : (
          <>
            {hasLast && (
              <button
                type="button"
                onClick={fillAllFromLast}
                className="ft-btn ft-btn--secondary ft-btn--sm inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Fill all from last session
              </button>
            )}

            <div className="space-y-5">
              {rows.map((row) => {
                const name = getExerciseName(row.pick.exerciseId);
                return (
                  <div key={row.pick.id} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {name}
                        {row.pick.variation && row.pick.variation !== 'Standard' && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">{row.pick.variation}</span>
                        )}
                      </p>
                      {lastSessionDrafts(workouts, row.pick, unit) && (
                        <button
                          type="button"
                          onClick={() => resetToLastSession(row.pick.id)}
                          className="text-xs font-medium text-primary hover:underline shrink-0"
                        >
                          Use last session
                        </button>
                      )}
                    </div>
                    <SetDraftRows
                      label={name}
                      unit={unit}
                      sets={row.sets}
                      onChange={(i, field, value) =>
                        patchRow(row.pick.id, (sets) => sets.map((s, k) => (k === i ? { ...s, [field]: value } : s)))
                      }
                      onRemove={(i) => patchRow(row.pick.id, (sets) => sets.filter((_, k) => k !== i))}
                      onAdd={() =>
                        patchRow(row.pick.id, (sets) => [...sets, newSetDraft(sets[sets.length - 1])])
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              {hasSavedPlan && (
                <button type="button" onClick={() => onSave([])} className="ft-btn ft-btn--ghost">
                  Clear plan
                </button>
              )}
              <button type="button" onClick={onClose} className="ft-btn ft-btn--secondary flex-1">
                Cancel
              </button>
              <button
                type="button"
                disabled={!hasAnySet}
                onClick={() => onSave(buildPlan())}
                className="ft-btn ft-btn--primary flex-1"
              >
                Save plan
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/** "Plan next workout": set each picked exercise's sets, weights and reps ahead of time. */
export function WorkoutPlanSheet({ open, ...rest }: Readonly<WorkoutPlanSheetProps>) {
  // Mounted only while open, so the editable rows are seeded fresh on every open.
  return open ? <PlanSheetBody {...rest} /> : null;
}
