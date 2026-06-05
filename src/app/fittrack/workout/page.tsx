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
  Link2,
  Dumbbell,
  Target,
  Zap,
  ArrowRight,
  ChevronLeft,
  Trash2,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { RestTimer } from '@/components/workout/RestTimer';
import { VariationSelector } from '@/components/workout/VariationSelector';
import { SessionSetRow } from '@/components/workout/SessionSetRow';
import { PinConfirm, FINISH_WORKOUT_PIN } from '@/components/workout/PinConfirm';
import { AddExerciseModal, resolveExerciseForWorkout } from '@/components/workout/AddExerciseModal';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_DEFINITIONS, SPLIT_NAMES, MUSCLE_COLORS } from '@/workout/constants';
import { getExercisesForSplit, getExerciseById } from '@/workout/exerciseLibrary';
import toast from 'react-hot-toast';
import type { CustomExercise, SplitId, WorkoutExercise, WorkoutSet, LibraryExercise, WeightUnit } from '@/workout/types';
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
  groupExercisesByMuscle,
  defaultExerciseImageUrl,
  variationImageKey,
  compressImageFile,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

const SPLIT_ICONS: Record<string, string> = {
  chest: '💪',
  back: '🏋️',
  shoulders: '🎯',
  upper: '⚡',
  legs: '🦵',
};

function resolveExerciseInfo(
  exerciseId: string,
  customExercises: CustomExercise[],
  workoutExercise?: WorkoutExercise,
  allVariations?: string[]
): LibraryExercise | null {
  const lib = getExerciseById(exerciseId);
  if (lib) return lib;
  const custom = customExercises.find((c) => c.id === exerciseId);
  if (custom) {
    return {
      id: custom.id,
      name: custom.name,
      muscle: custom.muscle,
      secondary: custom.secondary,
      equipment: custom.equipment,
      difficulty: custom.difficulty,
      variations: custom.variations,
      tips: custom.notes ? [custom.notes] : [],
      splitIds: [],
      category: [custom.muscle],
    };
  }
  if (workoutExercise && workoutExercise.exerciseId === exerciseId) {
    return {
      id: workoutExercise.exerciseId,
      name: workoutExercise.name,
      muscle: workoutExercise.muscle,
      equipment: 'Custom',
      difficulty: 'Beginner',
      variations: allVariations?.length ? allVariations : [workoutExercise.variation || 'Standard'],
      tips: workoutExercise.notes ? [workoutExercise.notes] : [],
      splitIds: [],
      category: [workoutExercise.muscle],
    };
  }
  return null;
}

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
    updateProfile,
    removeExerciseFromActiveWorkout,
    setVariationImage,
    removeVariationImage,
    getVariationImage,
  } = useWorkoutStore();

  const [selectedSplit, setSelectedSplit] = useState<SplitId | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [finishPin, setFinishPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(profile.prefs.restTimer);
  const [infoModal, setInfoModal] = useState<{
    exercise: LibraryExercise;
    previewVariation: string;
  } | null>(null);
  const [fullImagePreview, setFullImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [variationUrlInputs, setVariationUrlInputs] = useState<Record<string, string>>({});

  const handleWeightUnitChange = useCallback(
    (unit: WeightUnit) => updateProfile({ prefs: { unit } }),
    [updateProfile]
  );

  const handleVariationImageUpload = async (exerciseId: string, variation: string, file: File) => {
    try {
      const result = await compressImageFile(file);
      setVariationImage(exerciseId, variation, result);
      setVariationUrlInputs((prev) => ({ ...prev, [variationImageKey(exerciseId, variation)]: '' }));
    } catch {
      toast.error('Could not process image. Try a smaller file or use an image URL.');
    }
  };

  const handleVariationImageUrl = (exerciseId: string, variation: string) => {
    const key = variationImageKey(exerciseId, variation);
    const trimmed = (variationUrlInputs[key] ?? '').trim();
    if (!trimmed) {
      toast.error('Enter an image URL');
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        toast.error('URL must start with http:// or https://');
        return;
      }
    } catch {
      toast.error('Enter a valid URL');
      return;
    }
    setVariationImage(exerciseId, variation, trimmed);
  };

  const openExerciseInfo = (ex: WorkoutExercise) => {
    const lib = getExerciseById(ex.exerciseId);
    const baseVariations = lib?.variations ?? [ex.variation];
    const allVariations = getVariationsForExercise(ex.exerciseId, baseVariations);
    const info = resolveExerciseInfo(ex.exerciseId, customExercises, ex, allVariations);
    if (!info) {
      toast.error('Could not load exercise info');
      return;
    }
    setInfoModal({ exercise: info, previewVariation: ex.variation });
    setVariationUrlInputs({});
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
      addedExerciseIds: [],
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
        addedExerciseIds: [...(activeWorkout.addedExerciseIds ?? []), exerciseId],
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

  const finishWorkout = () => {
    setFinishPin('');
    setPinError(false);
    setShowSummary(true);
  };

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
    setFinishPin('');
    setPinError(false);
    router.push('/fittrack/progress');
  };

  const handleSaveWorkout = () => {
    if (finishPin !== FINISH_WORKOUT_PIN) {
      setPinError(true);
      return;
    }
    confirmFinish();
  };

  const handleRemoveExercise = (exerciseId: string) => {
    removeExerciseFromActiveWorkout(exerciseId);
    if (expandedEx === exerciseId) setExpandedEx(null);
    setRemoveConfirmId(null);
    toast.success('Exercise removed from session');
  };

  if (!hydrated) return <div className="ft-loading"><Dumbbell className="h-8 w-8 text-primary animate-pulse" /><span>Loading workout...</span></div>;

  // Step 2: Active Workout
  if (activeWorkout) {
    const completedExercises = activeWorkout.exercises.filter((e) => e.sets.some((s) => s.done)).length;
    const prsBroken = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    );
    const groupedExercises = groupExercisesByMuscle(activeWorkout.exercises, activeWorkout.splitId);
    const addedExerciseIds = activeWorkout.addedExerciseIds ?? [];
    const removeTarget = removeConfirmId
      ? activeWorkout.exercises.find((e) => e.exerciseId === removeConfirmId)
      : null;

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
          <div className="space-y-6">
            {groupedExercises.map(({ muscle, exercises }) => (
              <div key={muscle} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))' }}
                  />
                  <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{muscle}</h2>
                </div>
                {exercises.map((ex) => {
              const lib = getExerciseById(ex.exerciseId);
              const variations = getVariationsForExercise(ex.exerciseId, lib?.variations ?? [ex.variation]);
              const lastSession = getLastExerciseSession(workouts, ex.exerciseId);
              const isExpanded = expandedEx === ex.exerciseId;
              const hasPR = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));
              const setsCompleted = ex.sets.filter(s => s.done).length;
              const progress = (setsCompleted / ex.sets.length) * 100;
              const isRemovable = addedExerciseIds.includes(ex.exerciseId);

              return (
                <div key={ex.exerciseId} className={cn('ft-exercise-card', isExpanded && 'ft-exercise-card--open')}>
                  <div className="ft-exercise-progress">
                    <div className="ft-exercise-progress-fill" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="ft-exercise-trigger">
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-3 min-w-0 text-left bg-transparent border-0 cursor-pointer p-0"
                      onClick={() => setExpandedEx(isExpanded ? null : ex.exerciseId)}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base truncate">{ex.name}</span>
                          {hasPR && <Trophy className="h-4 w-4 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {setsCompleted} of {ex.sets.length} sets done
                        </p>
                      </div>
                      <ChevronRight className={cn('h-5 w-5 text-muted-foreground transition-transform shrink-0', isExpanded && 'rotate-90 text-primary')} />
                    </button>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isRemovable && (
                        <button
                          type="button"
                          onClick={() => setRemoveConfirmId(ex.exerciseId)}
                          className="ft-btn ft-btn--ghost ft-btn--icon ft-btn--sm !text-red-500 hover:!bg-red-500/10"
                          aria-label={`Remove ${ex.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openExerciseInfo(ex)}
                        className="ft-btn ft-btn--ghost ft-btn--icon ft-btn--sm"
                        aria-label={`Info for ${ex.name}`}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

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
                                  onUnitChange={handleWeightUnitChange}
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
            ))}
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

                  <PinConfirm
                    value={finishPin}
                    onChange={(v) => {
                      setFinishPin(v);
                      setPinError(false);
                    }}
                    error={pinError}
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      className="ft-btn ft-btn--secondary flex-1"
                      onClick={() => {
                        setShowSummary(false);
                        setFinishPin('');
                        setPinError(false);
                      }}
                    >
                      Back
                    </button>
                    <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={handleSaveWorkout}>
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

            {removeConfirmId && removeTarget && (
              <div className="ft-overlay" style={{ zIndex: 75 }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="ft-modal space-y-6"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                      <Trash2 className="h-6 w-6" />
                    </div>
                    <h2 className="ft-title">Remove exercise?</h2>
                    <p className="ft-subtitle mt-2">
                      Remove <strong>{removeTarget.name}</strong> from this session? Logged sets for it will be lost.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button type="button" className="ft-btn ft-btn--secondary ft-btn--block" onClick={() => setRemoveConfirmId(null)}>
                      Keep Exercise
                    </button>
                    <button
                      type="button"
                      className="ft-btn ft-btn--danger ft-btn--block"
                      onClick={() => handleRemoveExercise(removeConfirmId)}
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {infoModal && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setInfoModal(null)}
                  className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="ft-card w-full max-w-lg relative z-10 overflow-hidden"
                >
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden group/hero">
                    {(() => {
                      const heroSrc =
                        getVariationImage(infoModal.exercise.id, infoModal.previewVariation) ??
                        defaultExerciseImageUrl(infoModal.exercise.id);
                      return (
                        <button
                          type="button"
                          className="absolute inset-0 w-full h-full cursor-zoom-in"
                          onClick={() =>
                            setFullImagePreview({
                              src: heroSrc,
                              alt: `${infoModal.exercise.name} — ${infoModal.previewVariation}`,
                            })
                          }
                          aria-label="View full image"
                        >
                          <img
                            src={heroSrc}
                            alt={infoModal.exercise.name}
                            className="w-full h-full object-cover opacity-60 group-hover/hero:opacity-80 transition-opacity"
                          />
                        </button>
                      );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setInfoModal(null)}
                      className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-2xl text-white transition-colors active:scale-90 z-10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-6 left-8 text-left pointer-events-none">
                      <h2 className="ft-title text-3xl font-black text-white mb-2">{infoModal.exercise.name}</h2>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">
                        {infoModal.previewVariation}
                      </p>
                      <div className="flex gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-primary text-white shadow-lg">
                          {infoModal.exercise.difficulty}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-white/20 text-white backdrop-blur-sm">
                          {infoModal.exercise.equipment}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Target Muscle</p>
                        <p className="font-black text-lg">{infoModal.exercise.muscle}</p>
                      </div>
                      {infoModal.exercise.secondary && (
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Secondary</p>
                          <p className="font-black text-lg">{infoModal.exercise.secondary}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="ft-title font-black text-lg flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" />
                        Variation Images
                      </h3>
                      <div className="space-y-2">
                        {getVariationsForExercise(infoModal.exercise.id, infoModal.exercise.variations).map((variation) => {
                          const storedImage = getVariationImage(infoModal.exercise.id, variation);
                          const thumb = storedImage ?? defaultExerciseImageUrl(infoModal.exercise.id);
                          const isActive = infoModal.previewVariation === variation;
                          const urlKey = variationImageKey(infoModal.exercise.id, variation);
                          const urlValue =
                            variationUrlInputs[urlKey] ??
                            (storedImage?.startsWith('http') ? storedImage : '');
                          const hasCustomImage = !!storedImage;
                          return (
                            <div
                              key={variation}
                              className={cn(
                                'rounded-xl border transition-colors overflow-hidden',
                                isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
                              )}
                            >
                              <div className="flex items-center gap-3 p-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFullImagePreview({
                                        src: thumb,
                                        alt: `${infoModal.exercise.name} — ${variation}`,
                                      })
                                    }
                                    className="shrink-0 rounded-lg overflow-hidden border border-border cursor-zoom-in hover:ring-2 hover:ring-primary/40 transition-shadow"
                                    aria-label={`View full image for ${variation}`}
                                  >
                                    <img
                                      src={thumb}
                                      alt={variation}
                                      className="w-14 h-14 object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = defaultExerciseImageUrl(
                                          infoModal.exercise.id
                                        );
                                      }}
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInfoModal((prev) =>
                                        prev ? { ...prev, previewVariation: variation } : prev
                                      )
                                    }
                                    className="text-sm font-semibold truncate text-left hover:text-primary transition-colors"
                                  >
                                    {variation}
                                  </button>
                                </div>
                                {hasCustomImage && (
                                  <button
                                    type="button"
                                    className="ft-btn ft-btn--ghost ft-btn--icon ft-btn--sm !text-red-500 shrink-0"
                                    onClick={() => {
                                      removeVariationImage(infoModal.exercise.id, variation);
                                      setVariationUrlInputs((prev) => {
                                        const next = { ...prev };
                                        delete next[urlKey];
                                        return next;
                                      });
                                    }}
                                    aria-label={`Remove image for ${variation}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>

                              <div className="px-3 pb-3 space-y-2 border-t border-border/60 pt-3">
                                <div className="flex gap-2">
                                  <div className="relative flex-1 min-w-0">
                                    <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <input
                                      type="url"
                                      className="ft-input !h-9 !pl-8 text-xs"
                                      placeholder="Paste image URL (https://...)"
                                      value={urlValue}
                                      onChange={(e) =>
                                        setVariationUrlInputs((prev) => ({
                                          ...prev,
                                          [urlKey]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleVariationImageUrl(infoModal.exercise.id, variation);
                                        }
                                      }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="ft-btn ft-btn--secondary ft-btn--sm shrink-0 !min-h-[36px]"
                                    onClick={() =>
                                      handleVariationImageUrl(infoModal.exercise.id, variation)
                                    }
                                  >
                                    Apply
                                  </button>
                                </div>
                                <label className="ft-btn ft-btn--ghost ft-btn--sm ft-btn--block cursor-pointer !min-h-[36px]">
                                  <Camera className="h-4 w-4" />
                                  Upload from device
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleVariationImageUpload(infoModal.exercise.id, variation, file);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {infoModal.exercise.tips.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="ft-title font-black text-xl flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary" />
                          Execution Intel
                        </h3>
                        <ul className="space-y-4">
                          {infoModal.exercise.tips.map((tip, i) => (
                            <li key={i} className="flex gap-4 text-sm font-medium text-muted-foreground leading-relaxed">
                              <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                                {i + 1}
                              </span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setInfoModal(null)}
                      className="w-full ft-btn ft-btn--primary py-4 text-sm tracking-[0.2em]"
                    >
                      Understood
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {fullImagePreview && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setFullImagePreview(null)}
                  className="absolute inset-0 bg-black/95 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setFullImagePreview(null)}
                    className="self-end p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors"
                    aria-label="Close full image"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <img
                    src={fullImagePreview.src}
                    alt={fullImagePreview.alt}
                    className="max-w-full max-h-[calc(90vh-5rem)] object-contain rounded-xl shadow-2xl"
                  />
                  <p className="text-sm font-medium text-white/80 text-center px-4">{fullImagePreview.alt}</p>
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
