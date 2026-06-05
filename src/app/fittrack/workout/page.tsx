'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  Trophy,
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
  Zap,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { RestTimer } from '@/components/workout/RestTimer';
import { VariationSelector } from '@/components/workout/VariationSelector';
import { SessionSetRow } from '@/components/workout/SessionSetRow';
import { AddExerciseModal, resolveExerciseForWorkout } from '@/components/workout/AddExerciseModal';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_DEFINITIONS, SPLIT_NAMES } from '@/workout/constants';
import { getExercisesForSplit, getExerciseById } from '@/workout/exerciseLibrary';
import toast from 'react-hot-toast';
import type { CustomExercise, SplitId, WorkoutExercise, WorkoutSet, LibraryExercise } from '@/workout/types';
import {
  getGreeting,
  getTodayDayKey,
  getTodaysSplit,
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
  const todaySplit = useMemo(() => getTodaysSplit(profile), [profile]);

  useEffect(() => {
    if (activeWorkout) return;
    if (preselected && SPLIT_DEFINITIONS.some((s) => s.id === preselected)) {
      setSelectedSplit(preselected);
      return;
    }
    if (hydrated && todaySplit !== 'rest') {
      setSelectedSplit(todaySplit);
    }
  }, [preselected, todaySplit, hydrated, activeWorkout]);

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

  if (!hydrated) return <div className="ft-loading"><Dumbbell className="h-8 w-8 text-primary animate-pulse" /><span>Loading workout...</span></div>;

  // Step 2: Active Workout
  if (activeWorkout) {
    const completedExercises = activeWorkout.exercises.filter((e) => e.sets.some((s) => s.done)).length;
    const prsBroken = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    );

    return (
      <PageTransition>
        <div className="space-y-5 pb-36">
          <header className="ft-card ft-card-padded sticky top-0 z-40 !py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="ft-title truncate">{activeWorkout.splitName}</h1>
                  <div className="flex items-center gap-1.5 text-sm text-primary font-semibold tabular-nums mt-0.5">
                    <Timer className="h-3.5 w-3.5" />
                    {formatDuration(elapsed)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelDialog(true)}
                className="ft-btn ft-btn--ghost ft-btn--icon shrink-0 !text-red-500 hover:!bg-red-500/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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

          {/* Exercises */}
          <div className="space-y-4">
            {activeWorkout.exercises.map((ex) => {
              const lib = getExerciseById(ex.exerciseId);
              const variations = getVariationsForExercise(ex.exerciseId, lib?.variations ?? [ex.variation]);
              const lastSession = getLastExerciseSession(workouts, ex.exerciseId);
              const isExpanded = expandedEx === ex.exerciseId;
              const hasPR = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));
              const setsCompleted = ex.sets.filter(s => s.done).length;
              const progress = (setsCompleted / ex.sets.length) * 100;

              return (
                <div key={ex.exerciseId} className={cn('ft-exercise-card', isExpanded && 'ft-exercise-card--open')}>
                  <div className="ft-exercise-progress">
                    <div className="ft-exercise-progress-fill" style={{ width: `${progress}%` }} />
                  </div>

                  <button
                    type="button"
                    className="ft-exercise-trigger"
                    onClick={() => setExpandedEx(isExpanded ? null : ex.exerciseId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base truncate">{ex.name}</span>
                          {hasPR && <Trophy className="h-4 w-4 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {setsCompleted} of {ex.sets.length} sets done
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInfoModal(lib || null);
                        }}
                        className="ft-btn ft-btn--ghost ft-btn--icon ft-btn--sm"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                      <ChevronRight className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-90 text-primary')} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ft-exercise-body space-y-5 pt-5"
                      >
                        <VariationSelector
                          value={ex.variation}
                          variations={variations}
                          onChange={(v) => updateExercise(ex.exerciseId, (e) => ({ ...e, variation: v }))}
                          onAddVariation={(v) => addVariation(ex.exerciseId, v)}
                        />

                        {lastSession && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="ft-stat-pill">
                              <div className="ft-stat-pill-icon bg-amber-500/15 text-amber-600">
                                <Trophy className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Last session</p>
                                <p className="text-sm font-semibold tabular-nums">{formatWeight(lastSession.weight, profile.prefs.unit)} × {lastSession.reps}</p>
                              </div>
                            </div>
                            <div className="ft-stat-pill">
                              <div className="ft-stat-pill-icon bg-primary/15 text-primary">
                                <TrendingUp className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Suggested</p>
                                <p className="text-sm font-semibold tabular-nums">{formatWeight(suggestWeight(lastSession.weight, lastSession.reps, profile.prefs.unit), profile.prefs.unit)}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sets — card-based mobile-first log */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="ft-section-title">Sets</p>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                              {setsCompleted} / {ex.sets.length}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {ex.sets.map((set, idx) => (
                              <motion.div key={idx} layout>
                                <SessionSetRow
                                  index={idx}
                                  set={set}
                                  unit={profile.prefs.unit}
                                  isPR={set.done && isPR(ex.exerciseId, set.weight, prs)}
                                  onWeightChange={(v) => updateSet(ex.exerciseId, idx, 'weight', v)}
                                  onRepsChange={(v) => updateSet(ex.exerciseId, idx, 'reps', v)}
                                  onToggleDone={() => toggleSetDone(ex.exerciseId, idx)}
                                  onRemove={() => removeSet(ex.exerciseId, idx)}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => addSet(ex.exerciseId)} className="ft-btn ft-btn--ghost ft-btn--block">
                            <Plus className="h-4 w-4" />
                            Add Set
                          </button>
                          <button type="button" onClick={startTimer} className="ft-btn ft-btn--ghost ft-btn--block">
                            <Timer className="h-4 w-4" />
                            Rest
                          </button>
                        </div>

                        <div>
                          <label className="ft-label">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
                          <textarea
                            className="ft-textarea resize-none"
                            value={ex.notes ?? ''}
                            onChange={(e) =>
                              updateExercise(ex.exerciseId, (exer) => ({ ...exer, notes: e.target.value }))
                            }
                            placeholder="RPE, form cues, how it felt..."
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="ft-action-bar">
            <button type="button" onClick={() => setShowAddExercise(true)} className="ft-btn ft-btn--secondary flex-1">
              <Plus className="h-4 w-4" />
              Add Exercise
            </button>
            <button type="button" onClick={finishWorkout} className="ft-btn ft-btn--primary flex-1">
              <Zap className="h-4 w-4" />
              Finish
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

          {/* Modals & Dialogs */}
          <AnimatePresence>
            {showSummary && (
              <div className="ft-overlay">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="ft-modal ft-modal-lg space-y-6"
                >
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                      <Trophy className="h-7 w-7" />
                    </div>
                    <h2 className="ft-title-lg">Workout Complete</h2>
                    <p className="ft-subtitle mt-1">Great session — save your progress below.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <SummaryMetric label="Duration" value={formatDuration(elapsed)} icon={Timer} />
                    <SummaryMetric label="Sets" value={String(countCompletedSets(activeWorkout.exercises))} icon={CheckCircle2} />
                    <SummaryMetric label="Volume" value={formatWeight(calcWorkoutVolume(activeWorkout.exercises), profile.prefs.unit)} icon={TrendingUp} />
                    <SummaryMetric label="PRs" value={String(prsBroken.length)} icon={Trophy} />
                  </div>

                  <div>
                    <label className="ft-label">Session date</label>
                    <input
                      type="date"
                      className="ft-input"
                      value={workoutDate}
                      max={dayjs().format('YYYY-MM-DD')}
                      onChange={(e) => setWorkoutDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" className="ft-btn ft-btn--secondary flex-1" onClick={() => setShowSummary(false)}>
                      Back
                    </button>
                    <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={confirmFinish}>
                      Save Workout
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {showCancelDialog && (
              <div className="ft-overlay" style={{ zIndex: 70 }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="ft-modal space-y-6"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h2 className="ft-title">Discard workout?</h2>
                    <p className="ft-subtitle mt-2">All logged sets will be lost. This cannot be undone.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button type="button" className="ft-btn ft-btn--secondary ft-btn--block" onClick={() => setShowCancelDialog(false)}>
                      Keep Training
                    </button>
                    <button type="button" className="ft-btn ft-btn--danger ft-btn--block" onClick={discardWorkout}>
                      Discard
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showInfoModal && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowInfoModal(null)}
                  className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="ft-card w-full max-w-lg relative z-10 overflow-hidden"
                >
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    <img
                      src={customExerciseImages[showInfoModal.id] || `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800&exercise=${showInfoModal.id}`}
                      alt={showInfoModal.name}
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                      <label className="p-3 bg-black/50 hover:bg-black/70 rounded-2xl text-white transition-colors cursor-pointer active:scale-90">
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
                        className="p-3 bg-black/50 hover:bg-black/70 rounded-2xl text-white transition-colors active:scale-90"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="absolute bottom-6 left-8 text-left">
                      <h2 className="ft-title text-3xl font-black text-white mb-2">{showInfoModal.name}</h2>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-primary text-white shadow-lg">
                          {showInfoModal.difficulty}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-white/20 text-white backdrop-blur-sm">
                          {showInfoModal.equipment}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Target Muscle</p>
                        <p className="font-black text-lg">{showInfoModal.muscle}</p>
                      </div>
                      {showInfoModal.secondary && (
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Secondary</p>
                          <p className="font-black text-lg">{showInfoModal.secondary}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="ft-title font-black text-xl flex items-center gap-3">
                        <Zap className="h-5 w-5 text-primary" />
                        Execution Intel
                      </h3>
                      <ul className="space-y-4">
                        {showInfoModal.tips.map((tip, i) => (
                          <li key={i} className="flex gap-4 text-sm font-medium text-muted-foreground leading-relaxed">
                            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                              {i + 1}
                            </span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => setShowInfoModal(null)}
                      className="w-full ft-btn ft-btn--primary py-4 text-sm tracking-[0.2em]"
                    >
                      Understood
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
      <div className="space-y-6">
        <header>
          <h1 className="ft-title-lg">{getGreeting()}, {profile.name.split(' ')[0]}</h1>
          <p className="ft-subtitle mt-1">
            {todaySplit !== 'rest'
              ? `${getTodayDayKey()} — scheduled: ${SPLIT_NAMES[todaySplit]}`
              : `${getTodayDayKey()} — rest day on your plan`}
          </p>
        </header>

        {todaySplit !== 'rest' && (
          <div className="ft-today-banner">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Today&apos;s workout</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className="font-medium text-primary">{SPLIT_NAMES[todaySplit]}</span> is highlighted below — tap Start when you&apos;re ready.
              </p>
            </div>
          </div>
        )}

        {todaySplit === 'rest' && (
          <div className="ft-card ft-card-padded flex items-start gap-3 bg-muted/30">
            <Dumbbell className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Rest day</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your weekly plan has no workout today. You can still pick any split below if you want to train.
              </p>
            </div>
          </div>
        )}

        {showOvertraining && selectedSplit && (
          <div className="ft-card ft-card-padded flex items-start gap-3 border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Recovery notice</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                You trained <strong>{SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit)?.name}</strong> yesterday. Consider rest or a different split.
              </p>
            </div>
          </div>
        )}

        <div className="ft-split-grid">
          {SPLIT_DEFINITIONS.map((split) => {
            const last = getLastTrainedDate(workouts, split.id);
            const selected = selectedSplit === split.id;
            const isTodayPlan = todaySplit === split.id;
            return (
              <button
                key={split.id}
                type="button"
                onClick={() => setSelectedSplit(split.id)}
                className={cn(
                  'ft-split-card',
                  selected && 'ft-split-card--selected',
                  isTodayPlan && 'ft-split-card--today'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <span className="text-2xl">{SPLIT_ICONS[split.icon]}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isTodayPlan && (
                      <span className="ft-badge ft-badge--primary">Today</span>
                    )}
                    {selected && (
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">{split.name}</h3>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {split.muscles.map((m) => (
                    <span key={m} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{m}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" />
                  Last: {last ? dayjs(last).format('MMM D') : 'Never'}
                </p>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!selectedSplit}
          onClick={beginWorkout}
          className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg"
        >
          {selectedSplit === todaySplit && todaySplit !== 'rest'
            ? `Start ${SPLIT_NAMES[todaySplit]}`
            : 'Start Workout'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </PageTransition>
  );
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="ft-metric text-center !p-4">
      <div className="ft-metric-icon mx-auto !mb-2">
        <Icon className="h-4 w-4" />
      </div>
      <p className="ft-metric-label">{label}</p>
      <p className="ft-metric-value text-base">{value}</p>
    </div>
  );
}
