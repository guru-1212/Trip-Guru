'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Plus,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { AddExerciseModal, resolveExerciseForWorkout } from '@/components/workout/AddExerciseModal';
import { VariationSelector } from '@/components/workout/VariationSelector';
import { SessionSetRow } from '@/components/workout/SessionSetRow';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_DEFINITIONS, SPLIT_ICONS } from '@/workout/constants';
import { getExercisesForSplit, getExerciseById } from '@/workout/exerciseLibrary';
import type { CustomExercise, SplitId, WorkoutExercise, WorkoutSet, WeightUnit } from '@/workout/types';
import {
  getGreeting,
  getTodayDayKey,
  getLastTrainedDate,
  isYesterday,
  getLastExerciseSession,
  isPR,
  formatDuration,
  formatWeight,
  inputToKg,
  calcWorkoutVolume,
  countCompletedSets,
  createWorkoutExercises,
} from '@/workout/utils';
import toast from 'react-hot-toast';

export default function WorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    profile,
    workouts,
    prs,
    activeWorkout,
    customExercises,
    hydrated,
    startActiveWorkout,
    updateActiveWorkout,
    clearActiveWorkout,
    saveWorkout,
    addVariation,
    getVariationsForExercise,
    getVariationImage,
    updateProfile,
    addCustomExercise,
  } = useWorkoutStore();

  const handleWeightUnitChange = useCallback(
    (unit: WeightUnit) => updateProfile({ prefs: { unit } }),
    [updateProfile]
  );

  const [selectedSplit, setSelectedSplit] = useState<SplitId | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const restDuration = activeWorkout?.restTimerSeconds ?? profile.prefs.restTimer;

  const preselected = searchParams.get('split') as SplitId | null;

  useEffect(() => {
    if (preselected && SPLIT_DEFINITIONS.some((s) => s.id === preselected)) {
      setSelectedSplit(preselected);
    }
  }, [preselected]);

  useEffect(() => {
    if (activeWorkout) {
      setSelectedSplit(activeWorkout.splitId);
    }
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout) return;
    const tick = () => setElapsed(Math.floor((Date.now() - activeWorkout.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout]);

  const lastTrained = useMemo(() => {
    if (!selectedSplit) return null;
    return getLastTrainedDate(workouts, selectedSplit);
  }, [workouts, selectedSplit]);

  const showOvertraining = lastTrained && isYesterday(lastTrained);

  const beginWorkout = useCallback(() => {
    if (!selectedSplit) return;
    const split = SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit)!;
    const library = getExercisesForSplit(selectedSplit);
    const customForSplit = customExercises
      .filter((c) => library.some((l) => l.id === c.id) || true)
      .map((c) => ({
        id: c.id,
        name: c.name,
        muscle: c.muscle,
        secondary: c.secondary,
        equipment: c.equipment,
        difficulty: c.difficulty,
        variations: c.variations,
        tips: c.notes ? [c.notes] : [],
        splitIds: [selectedSplit] as SplitId[],
        category: [c.muscle] as never[],
      }));

    const allExercises = [
      ...library,
      ...customForSplit.filter((c) => !library.some((l) => l.id === c.id)),
    ];

    const exercises = createWorkoutExercises(allExercises, profile.prefs.defaultSets);
    const state = {
      splitId: selectedSplit,
      splitName: split.name,
      startedAt: Date.now(),
      exercises,
      restTimerSeconds: profile.prefs.restTimer,
      restTimerEnd: null,
    };
    startActiveWorkout(state);
    setExpandedEx(exercises[0]?.exerciseId ?? null);
  }, [selectedSplit, profile.prefs.defaultSets, profile.prefs.restTimer, customExercises, startActiveWorkout]);

  const updateExercise = (
    exerciseId: string,
    variation: string,
    updater: (ex: WorkoutExercise) => WorkoutExercise
  ) => {
    if (!activeWorkout) return;
    const exercises = activeWorkout.exercises.map((ex) =>
      ex.exerciseId === exerciseId && ex.variation === variation ? updater(ex) : ex
    );
    updateActiveWorkout({ ...activeWorkout, exercises });
  };

  const toggleSetDone = (exerciseId: string, variation: string, setIdx: number) => {
    if (!activeWorkout) return;
    updateExercise(exerciseId, variation, (ex) => {
      const sets = [...ex.sets];
      const wasDone = sets[setIdx].done;
      sets[setIdx] = { ...sets[setIdx], done: !wasDone };
      if (!wasDone && sets[setIdx].done) {
        updateActiveWorkout({
          ...activeWorkout,
          exercises: activeWorkout.exercises.map((e) =>
            e.exerciseId === exerciseId && e.variation === variation ? { ...ex, sets } : e
          ),
          restTimerEnd: Date.now() + restDuration * 1000,
        });
      }
      return { ...ex, sets };
    });
  };

  const updateSet = (
    exerciseId: string,
    variation: string,
    setIdx: number,
    field: keyof WorkoutSet,
    value: number | boolean
  ) => {
    updateExercise(exerciseId, variation, (ex) => {
      const sets = [...ex.sets];
      if (field === 'weight') {
        sets[setIdx] = { ...sets[setIdx], weight: inputToKg(value as number, profile.prefs.unit) };
      } else {
        sets[setIdx] = { ...sets[setIdx], [field]: value };
      }
      return { ...ex, sets };
    });
  };

  const addSet = (exerciseId: string, variation: string) => {
    updateExercise(exerciseId, variation, (ex) => {
      const last = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false }],
      };
    });
  };

  const removeSet = (exerciseId: string, variation: string, setIdx: number) => {
    updateExercise(exerciseId, variation, (ex) => ({
      ...ex,
      sets: ex.sets.filter((_, i) => i !== setIdx),
    }));
  };

  const finishWorkout = () => setShowSummary(true);

  const addExerciseToWorkout = useCallback(
    (exerciseId: string, variations: string[], remember: boolean) => {
      void remember;
      if (!activeWorkout) return;
      const uniqueVariations = Array.from(new Set(variations.filter(Boolean)));
      if (!uniqueVariations.length) return;
      const existingKeys = new Set(activeWorkout.exercises.map((ex) => `${ex.exerciseId}::${ex.variation}`));
      const variationsToAdd = uniqueVariations.filter(
        (variation) => !existingKeys.has(`${exerciseId}::${variation}`)
      );
      if (!variationsToAdd.length) {
        toast.error('Selected variation is already in workout');
        return;
      }

      const baseItem = resolveExerciseForWorkout(exerciseId, customExercises, profile.prefs.defaultSets);
      if (!baseItem) return;
      const additions = variationsToAdd.map((variation) => ({ ...baseItem, variation }));
      updateActiveWorkout({ ...activeWorkout, exercises: [...activeWorkout.exercises, ...additions] });
      setExpandedEx(`${exerciseId}::${variationsToAdd[0]}`);
      setShowAddExercise(false);
      toast.success(`${baseItem.name} added`);
    },
    [activeWorkout, customExercises, profile.prefs.defaultSets, updateActiveWorkout]
  );

  const handleCreateCustomExercise = useCallback(
    (data: Omit<CustomExercise, 'id'>, remember: boolean) => {
      const created = addCustomExercise(data);
      addExerciseToWorkout(created.id, [created.variations[0] ?? 'Standard'], remember);
    },
    [addCustomExercise, addExerciseToWorkout]
  );

  const replaceWorkout = () => {
    clearActiveWorkout();
    setShowReplaceDialog(false);
  };

  const confirmFinish = () => {
    if (!activeWorkout) return;
    const prsBroken = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    ).length;

    saveWorkout({
      date: dayjs().format('YYYY-MM-DD'),
      splitId: activeWorkout.splitId,
      splitName: activeWorkout.splitName,
      duration: elapsed,
      exercises: activeWorkout.exercises,
      totalSets: countCompletedSets(activeWorkout.exercises),
      totalVolume: calcWorkoutVolume(activeWorkout.exercises),
    });
    clearActiveWorkout();
    setShowSummary(false);
    router.push('/progress');
  };

  if (!hydrated) return <div className="text-[var(--wk-muted)]">Loading...</div>;

  // Step 2: Active Workout
  if (activeWorkout) {
    const completedExercises = activeWorkout.exercises.filter((e) => e.sets.some((s) => s.done)).length;
    const prsBroken = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    );

    return (
      <PageTransition>
        <div className="space-y-4">
          <div className="wk-card p-4 flex items-center justify-between sticky top-0 z-30">
            <div>
              <h1 className="wk-heading text-xl font-bold">{activeWorkout.splitName}</h1>
              <p className="text-[var(--wk-accent)] font-mono text-lg">{formatDuration(elapsed)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {activeWorkout.exercises.map((ex) => {
              const lib = getExerciseById(ex.exerciseId);
              const variations = getVariationsForExercise(ex.exerciseId, lib?.variations ?? [ex.variation]);
              const lastSession = getLastExerciseSession(workouts, ex.exerciseId, ex.variation);
              const cardKey = `${ex.exerciseId}::${ex.variation}`;
              const isExpanded = expandedEx === cardKey;
              const hasPR = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));

              return (
                <div key={cardKey} className="wk-card overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-4 flex items-center justify-between"
                    onClick={() => setExpandedEx(isExpanded ? null : cardKey)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ex.name}</span>
                      {hasPR && <span title="PR!">🏆</span>}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 space-y-4 border-t border-[var(--wk-border)]"
                      >
                        <VariationSelector
                          value={ex.variation}
                          variations={variations}
                          onChange={(v) =>
                            updateExercise(ex.exerciseId, ex.variation, (e) => ({ ...e, variation: v }))
                          }
                          onAddVariation={(v) => addVariation(ex.exerciseId, v)}
                        />

                        {lastSession && (
                          <div className="space-y-1">
                            <p className="text-xs text-[var(--wk-muted)]">
                              Last ({lastSession.variation}): {formatWeight(lastSession.bestSet.weight, profile.prefs.unit)} × {lastSession.bestSet.reps}
                            </p>
                            {lastSession.notes && (
                              <p className="text-[11px] italic text-[var(--wk-accent)] border-l-2 border-[var(--wk-accent)]/30 pl-2 mt-1 py-0.5">
                                Note: {lastSession.notes}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-3">
                          {ex.sets.map((set, idx) => (
                            <SessionSetRow
                              key={idx}
                              index={idx}
                              set={set}
                              unit={profile.prefs.unit}
                              isPR={set.done && isPR(ex.exerciseId, set.weight, prs)}
                              onWeightChange={(v) => updateSet(ex.exerciseId, ex.variation, idx, 'weight', v)}
                              onRepsChange={(v) => updateSet(ex.exerciseId, ex.variation, idx, 'reps', v)}
                              onToggleDone={() => toggleSetDone(ex.exerciseId, ex.variation, idx)}
                              onRemove={() => removeSet(ex.exerciseId, ex.variation, idx)}
                              onUnitChange={handleWeightUnitChange}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addSet(ex.exerciseId, ex.variation)}
                          className="flex items-center justify-center gap-2 w-full min-h-[48px] border-2 border-dashed border-[var(--wk-border)] hover:border-[var(--wk-accent)] rounded-2xl text-[var(--wk-muted)] hover:text-[var(--wk-accent)] font-semibold text-sm transition-all"
                        >
                          <Plus className="h-4 w-4" /> Add Set
                        </button>

                        <div>
                          <label className="text-xs text-[var(--wk-muted)]">Notes</label>
                          <textarea
                            className="wk-input text-sm mt-1 min-h-[60px]"
                            value={ex.notes ?? ''}
                            onChange={(e) =>
                              updateExercise(ex.exerciseId, ex.variation, (exer) => ({
                                ...exer,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Optional notes..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <button
              type="button"
              onClick={() => setShowAddExercise(true)}
              className="wk-btn-secondary w-full py-2.5 text-sm sm:flex-1 sm:py-3 sm:text-base"
            >
              Add<span className="hidden sm:inline"> Workout</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReplaceDialog(true)}
              className="wk-btn-secondary w-full py-2.5 text-sm sm:flex-1 sm:py-3 sm:text-base"
            >
              Replace<span className="hidden sm:inline"> Workout</span>
            </button>
            <button
              type="button"
              onClick={finishWorkout}
              className="wk-btn-primary col-span-2 w-full py-3 text-base sm:col-span-1 sm:flex-1"
            >
              Finish Workout
            </button>
          </div>

          {showAddExercise && activeWorkout && (
            <AddExerciseModal
              splitId={activeWorkout.splitId}
              currentSelections={activeWorkout.exercises.map((e) => ({
                exerciseId: e.exerciseId,
                variation: e.variation,
              }))}
              customExercises={customExercises}
              getVariationsForExercise={getVariationsForExercise}
              getVariationImage={getVariationImage}
              onAdd={addExerciseToWorkout}
              onCreateCustom={handleCreateCustomExercise}
              onClose={() => setShowAddExercise(false)}
            />
          )}

          {showReplaceDialog && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="wk-card p-6 max-w-md w-full space-y-4">
                <h2 className="wk-heading text-xl font-bold">Replace current workout?</h2>
                <p className="text-sm text-[var(--wk-muted)]">
                  This closes the current active workout and returns to split selection.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="wk-btn-secondary flex-1"
                    onClick={() => setShowReplaceDialog(false)}
                  >
                    Keep Current
                  </button>
                  <button type="button" className="wk-btn-primary flex-1" onClick={replaceWorkout}>
                    Replace
                  </button>
                </div>
              </div>
            </div>
          )}

          {showSummary && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="wk-card p-6 max-w-md w-full space-y-4">
                <h2 className="wk-heading text-xl font-bold">Workout Complete! 🎉</h2>
                <div className="space-y-2 text-sm">
                  <p>Duration: <strong>{formatDuration(elapsed)}</strong></p>
                  <p>Total Sets: <strong>{countCompletedSets(activeWorkout.exercises)}</strong></p>
                  <p>Total Volume: <strong>{formatWeight(calcWorkoutVolume(activeWorkout.exercises), profile.prefs.unit)}</strong></p>
                  <p>Exercises Completed: <strong>{completedExercises}</strong></p>
                  <p>PRs Broken: <strong>{prsBroken.length}</strong></p>
                </div>
                <div className="flex gap-3">
                  <button type="button" className="wk-btn-secondary flex-1" onClick={() => setShowSummary(false)}>
                    Continue
                  </button>
                  <button type="button" className="wk-btn-primary flex-1" onClick={confirmFinish}>
                    Save & View Progress
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  // Step 1: Split Selection
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="wk-heading text-2xl font-bold">
            {getGreeting()} — {getTodayDayKey()}
          </h1>
          <p className="text-[var(--wk-muted)] mt-1">Select your workout split</p>
        </div>

        {showOvertraining && selectedSplit && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(163,45,45,0.15)] border border-[var(--wk-danger)]">
            <AlertTriangle className="h-5 w-5 text-[var(--wk-danger)] shrink-0" />
            <p className="text-sm">
              You trained <strong>{SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit)?.name}</strong> yesterday.
              Consider rest or a different split.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SPLIT_DEFINITIONS.map((split) => {
            const last = getLastTrainedDate(workouts, split.id);
            const selected = selectedSplit === split.id;
            return (
              <button
                key={split.id}
                type="button"
                onClick={() => setSelectedSplit(split.id)}
                className={`wk-card p-5 text-left transition-all ${
                  selected ? 'ring-2 ring-[var(--wk-accent)] border-[var(--wk-accent)]' : ''
                }`}
              >
                <div className="text-2xl mb-2">{SPLIT_ICONS[split.icon]}</div>
                <h3 className="wk-heading font-semibold">{split.name}</h3>
                <p className="text-xs text-[var(--wk-muted)] mt-1">{split.muscles.join(' · ')}</p>
                <p className="text-xs text-[var(--wk-muted)] mt-2">
                  Last trained: {last ? dayjs(last).format('MMM D') : 'Never'}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selectedSplit}
          onClick={beginWorkout}
          className="wk-btn-primary w-full py-3 text-base disabled:opacity-40"
        >
          Start Workout
        </button>
      </div>
    </PageTransition>
  );
}
