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
import { RestTimer } from '@/components/workout/RestTimer';
import { VariationSelector } from '@/components/workout/VariationSelector';
import { SessionSetRow } from '@/components/workout/SessionSetRow';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_DEFINITIONS } from '@/workout/constants';
import { getExercisesForSplit, getExerciseById } from '@/workout/exerciseLibrary';
import type { SplitId, WorkoutExercise, WorkoutSet } from '@/workout/types';
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

const SPLIT_ICONS: Record<string, string> = {
  chest: '💪',
  back: '🏋️',
  shoulders: '🎯',
  upper: '⚡',
  legs: '🦵',
};

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
  } = useWorkoutStore();

  const [selectedSplit, setSelectedSplit] = useState<SplitId | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(profile.prefs.restTimer);

  const preselected = searchParams.get('split') as SplitId | null;

  useEffect(() => {
    if (preselected && SPLIT_DEFINITIONS.some((s) => s.id === preselected)) {
      setSelectedSplit(preselected);
    }
  }, [preselected]);

  useEffect(() => {
    if (activeWorkout) {
      setSelectedSplit(activeWorkout.splitId);
      setRestDuration(activeWorkout.restTimerSeconds);
      setRestEnd(activeWorkout.restTimerEnd);
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

  const updateExercise = (exerciseId: string, updater: (ex: WorkoutExercise) => WorkoutExercise) => {
    if (!activeWorkout) return;
    const exercises = activeWorkout.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? updater(ex) : ex
    );
    updateActiveWorkout({ ...activeWorkout, exercises });
  };

  const toggleSetDone = (exerciseId: string, setIdx: number) => {
    if (!activeWorkout) return;
    updateExercise(exerciseId, (ex) => {
      const sets = [...ex.sets];
      const wasDone = sets[setIdx].done;
      sets[setIdx] = { ...sets[setIdx], done: !wasDone };
      if (!wasDone && sets[setIdx].done) {
        setRestEnd(Date.now() + restDuration * 1000);
        updateActiveWorkout({
          ...activeWorkout,
          exercises: activeWorkout.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...ex, sets } : e
          ),
          restTimerEnd: Date.now() + restDuration * 1000,
        });
      }
      return { ...ex, sets };
    });
  };

  const updateSet = (exerciseId: string, setIdx: number, field: keyof WorkoutSet, value: number | boolean) => {
    updateExercise(exerciseId, (ex) => {
      const sets = [...ex.sets];
      if (field === 'weight') {
        sets[setIdx] = { ...sets[setIdx], weight: inputToKg(value as number, profile.prefs.unit) };
      } else {
        sets[setIdx] = { ...sets[setIdx], [field]: value };
      }
      return { ...ex, sets };
    });
  };

  const addSet = (exerciseId: string) => {
    updateExercise(exerciseId, (ex) => {
      const last = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false }],
      };
    });
  };

  const removeSet = (exerciseId: string, setIdx: number) => {
    updateExercise(exerciseId, (ex) => ({
      ...ex,
      sets: ex.sets.filter((_, i) => i !== setIdx),
    }));
  };

  const finishWorkout = () => setShowSummary(true);

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

          <RestTimer
            endTime={restEnd}
            defaultSeconds={restDuration}
            soundEnabled={profile.prefs.sound}
            onComplete={() => {
              setRestEnd(null);
              if (activeWorkout) updateActiveWorkout({ ...activeWorkout, restTimerEnd: null });
            }}
            onDurationChange={(s) => {
              setRestDuration(s);
              if (activeWorkout) updateActiveWorkout({ ...activeWorkout, restTimerSeconds: s });
            }}
            onClose={() => {
              setRestEnd(null);
              if (activeWorkout) updateActiveWorkout({ ...activeWorkout, restTimerEnd: null });
            }}
          />

          <div className="space-y-3">
            {activeWorkout.exercises.map((ex) => {
              const lib = getExerciseById(ex.exerciseId);
              const variations = getVariationsForExercise(ex.exerciseId, lib?.variations ?? [ex.variation]);
              const lastSession = getLastExerciseSession(workouts, ex.exerciseId);
              const isExpanded = expandedEx === ex.exerciseId;
              const hasPR = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));

              return (
                <div key={ex.exerciseId} className="wk-card overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-4 flex items-center justify-between"
                    onClick={() => setExpandedEx(isExpanded ? null : ex.exerciseId)}
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
                          onChange={(v) => updateExercise(ex.exerciseId, (e) => ({ ...e, variation: v }))}
                          onAddVariation={(v) => addVariation(ex.exerciseId, v)}
                        />

                        {lastSession && (
                          <p className="text-xs text-[var(--wk-muted)]">
                            Last: {formatWeight(lastSession.weight, profile.prefs.unit)} × {lastSession.reps}
                          </p>
                        )}

                        <div className="space-y-3">
                          {ex.sets.map((set, idx) => (
                            <SessionSetRow
                              key={idx}
                              index={idx}
                              set={set}
                              unit={profile.prefs.unit}
                              isPR={set.done && isPR(ex.exerciseId, set.weight, prs)}
                              onWeightChange={(v) => updateSet(ex.exerciseId, idx, 'weight', v)}
                              onRepsChange={(v) => updateSet(ex.exerciseId, idx, 'reps', v)}
                              onToggleDone={() => toggleSetDone(ex.exerciseId, idx)}
                              onRemove={() => removeSet(ex.exerciseId, idx)}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addSet(ex.exerciseId)}
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
                              updateExercise(ex.exerciseId, (exer) => ({ ...exer, notes: e.target.value }))
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

          <button type="button" onClick={finishWorkout} className="wk-btn-primary w-full py-3 text-base">
            Finish Workout
          </button>

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
