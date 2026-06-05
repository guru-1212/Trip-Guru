'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trophy,
  Trash2,
  Plus,
  Check,
  CheckCircle2,
  X,
  TrendingUp,
  Timer,
  Info,
  Camera,
  Dumbbell,
  Target,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { RestTimer } from '@/components/workout/RestTimer';
import { VariationSelector } from '@/components/workout/VariationSelector';
import { AddExerciseModal, resolveExerciseForWorkout } from '@/components/workout/AddExerciseModal';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_DEFINITIONS } from '@/workout/constants';
import { getExercisesForSplit, getExerciseById } from '@/workout/exerciseLibrary';
import toast from 'react-hot-toast';
import type { CustomExercise, SplitId, WorkoutExercise, WorkoutSet, LibraryExercise } from '@/workout/types';
import {
  getGreeting,
  getTodayDayKey,
  getLastTrainedDate,
  isYesterday,
  getLastExerciseSession,
  isPR,
  formatDuration,
  formatWeight,
  displayWeight,
  inputToKg,
  calcWorkoutVolume,
  countCompletedSets,
  createWorkoutExercises,
  getMuscleFromSplit,
  suggestWeight,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

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
    splitExtras,
    rememberSplitExercise,
    addCustomExercise,
  } = useWorkoutStore();

  const [selectedSplit, setSelectedSplit] = useState<SplitId | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(profile.prefs.restTimer);
  const [showInfoModal, setShowInfoModal] = useState<LibraryExercise | null>(null);
  const [customExerciseImages, setCustomExerciseImages] = useState<Record<string, string>>({});

  const handleImageUpload = (exerciseId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomExerciseImages((prev) => ({ ...prev, [exerciseId]: result }));
      toast.success('Custom image updated!');
    };
    reader.readAsDataURL(file);
  };

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
    const splitMuscles = getMuscleFromSplit(selectedSplit);
    const customForSplit = customExercises
      .filter(
        (c) =>
          splitMuscles.includes(c.muscle) ||
          (c.secondary && splitMuscles.includes(c.secondary))
      )
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

    const baseIds = new Set(library.map((l) => l.id));
    const savedExtraIds = splitExtras[selectedSplit] ?? [];
    const extraLibrary = savedExtraIds
      .filter((id) => !baseIds.has(id))
      .map((id) => {
        const lib = getExerciseById(id);
        if (lib) return lib;
        const custom = customExercises.find((c) => c.id === id);
        if (!custom) return null;
        return {
          id: custom.id,
          name: custom.name,
          muscle: custom.muscle,
          secondary: custom.secondary,
          equipment: custom.equipment,
          difficulty: custom.difficulty,
          variations: custom.variations,
          tips: custom.notes ? [custom.notes] : [],
          splitIds: [selectedSplit] as SplitId[],
          category: [custom.muscle] as never[],
        };
      })
      .filter((ex): ex is NonNullable<typeof ex> => !!ex);

    const allExercises = [
      ...library,
      ...customForSplit.filter((c) => !library.some((l) => l.id === c.id)),
      ...extraLibrary.filter((c) => !library.some((l) => l.id === c.id) && !customForSplit.some((x) => x.id === c.id)),
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
  }, [selectedSplit, profile.prefs.defaultSets, profile.prefs.restTimer, customExercises, splitExtras, startActiveWorkout]);

  const addExerciseToWorkout = useCallback(
    (exerciseId: string, remember: boolean) => {
      if (!activeWorkout) return;
      if (activeWorkout.exercises.some((e) => e.exerciseId === exerciseId)) {
        toast.error('Exercise already in workout');
        return;
      }
      const item = resolveExerciseForWorkout(exerciseId, customExercises, profile.prefs.defaultSets);
      if (!item) return;
      updateActiveWorkout({
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, item],
      });
      if (remember) rememberSplitExercise(activeWorkout.splitId, exerciseId);
      setExpandedEx(exerciseId);
      setShowAddExercise(false);
      toast.success(`${item.name} added`);
    },
    [activeWorkout, customExercises, profile.prefs.defaultSets, updateActiveWorkout, rememberSplitExercise]
  );

  const handleCreateCustomExercise = useCallback(
    (data: Omit<CustomExercise, 'id'>, remember: boolean) => {
      const created = addCustomExercise(data);
      addExerciseToWorkout(created.id, remember);
    },
    [addCustomExercise, addExerciseToWorkout]
  );

  const updateExercise = (exerciseId: string, updater: (ex: WorkoutExercise) => WorkoutExercise) => {
    if (!activeWorkout) return;
    const exercises = activeWorkout.exercises.map((ex) =>
      ex.exerciseId === exerciseId ? updater(ex) : ex
    );
    updateActiveWorkout({ ...activeWorkout, exercises });
  };

  const startTimer = () => {
    setRestEnd(Date.now() + restDuration * 1000);
    if (activeWorkout) {
      updateActiveWorkout({
        ...activeWorkout,
        restTimerEnd: Date.now() + restDuration * 1000,
      });
    }
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

  const discardWorkout = () => {
    clearActiveWorkout();
    setShowCancelDialog(false);
    router.push('/fittrack/dashboard');
  };

  const confirmFinish = () => {
    if (!activeWorkout) return;
    const prsBroken = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    ).length;

    saveWorkout({
      date: workoutDate,
      splitId: activeWorkout.splitId,
      splitName: activeWorkout.splitName,
      duration: elapsed,
      exercises: activeWorkout.exercises,
      totalSets: countCompletedSets(activeWorkout.exercises),
      totalVolume: calcWorkoutVolume(activeWorkout.exercises),
    });
    clearActiveWorkout();
    setShowSummary(false);
    router.push('/fittrack/progress');
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
        <div className="space-y-6">
          <header className="flex items-center justify-between sticky top-0 z-30 glass p-5 rounded-[24px] border-primary/10 shadow-xl shadow-primary/5">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Dumbbell className="h-6 w-6" />
               </div>
               <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1">{activeWorkout.splitName}</h1>
                  <p className="text-primary font-black tabular-nums text-sm tracking-widest">{formatDuration(elapsed)}</p>
               </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all duration-300"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <RestTimer
            endTime={restEnd}
            defaultSeconds={restDuration}
            soundEnabled={profile.prefs.sound}
            onComplete={() => {}}
            onDurationChange={(s) => {
              const diff = s - restDuration;
              setRestDuration(s);
              setRestEnd((prev) => prev ? prev + diff * 1000 : null);
              if (activeWorkout) updateActiveWorkout({ 
                ...activeWorkout, 
                restTimerSeconds: s,
                restTimerEnd: restEnd ? restEnd + diff * 1000 : null
              });
            }}
            onClose={() => {
              setRestEnd(null);
              if (activeWorkout) updateActiveWorkout({ ...activeWorkout, restTimerEnd: null });
            }}
          />

          <div className="space-y-4">
            {activeWorkout.exercises.map((ex) => {
              const lib = getExerciseById(ex.exerciseId);
              const variations = getVariationsForExercise(ex.exerciseId, lib?.variations ?? [ex.variation]);
              const lastSession = getLastExerciseSession(workouts, ex.exerciseId);
              const isExpanded = expandedEx === ex.exerciseId;
              const hasPR = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));

              return (
                <div key={ex.exerciseId} className={cn("wk-card overflow-hidden transition-all duration-500", isExpanded ? "border-primary/30 ring-4 ring-primary/5 shadow-2xl" : "hover:border-primary/20")}>
                  <button
                    type="button"
                    className="w-full p-5 flex items-center justify-between text-left group"
                    onClick={() => setExpandedEx(isExpanded ? null : ex.exerciseId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", isExpanded ? "bg-primary text-white" : "bg-primary/5 text-primary group-hover:bg-primary/10")}>
                         <Target className="h-5 w-5" />
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                           <span className="font-black text-slate-900 dark:text-white tracking-tight">{ex.name}</span>
                           {hasPR && <Trophy className="h-3.5 w-3.5 text-yellow-500 animate-bounce" />}
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                           {ex.sets.filter(s => s.done).length} / {ex.sets.length} Sets Completed
                         </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInfoModal(lib || null);
                        }}
                        className="p-2 hover:bg-primary/5 rounded-xl transition-colors"
                      >
                        <Info className="h-4 w-4 text-primary/40 hover:text-primary" />
                      </button>
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-90 text-primary")} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-6 space-y-6 border-t border-white/5 pt-6 bg-primary/[0.01]"
                      >
                        <VariationSelector
                          value={ex.variation}
                          variations={variations}
                          onChange={(v) => updateExercise(ex.exerciseId, (e) => ({ ...e, variation: v }))}
                          onAddVariation={(v) => addVariation(ex.exerciseId, v)}
                        />

                        {lastSession && (
                          <div className="flex flex-wrap gap-4 items-center bg-slate-500/5 p-3 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2">
                               <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                                  <Trophy className="h-3.5 w-3.5" />
                               </div>
                               <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                 Last Best: <span className="text-slate-900 dark:text-white">{formatWeight(lastSession.weight, profile.prefs.unit)} × {lastSession.reps}</span>
                               </p>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                  <TrendingUp className="h-3.5 w-3.5" />
                               </div>
                               <p className="text-xs font-black uppercase tracking-widest text-primary">
                                 Suggested: <span className="underline underline-offset-4 decoration-2">{formatWeight(suggestWeight(lastSession.weight, lastSession.reps, profile.prefs.unit), profile.prefs.unit)}</span>
                               </p>
                            </div>
                          </div>
                        )}

                        <div className="overflow-x-auto -mx-1 px-1">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                <th className="text-left py-3 w-12 px-2">#</th>
                                <th className="text-left py-3 px-2">Weight ({profile.prefs.unit})</th>
                                <th className="text-left py-3 w-20 px-2">Reps</th>
                                <th className="text-center py-3 w-16 px-2">Done</th>
                                <th className="w-20 px-2" />
                              </tr>
                            </thead>
                            <tbody className="space-y-2">
                              {ex.sets.map((set, idx) => {
                                const showPR = set.done && isPR(ex.exerciseId, set.weight, prs);
                                return (
                                  <tr key={idx} className={cn("group/set transition-colors rounded-xl", set.done ? "bg-primary/[0.03]" : "hover:bg-slate-500/5")}>
                                    <td className="py-3 font-black text-muted-foreground/50 px-2">{idx + 1}</td>
                                    <td className="py-3 px-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          className="wk-input w-24 text-sm font-black h-11 px-3 bg-white/5"
                                          value={displayWeight(set.weight, profile.prefs.unit) || ''}
                                          onChange={(e) =>
                                            updateSet(ex.exerciseId, idx, 'weight', parseFloat(e.target.value) || 0)
                                          }
                                        />
                                        {showPR && <Trophy className="h-4 w-4 text-yellow-500 drop-shadow-lg" />}
                                      </div>
                                    </td>
                                    <td className="py-3 px-2">
                                      <input
                                        type="number"
                                        className="wk-input w-20 text-sm font-black h-11 px-3 bg-white/5"
                                        value={set.reps || ''}
                                        onChange={(e) =>
                                          updateSet(ex.exerciseId, idx, 'reps', parseInt(e.target.value, 10) || 0)
                                        }
                                      />
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleSetDone(ex.exerciseId, idx)}
                                        className={cn(
                                          "w-10 h-10 rounded-xl border-2 flex items-center justify-center mx-auto transition-all duration-300",
                                          set.done
                                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110"
                                            : "border-slate-500/20 text-muted-foreground/30 hover:border-primary/40 hover:text-primary"
                                        )}
                                      >
                                        <Check className={cn("h-5 w-5", set.done ? "opacity-100" : "opacity-0")} />
                                      </button>
                                    </td>
                                    <td className="py-3 px-2">
                                      <div className="flex items-center justify-end gap-3 pr-2">
                                        <button
                                          type="button"
                                          onClick={startTimer}
                                          className="p-2.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl transition-all"
                                          title="Start Rest Timer"
                                        >
                                          <Timer className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeSet(ex.exerciseId, idx)}
                                          className="p-2.5 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <button
                          type="button"
                          onClick={() => addSet(ex.exerciseId)}
                          className="w-full py-4 border-2 border-dashed border-primary/10 hover:border-primary/30 hover:bg-primary/5 rounded-2xl text-primary font-black text-xs uppercase tracking-[0.2em] transition-all"
                        >
                          + Add Set
                        </button>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Session Notes</label>
                          <textarea
                            className="wk-input text-sm font-medium min-h-[80px] bg-white/5 p-4 rounded-2xl"
                            value={ex.notes ?? ''}
                            onChange={(e) =>
                              updateExercise(ex.exerciseId, (exer) => ({ ...exer, notes: e.target.value }))
                            }
                            placeholder="How did this exercise feel? Technique cues, fatigue levels..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
            <button
              type="button"
              onClick={() => setShowAddExercise(true)}
              className="bg-slate-500/5 hover:bg-slate-500/10 border border-white/5 px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-3 shadow-xl"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
            <button 
              type="button" 
              onClick={finishWorkout} 
              className="bg-primary text-white px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Finish Protocol
            </button>
          </div>

          {showAddExercise && activeWorkout && (
            <AddExerciseModal
              splitId={activeWorkout.splitId}
              currentExerciseIds={activeWorkout.exercises.map((e) => e.exerciseId)}
              customExercises={customExercises}
              onAdd={addExerciseToWorkout}
              onCreateCustom={handleCreateCustomExercise}
              onClose={() => setShowAddExercise(false)}
            />
          )}

          {showSummary && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="wk-card p-6 max-w-md w-full space-y-4">
                <h2 className="wk-heading text-xl font-bold">Workout Complete! 🎉</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <label className="text-xs text-[var(--wk-muted)] block mb-1">Workout Date</label>
                    <input
                      type="date"
                      className="wk-input text-sm"
                      value={workoutDate}
                      max={dayjs().format('YYYY-MM-DD')}
                      onChange={(e) => setWorkoutDate(e.target.value)}
                    />
                    <p className="text-xs text-[var(--wk-muted)] mt-1">
                      Log for a past day if you forgot to track yesterday
                    </p>
                  </div>
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

          {showCancelDialog && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
              <div className="wk-card p-6 max-w-sm w-full space-y-4">
                <div className="flex items-center gap-3 text-[var(--wk-danger)]">
                  <AlertTriangle className="h-6 w-6" />
                  <h2 className="wk-heading text-lg font-bold">Discard Workout?</h2>
                </div>
                <p className="text-sm text-[var(--wk-muted)]">
                  This will stop your current session and delete all progress made so far. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="wk-btn-secondary flex-1"
                    onClick={() => setShowCancelDialog(false)}
                  >
                    Keep Training
                  </button>
                  <button
                    type="button"
                    className="wk-btn-danger flex-1"
                    onClick={discardWorkout}
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {showInfoModal && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowInfoModal(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="wk-card w-full max-w-lg relative z-10 overflow-hidden bg-[var(--wk-surface)] shadow-2xl"
                >
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    <img
                      src={customExerciseImages[showInfoModal.id] || `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800&exercise=${showInfoModal.id}`}
                      alt={showInfoModal.name}
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--wk-surface)] to-transparent" />
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                      <label className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors cursor-pointer">
                        <Camera className="h-5 w-5" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/gif,image/svg+xml"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(showInfoModal.id, file);
                          }}
                        />
                      </label>
                      <button
                        onClick={() => setShowInfoModal(null)}
                        className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="absolute bottom-4 left-6 text-left">
                      <h2 className="wk-heading text-2xl font-bold text-white mb-1">{showInfoModal.name}</h2>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--wk-accent)] text-white">
                          {showInfoModal.difficulty}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
                          {showInfoModal.equipment}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-[var(--wk-bg)] border border-[var(--wk-border)]">
                        <p className="text-[10px] font-bold text-[var(--wk-muted)] uppercase mb-1 text-left">Target Muscle</p>
                        <p className="font-semibold text-left">{showInfoModal.muscle}</p>
                      </div>
                      {showInfoModal.secondary && (
                        <div className="p-3 rounded-xl bg-[var(--wk-bg)] border border-[var(--wk-border)]">
                          <p className="text-[10px] font-bold text-[var(--wk-muted)] uppercase mb-1 text-left">Secondary</p>
                          <p className="font-semibold text-left">{showInfoModal.secondary}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="wk-heading font-bold flex items-center gap-2">
                        <Info className="h-4 w-4 text-[var(--wk-accent)]" />
                        How to Perform
                      </h3>
                      <ul className="space-y-3">
                        {showInfoModal.tips.map((tip, i) => (
                          <li key={i} className="flex gap-3 text-sm text-[var(--wk-muted)] leading-relaxed text-left">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--wk-accent)]/10 text-[var(--wk-accent)] flex items-center justify-center text-[10px] font-bold">
                              {i + 1}
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => setShowInfoModal(null)}
                      className="w-full wk-btn-primary py-3"
                    >
                      Got it, thanks!
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </PageTransition>
    );
  }

  // Step 1: Split Selection
  return (
    <PageTransition>
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
            {getGreeting()}, {profile.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">
            Deployment Phase: Select Your Training Protocol
          </p>
        </header>

        {showOvertraining && selectedSplit && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 p-5 rounded-[24px] bg-red-500/10 border border-red-500/20 shadow-lg shadow-red-500/5"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
               <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              System Alert: You trained <strong>{SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit)?.name}</strong> recently. 
              Recovery protocol is recommended to avoid fatigue.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SPLIT_DEFINITIONS.map((split) => {
            const last = getLastTrainedDate(workouts, split.id);
            const selected = selectedSplit === split.id;
            return (
              <button
                key={split.id}
                type="button"
                onClick={() => setSelectedSplit(split.id)}
                className={cn(
                  "wk-card p-6 text-left transition-all duration-500 relative overflow-hidden group",
                  selected 
                    ? "border-primary ring-4 ring-primary/10 shadow-2xl shadow-primary/10 -translate-y-1" 
                    : "hover:border-primary/30"
                )}
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-150 group-hover:rotate-12">
                   <Dumbbell className="h-32 w-32" />
                </div>

                <div className="flex items-center gap-4 mb-6 relative z-10">
                   <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-all duration-500", selected ? "bg-primary text-white" : "bg-primary/5 text-primary group-hover:bg-primary/10")}>
                      {SPLIT_ICONS[split.icon]}
                   </div>
                   <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1">{split.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary opacity-80">Training Protocol</p>
                   </div>
                </div>

                <div className="space-y-4 relative z-10">
                   <div className="flex flex-wrap gap-2">
                     {split.muscles.map(m => (
                       <span key={m} className="text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-lg bg-slate-500/5 text-muted-foreground border border-white/5">
                         {m}
                       </span>
                     ))}
                   </div>
                   <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Last Active: <span className={cn("text-slate-900 dark:text-white ml-1", !last && "opacity-30")}>{last ? dayjs(last).format('MMM D') : 'No Record'}</span>
                      </p>
                      {selected && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in duration-300" />}
                   </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selectedSplit}
          onClick={beginWorkout}
          className="wk-btn-primary w-full py-5 text-base disabled:opacity-40 disabled:grayscale transition-all duration-500 shadow-2xl shadow-primary/20"
        >
          Initialize Training Protocol
        </button>
      </div>
    </PageTransition>
  );
}
