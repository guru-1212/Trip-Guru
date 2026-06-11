'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
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
  Share2,
  Sparkles,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { WorkoutShareCard } from '@/components/workout/WorkoutShareCard';
import { VariationSelector } from '@/components/workout/VariationSelector';
import { SessionSetRow } from '@/components/workout/SessionSetRow';
import { PinConfirm, FINISH_WORKOUT_PIN } from '@/components/workout/PinConfirm';
import { AddExerciseModal, resolveExerciseForWorkout } from '@/components/workout/AddExerciseModal';
import { TodayExercisePicker } from '@/components/workout/TodayExercisePicker';
import { MobilityRoutineModal } from '@/components/workout/MobilityRoutineModal';
import { AIImportModal } from '@/components/workout/AIImportModal';
import { useAIWorkoutImport } from '@/hooks/useAIWorkoutImport';
import type { ImportedExercise } from '@/types/aiImport';
import { useFitTrackCelebration } from '@/components/fittrack/FitTrackCelebrationProvider';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { getHabitStreak } from '@/workout/analytics';
import { SPLIT_DEFINITIONS, SPLIT_NAMES, MUSCLE_COLORS } from '@/workout/constants';
import { getExerciseById } from '@/workout/exerciseLibrary';
import toast from 'react-hot-toast';
import type { CustomExercise, SplitId, TodayExercisePick, WorkoutExercise, WorkoutSet, LibraryExercise, WeightUnit } from '@/workout/types';
import {
  generateId,
  getGreeting,
  getTodayDayKey,
  getTodaysSplit,
  getLastTrainedDate,
  isYesterday,
  getLastExerciseSession,
  isExerciseFullyDone,
  formatLastSessionPreview,
  isPR,
  formatDuration,
  formatCountdownHMS,
  formatWeight,
  displayWeight,
  inputToKg,
  calcWorkoutVolume,
  countCompletedSets,
  suggestWeight,
  groupExercisesByMuscle,
  defaultExerciseImageUrl,
  variationImageKey,
  buildSplitExerciseLibrary,
  partitionExercisesByPick,
  countPickedVariationsDone,
  getDefaultTodayPicks,
  filterExercisesForSave,
  isPickedToday,
  buildWorkoutExercisesInPickOrder,
  pickOrderFromPicks,
  sortExercisesByPickOrder,
  toSubVariationLabel,
  switchActiveVariation,
  patchExerciseSets,
  getPickedVariations,
  getSetsForVariation,
  migrateActiveWorkoutState,
} from '@/workout/utils';
import {
  buildShareCardData,
  exportWorkoutShareCard,
  waitForShareCardPaint,
} from '@/workout/shareCard';
import { cn } from '@/lib/utils';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakeLock';

const SPLIT_ICONS: Record<string, string> = {
  chest: '💪',
  back: '🏋️',
  shoulders: '🎯',
  upper: '⚡',
  legs: '🦵',
  core: '🧘',
  coresh: '⚡',
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
    habits,
    activeWorkout,
    customExercises,
    hydrated,
    startActiveWorkout,
    updateActiveWorkout,
    patchActiveWorkout,
    clearActiveWorkout,
    saveWorkout,
    addVariation,
    getVariationsForExercise,
    splitExtras,
    splitTodayPicks,
    splitSequenceLocked,
    rememberSplitExercise,
    rememberTodayPicks,
    rememberSequenceLocked,
    addCustomExercise,
    updateProfile,
    removeExerciseFromActiveWorkout,
    setVariationImage,
    uploadVariationImageFromFile,
    removeVariationImage,
    getVariationImage,
    splitMobilityPicks,
    rememberMobilityPicks,
    markChecklistItemDone,
    getMobilityImage,
    setMobilityImage,
    uploadMobilityImageFromFile,
    removeMobilityImage,
  } = useWorkoutStore();

  const { celebratePR, celebrateWorkoutComplete, resetPRSession } = useFitTrackCelebration();
  const workoutSessionRef = useRef<number | null>(null);

  const [selectedSplit, setSelectedSplit] = useState<SplitId | null>(null);
  const [todayPicks, setTodayPicks] = useState<TodayExercisePick[]>([]);
  const [pickerExercises, setPickerExercises] = useState<LibraryExercise[]>([]);
  const pickInitSplitRef = useRef<SplitId | null>(null);
  const todayPicksRef = useRef<TodayExercisePick[]>([]);
  const picksPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiImportPresetsRef = useRef<Map<string, ImportedExercise>>(new Map());
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showWarmupGate, setShowWarmupGate] = useState(false);
  const [showCooldownGate, setShowCooldownGate] = useState(false);
  const [showSharePicks, setShowSharePicks] = useState(false);
  const [shareMode, setShareMode] = useState<'today' | 'overall'>('today');
  const [copied, setCopied] = useState(false);
  const [finishPin, setFinishPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [workoutDate, setWorkoutDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removePin, setRemovePin] = useState('');
  const [removePinError, setRemovePinError] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const restDuration = activeWorkout?.restTimerSeconds ?? profile.prefs.restTimer;
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
      await uploadVariationImageFromFile(exerciseId, variation, file);
      setVariationUrlInputs((prev) => ({ ...prev, [variationImageKey(exerciseId, variation)]: '' }));
    } catch {
      toast.error('Could not process image. Try a smaller file or use an image URL.');
    }
  };

  const todayShareText = useMemo(() => {
    if (!selectedSplit) return '';
    const split = SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit);
    if (!split) return '';

    let text = `${split.name} - Today's Picks\n`;
    text += `--------------------------------\n`;

    todayPicks.forEach((pick, idx) => {
      const info = resolveExerciseInfo(pick.exerciseId, customExercises);
      if (info) {
        text += `${idx + 1}) ${info.name}\n`;
        text += `   ${toSubVariationLabel(0)}) ${pick.variation}\n`;
      }
    });

    text += `\nShared via Athlete OS`;
    return text;
  }, [selectedSplit, todayPicks, customExercises]);

  const overallShareText = useMemo(() => {
    if (!selectedSplit) return '';
    const split = SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit);
    if (!split) return '';

    let text = `${split.name} - Full Protocol\n`;
    text += `--------------------------------\n`;

    pickerExercises.forEach((ex, idx) => {
      text += `${idx + 1}) ${ex.name}\n`;
      ex.variations.forEach((v, vIdx) => {
        text += `   ${toSubVariationLabel(vIdx)}) ${v}\n`;
      });
    });

    text += `\nShared via Athlete OS`;
    return text;
  }, [selectedSplit, pickerExercises]);

  const shareText = shareMode === 'today' ? todayShareText : overallShareText;

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
    }
  }, [activeWorkout]);

  useEffect(() => {
    if (activeWorkout?.startedAt && activeWorkout.startedAt !== workoutSessionRef.current) {
      resetPRSession();
      workoutSessionRef.current = activeWorkout.startedAt;
    }
    if (!activeWorkout) {
      workoutSessionRef.current = null;
    }
  }, [activeWorkout?.startedAt, activeWorkout, resetPRSession]);

  useEffect(() => {
    if (!activeWorkout) return;
    const needsMigration = activeWorkout.exercises.some((ex) => !ex.setsByVariation);
    if (!needsMigration) return;
    const migrated = migrateActiveWorkoutState(activeWorkout, profile.prefs.defaultSets);
    updateActiveWorkout(migrated);
  }, [activeWorkout, profile.prefs.defaultSets, updateActiveWorkout]);

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

  const sequenceLocked = selectedSplit ? !!splitSequenceLocked[selectedSplit] : false;

  todayPicksRef.current = todayPicks;

  const flushTodayPicks = useCallback(
    (splitId: SplitId, picks: TodayExercisePick[]) => {
      rememberTodayPicks(splitId, picks);
    },
    [rememberTodayPicks]
  );

  const handlePicksChange = useCallback(
    (picks: TodayExercisePick[]) => {
      setTodayPicks(picks);
      if (!selectedSplit) return;
      if (picksPersistTimerRef.current) clearTimeout(picksPersistTimerRef.current);
      picksPersistTimerRef.current = setTimeout(() => {
        flushTodayPicks(selectedSplit, picks);
      }, 400);
    },
    [selectedSplit, flushTodayPicks]
  );

  const handleAIImportSuccess = useCallback(
    (picks: TodayExercisePick[], presets: ImportedExercise[]) => {
      if (picksPersistTimerRef.current) {
        clearTimeout(picksPersistTimerRef.current);
        picksPersistTimerRef.current = null;
      }
      setTodayPicks(picks);
      const presetMap = new Map<string, ImportedExercise>();
      picks.forEach((pick, index) => {
        const preset = presets[index];
        if (preset) presetMap.set(pick.exerciseId, preset);
      });
      aiImportPresetsRef.current = presetMap;
    },
    []
  );

  const aiImport = useAIWorkoutImport({
    splitId: selectedSplit,
    onImportSuccess: handleAIImportSuccess,
  });

  const handleRepeatLastWorkout = useCallback(() => {
    if (!selectedSplit) return;
    const lastSession = workouts.find((w) => w.splitId === selectedSplit);
    if (!lastSession) {
      toast.error('No previous workout found for this split');
      return;
    }
    const picks: TodayExercisePick[] = lastSession.exercises.map((e) => ({
      id: generateId(),
      exerciseId: e.exerciseId,
      variation: e.variation,
    }));
    handlePicksChange(picks);
    toast.success('Restored last workout picks and sequence');
  }, [selectedSplit, workouts, handlePicksChange]);

  const handleSequenceLockedChange = useCallback(
    (locked: boolean) => {
      if (!selectedSplit) return;
      if (picksPersistTimerRef.current) {
        clearTimeout(picksPersistTimerRef.current);
        picksPersistTimerRef.current = null;
      }
      flushTodayPicks(selectedSplit, todayPicksRef.current);
      rememberSequenceLocked(selectedSplit, locked);
    },
    [selectedSplit, flushTodayPicks, rememberSequenceLocked]
  );

  useEffect(() => {
    return () => {
      if (picksPersistTimerRef.current) clearTimeout(picksPersistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedSplit) return;
    const remote = splitTodayPicks[selectedSplit];
    if (!sequenceLocked || !remote?.length) return;
    setTodayPicks((local) => (JSON.stringify(local) === JSON.stringify(remote) ? local : remote));
  }, [selectedSplit, splitTodayPicks, sequenceLocked]);

  const splitExerciseLibrary = useMemo(() => {
    if (!selectedSplit) return [];
    return buildSplitExerciseLibrary(selectedSplit, customExercises, splitExtras);
  }, [selectedSplit, customExercises, splitExtras]);

  useEffect(() => {
    if (!selectedSplit) {
      setTodayPicks([]);
      setPickerExercises([]);
      pickInitSplitRef.current = null;
      return;
    }
    if (pickInitSplitRef.current === selectedSplit) return;
    pickInitSplitRef.current = selectedSplit;

    const byId = new Map(splitExerciseLibrary.map((e) => [e.id, e]));
    const extraIds = new Set<string>();
    const saved = splitTodayPicks[selectedSplit];
    if (saved?.length) {
      for (const item of saved) {
        const id = typeof item === 'string' ? item : item.exerciseId;
        if (!byId.has(id)) extraIds.add(id);
      }
    }
    const lastSession = workouts.find((w) => w.splitId === selectedSplit);
    if (lastSession) {
      for (const ex of lastSession.exercises) {
        if (!byId.has(ex.exerciseId)) extraIds.add(ex.exerciseId);
      }
    }
    const extras: LibraryExercise[] = [];
    for (const id of Array.from(extraIds)) {
      const lib = getExerciseById(id);
      if (lib) {
        extras.push(lib);
        continue;
      }
      const custom = customExercises.find((c) => c.id === id);
      if (custom) {
        extras.push({
          id: custom.id,
          name: custom.name,
          muscle: custom.muscle,
          secondary: custom.secondary,
          equipment: custom.equipment,
          difficulty: custom.difficulty,
          variations: custom.variations,
          tips: custom.notes ? [custom.notes] : [],
          splitIds: [selectedSplit],
          category: [custom.muscle],
        });
      }
    }
    const pickerList = [...splitExerciseLibrary, ...extras.filter((e) => !byId.has(e.id))];
    setPickerExercises(pickerList);
    const defaults = getDefaultTodayPicks(selectedSplit, workouts, splitTodayPicks, pickerList);
    setTodayPicks(defaults);
  }, [selectedSplit, splitExerciseLibrary, workouts, splitTodayPicks, customExercises]);

  const beginWorkout = useCallback(() => {
    if (!selectedSplit || todayPicks.length === 0) return;
    const split = SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit)!;
    const baseLibrary = buildSplitExerciseLibrary(selectedSplit, customExercises, splitExtras);
    const baseIds = new Set(baseLibrary.map((e) => e.id));
    const extraFromPicker = pickerExercises.filter((e) => !baseIds.has(e.id));
    const allExercises = [...baseLibrary, ...extraFromPicker];
    const pickOrder = pickOrderFromPicks(todayPicks);
    let exercises = buildWorkoutExercisesInPickOrder(
      allExercises,
      todayPicks,
      profile.prefs.defaultSets
    ).filter(isPickedToday);

    if (aiImportPresetsRef.current.size > 0) {
      exercises = exercises.map((ex) => {
        const preset = aiImportPresetsRef.current.get(ex.exerciseId);
        if (!preset) return ex;
        const repsNum = parseInt(preset.reps, 10) || 0;
        const sets: WorkoutSet[] = Array.from({ length: preset.sets }, () => ({
          weight: preset.weight,
          reps: repsNum,
          done: false,
        }));
        return {
          ...ex,
          notes: preset.notes ?? ex.notes,
          sets,
          setsByVariation: { [ex.variation]: sets },
        };
      });
      aiImportPresetsRef.current = new Map();
    }

    rememberTodayPicks(selectedSplit, todayPicks);
    const state = {
      splitId: selectedSplit,
      splitName: split.name,
      startedAt: Date.now(),
      exercises,
      restTimerSeconds: profile.prefs.restTimer,
      restTimerEnd: null,
      addedExerciseIds: [],
      pickOrder,
    };
    startActiveWorkout(state);
    requestWakeLock();
    setExpandedEx(pickOrder[0] ?? exercises[0]?.exerciseId ?? null);
  }, [
    selectedSplit,
    todayPicks,
    pickerExercises,
    profile.prefs.defaultSets,
    profile.prefs.restTimer,
    customExercises,
    splitExtras,
    startActiveWorkout,
    rememberTodayPicks,
  ]);

  const handlePickerCreateCustom = useCallback(
    (data: Omit<CustomExercise, 'id'>, remember: boolean) => {
      const created = addCustomExercise(data);
      if (remember && selectedSplit) rememberSplitExercise(selectedSplit, created.id);
      return created;
    },
    [addCustomExercise, rememberSplitExercise, selectedSplit]
  );

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
        exercises: [...activeWorkout.exercises, { ...item, pickedToday: true }],
        addedExerciseIds: [...(activeWorkout.addedExerciseIds ?? []), exerciseId],
        pickOrder: [...(activeWorkout.pickOrder ?? []), exerciseId],
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

  const updateExercise = (exerciseId: string, variation: string, updater: (ex: WorkoutExercise) => WorkoutExercise) => {
    patchActiveWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.exerciseId === exerciseId && ex.variation === variation ? updater(ex) : ex
      ),
    }));
  };

  const togglePickedToday = (exerciseId: string, variation: string) => {
    patchActiveWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.exerciseId === exerciseId && ex.variation === variation ? { ...ex, pickedToday: !isPickedToday(ex) } : ex
      ),
    }));
  };

  const startTimer = () => {
    patchActiveWorkout((prev) => ({
      ...prev,
      restTimerEnd: Date.now() + restDuration * 1000,
    }));
  };

  const toggleSetDone = (exerciseId: string, variation: string, setIdx: number) => {
    if (activeWorkout) {
      const ex = activeWorkout.exercises.find(
        (e) => e.exerciseId === exerciseId && e.variation === variation
      );
      if (ex) {
        const set = ex.sets[setIdx];
        if (!set.done && set.weight > 0 && set.reps > 0 && isPR(exerciseId, set.weight, prs)) {
          const lib = getExerciseById(exerciseId);
          celebratePR({
            exerciseId,
            exerciseName: lib?.name ?? ex.variation,
            variation: ex.variation,
            weight: set.weight,
            reps: set.reps,
            unit: profile.prefs.unit,
            previousWeight: prs[exerciseId]?.weight,
          });
        }
      }
    }

    patchActiveWorkout((prev) => {
      let startedRest = false;
      const exercises = prev.exercises.map((ex) => {
        if (ex.exerciseId !== exerciseId || ex.variation !== variation) return ex;
        const sets = [...ex.sets];
        const wasDone = sets[setIdx].done;
        sets[setIdx] = { ...sets[setIdx], done: !wasDone };
        if (!wasDone && sets[setIdx].done) startedRest = true;
        return patchExerciseSets(ex, sets);
      });
      return {
        ...prev,
        exercises,
        restTimerEnd: startedRest ? Date.now() + restDuration * 1000 : prev.restTimerEnd,
      };
    });
  };

  const updateSet = (exerciseId: string, variation: string, setIdx: number, field: keyof WorkoutSet, value: number | boolean) => {
    updateExercise(exerciseId, variation, (ex) => {
      const sets = [...ex.sets];
      if (field === 'weight') {
        sets[setIdx] = { ...sets[setIdx], weight: inputToKg(value as number, profile.prefs.unit) };
      } else {
        sets[setIdx] = { ...sets[setIdx], [field]: value };
      }
      return patchExerciseSets(ex, sets);
    });
  };

  const addSet = (exerciseId: string, variation: string) => {
    updateExercise(exerciseId, variation, (ex) => {
      const last = ex.sets[ex.sets.length - 1];
      const sets = [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false }];
      return patchExerciseSets(ex, sets);
    });
  };

  const removeSet = (exerciseId: string, variation: string, setIdx: number) => {
    updateExercise(exerciseId, variation, (ex) => patchExerciseSets(ex, ex.sets.filter((_, i) => i !== setIdx)));
  };

  const finishWorkout = () => {
    setFinishPin('');
    setPinError(false);
    setShowCooldownGate(true);
  };

  const handleWarmupComplete = useCallback(
    (variationPicks: Record<string, string>) => {
      if (!selectedSplit) return;
      rememberMobilityPicks(selectedSplit, variationPicks);
      markChecklistItemDone('pre-warmup');
      setShowWarmupGate(false);
      beginWorkout();
    },
    [selectedSplit, rememberMobilityPicks, markChecklistItemDone, beginWorkout]
  );

  const handleCooldownComplete = useCallback(
    (variationPicks: Record<string, string>) => {
      if (!activeWorkout) return;
      rememberMobilityPicks(activeWorkout.splitId, variationPicks);
      markChecklistItemDone('post-cooldown');
      setShowCooldownGate(false);
      setShowSummary(true);
    },
    [activeWorkout, rememberMobilityPicks, markChecklistItemDone]
  );

  const openWarmupGate = useCallback(() => {
    if (!selectedSplit || todayPicks.length === 0) return;
    setShowWarmupGate(true);
  }, [selectedSplit, todayPicks.length]);

  const discardWorkout = () => {
    clearActiveWorkout();
    releaseWakeLock();
    setShowCancelDialog(false);
    router.push('/fittrack/dashboard');
  };

  const confirmFinish = () => {
    if (!activeWorkout) return;
    const exercisesToSave = filterExercisesForSave(activeWorkout.exercises);
    const isFirstWorkoutToday = !habits[workoutDate]?.workout;
    const prCount = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    ).length;
    const splitName = activeWorkout.splitName;
    const duration = elapsed;
    const sets = countCompletedSets(exercisesToSave);
    const volume = calcWorkoutVolume(exercisesToSave);

    saveWorkout({
      date: workoutDate,
      splitId: activeWorkout.splitId,
      splitName: activeWorkout.splitName,
      duration: elapsed,
      exercises: exercisesToSave,
      totalSets: sets,
      totalVolume: volume,
    });
    clearActiveWorkout();
    releaseWakeLock();
    setShowSummary(false);
    setFinishPin('');
    setPinError(false);

    celebrateWorkoutComplete({
      splitName,
      duration,
      sets,
      volume,
      unit: profile.prefs.unit,
      prCount,
      isFirstWorkoutToday,
      workoutStreak: isFirstWorkoutToday ? getHabitStreak(habits, 'workout') + 1 : undefined,
      onDismiss: () => router.push('/fittrack/progress'),
    });
  };

  const handleSaveWorkout = () => {
    if (finishPin !== FINISH_WORKOUT_PIN) {
      setPinError(true);
      return;
    }
    confirmFinish();
  };

  const handleRemoveExercise = (cardKey: string) => {
    if (removePin !== FINISH_WORKOUT_PIN) {
      setRemovePinError(true);
      return;
    }
    const [exerciseId, variation] = cardKey.split('::');
    removeExerciseFromActiveWorkout(exerciseId, variation);
    if (expandedEx === cardKey) setExpandedEx(null);
    setRemoveConfirmId(null);
    setRemovePin('');
    setRemovePinError(false);
    toast.success('Exercise removed from session');
  };

  const closeRemoveConfirm = () => {
    setRemoveConfirmId(null);
    setRemovePin('');
    setRemovePinError(false);
  };

  if (!hydrated) return <div className="ft-loading"><Dumbbell className="h-8 w-8 text-primary animate-pulse" /><span>Loading workout...</span></div>;

  // Step 2: Active Workout
  if (activeWorkout) {
    const completedExercises = activeWorkout.exercises.filter((e) => e.sets.some((s) => s.done)).length;
    const prsBroken = activeWorkout.exercises.filter((ex) =>
      ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
    );

    const shareCardData = showSummary
      ? buildShareCardData({
          splitId: activeWorkout.splitId,
          splitName: activeWorkout.splitName,
          date: workoutDate,
          durationSeconds: elapsed,
          exercises: activeWorkout.exercises,
          profile,
          workouts,
          prs,
        })
      : null;

    const handleDownloadStory = async () => {
      if (!shareCardData || !shareCardRef.current) return;
      setSharingStory(true);
      try {
        await waitForShareCardPaint();
        const result = await exportWorkoutShareCard(shareCardRef.current, shareCardData);
        toast.success(
          result === 'shared' ? 'Story shared' : 'Story image downloaded'
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err);
          toast.error('Could not create share image');
        }
      } finally {
        setSharingStory(false);
      }
    };

    const { picked: pickedExercises, unpicked: unpickedExercises } = partitionExercisesByPick(
      activeWorkout.exercises
    );
    const pickOrder =
      activeWorkout.pickOrder ??
      pickedExercises.filter(isPickedToday).map((e) => `${e.exerciseId}::${e.variation}`);
    const pickedSorted = sortExercisesByPickOrder(pickedExercises, pickOrder);
    const unpickedGroups = groupExercisesByMuscle(unpickedExercises, activeWorkout.splitId);
    const { done: pickedDone, total: pickedTotal } = countPickedVariationsDone(activeWorkout.exercises);
    const addedExerciseIds = activeWorkout.addedExerciseIds ?? [];
    const removeTarget = removeConfirmId
      ? activeWorkout.exercises.find((e) => e.exerciseId === removeConfirmId)
      : null;

    const renderExerciseCard = (ex: WorkoutExercise, sequenceIndex?: number) => {
      const cardKey = `${ex.exerciseId}::${ex.variation}`;
      const isExpanded = expandedEx === cardKey;
      const isFullyDone = isExerciseFullyDone(ex);
      const picked = isPickedToday(ex);
      const activeSets = ex.sets;
      const hasPR = activeSets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));
      const setsCompleted = activeSets.filter((s) => s.done).length;
      const progress = (setsCompleted / Math.max(activeSets.length, 1)) * 100;
      const isRemovable = addedExerciseIds.includes(ex.exerciseId);
      const lastSession = getLastExerciseSession(workouts, ex.exerciseId, ex.variation);

      return (
        <motion.div
          key={cardKey}
          layout
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        >
          <div
            className={cn(
              'ft-exercise-card',
              isExpanded && 'ft-exercise-card--open',
              !picked && 'ft-exercise-card--skipped',
              picked && isFullyDone && 'ft-exercise-card--complete',
              picked && !isFullyDone && 'ft-exercise-card--picked-incomplete'
            )}
          >
            <div className="ft-exercise-progress">
              <div
                className={cn(
                  'ft-exercise-progress-fill',
                  isFullyDone && 'ft-exercise-progress-fill--complete'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="ft-exercise-trigger">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePickedToday(ex.exerciseId, ex.variation);
                }}
                className={cn('ft-pick-toggle shrink-0', picked && 'ft-pick-toggle--on')}
                aria-label={picked ? `Remove ${ex.name} from today` : `Add ${ex.name} to today`}
              >
                <span className="ft-pick-toggle-box" aria-hidden>
                  {picked && <Check className="h-3 w-3" />}
                </span>
              </button>
              <button
                type="button"
                className="flex flex-1 items-center gap-3 min-w-0 text-left bg-transparent border-0 cursor-pointer p-0"
                onClick={() => setExpandedEx(isExpanded ? null : cardKey)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    picked && isFullyDone && 'bg-emerald-600 text-white',
                    picked && !isFullyDone && 'bg-red-600 text-white',
                    !picked && 'bg-muted text-muted-foreground',
                    picked && !isFullyDone && isExpanded && 'ring-2 ring-red-400/50'
                  )}
                >
                  {picked && isFullyDone ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : picked ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Dumbbell className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {sequenceIndex !== undefined && (
                      <span className="text-[10px] font-black tabular-nums text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                        #{sequenceIndex}
                      </span>
                    )}
                    <span className="font-semibold text-base truncate">{ex.name}</span>
                    {sequenceIndex !== undefined && (
                      <span
                        className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                        style={{
                          backgroundColor: `${MUSCLE_COLORS[ex.muscle] ?? 'hsl(var(--primary))'}20`,
                          color: MUSCLE_COLORS[ex.muscle] ?? 'hsl(var(--primary))',
                        }}
                      >
                        {ex.muscle}
                      </span>
                    )}
                    {isFullyDone && <span className="ft-exercise-done-badge">Done</span>}
                    {hasPR && <Trophy className="h-4 w-4 text-amber-500 shrink-0" />}
                  </div>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      isFullyDone ? 'text-emerald-800 font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {isFullyDone
                      ? 'All sets completed'
                      : `${ex.variation} · ${setsCompleted} of ${activeSets.length} sets done`}
                  </p>
                  {lastSession && (
                    <p className="ft-last-session-preview mt-1 truncate">
                      Last · {dayjs(lastSession.date).format('MMM D')} ·{' '}
                      {formatLastSessionPreview(lastSession, profile.prefs.unit)}
                    </p>
                  )}
                </div>
                <ChevronRight
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform shrink-0',
                    isExpanded && 'rotate-90 text-primary'
                  )}
                />
              </button>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {isRemovable && (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveConfirmId(ex.exerciseId);
                      setRemovePin('');
                      setRemovePinError(false);
                    }}
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
                  {lastSession ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Last session · {lastSession.variation} ·{' '}
                          {dayjs(lastSession.date).format('MMM D, YYYY')}
                        </p>
                        <ul className="ft-last-session-list">
                          {lastSession.sets.map((set, setIdx) => (
                            <li key={setIdx}>
                              Set {setIdx + 1}: {formatWeight(set.weight, profile.prefs.unit)} ×{' '}
                              {set.reps}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="ft-stat-pill">
                        <div className="ft-stat-pill-icon bg-primary/15 text-primary">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Suggested</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {formatWeight(
                              suggestWeight(
                                lastSession.bestSet.weight,
                                lastSession.bestSet.reps,
                                profile.prefs.unit
                              ),
                              profile.prefs.unit
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-3">
                      No previous session for{' '}
                      <span className="font-medium text-foreground">{ex.variation}</span>. Log today&apos;s
                      sets to track progress next time.
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="ft-section-title">
                        Sets · <span className="text-foreground">{ex.variation}</span>
                      </p>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {setsCompleted} / {activeSets.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeSets.map((set, idx) => (
                        <motion.div key={idx} layout>
                          <SessionSetRow
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
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => addSet(ex.exerciseId, ex.variation)}
                      className="ft-btn ft-btn--ghost ft-btn--block"
                    >
                      <Plus className="h-4 w-4" />
                      Add Set
                    </button>
                    <button type="button" onClick={startTimer} className="ft-btn ft-btn--ghost ft-btn--block">
                      <Timer className="h-4 w-4" />
                      Rest
                    </button>
                  </div>

                  <div>
                    <label className="ft-label">
                      Notes <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      className="ft-textarea resize-none"
                      value={ex.notes ?? ''}
                      onChange={(e) =>
                        updateExercise(ex.exerciseId, ex.variation, (exer) => ({ ...exer, notes: e.target.value }))
                      }
                      placeholder="RPE, form cues, how it felt..."
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      );
    };


    const renderMuscleGroups = (
      groups: { muscle: string; exercises: WorkoutExercise[] }[],
      keyPrefix: string
    ) =>
      groups.map(({ muscle, exercises }) => (
        <div key={`${keyPrefix}-${muscle}`} className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-1 h-5 rounded-full shrink-0"
              style={{ backgroundColor: MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))' }}
            />
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">{muscle}</h2>
          </div>
          <LayoutGroup>{exercises.map((ex) => renderExerciseCard(ex))}</LayoutGroup>
        </div>
      ));

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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm font-semibold tabular-nums mt-0.5">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Timer className="h-3.5 w-3.5" />
                      {formatCountdownHMS(elapsed)}
                    </span>
                    {pickedTotal > 0 && (
                      <span className="text-muted-foreground text-xs">
                        {pickedDone} of {pickedTotal} variations done
                      </span>
                    )}
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

          {/* Exercises */}
          <div className="space-y-6">
            <div className="ft-last-session-legend">
              <span className="ft-last-session-legend-item">
                <span className="ft-pick-status-dot ft-pick-status-dot--red" />
                Picked for today, still in progress
              </span>
              <span className="ft-last-session-legend-item">
                <span className="ft-pick-status-dot ft-pick-status-dot--green" />
                Picked for today, all sets finished
              </span>
              <span className="ft-last-session-legend-item">
                <span className="ft-pick-status-dot ft-pick-status-dot--gray" />
                Not doing today (dimmed at bottom)
              </span>
            </div>
            <div className="space-y-4">
              <LayoutGroup>
                {pickedSorted.map((ex, index) => renderExerciseCard(ex, index + 1))}
              </LayoutGroup>
            </div>
            {unpickedGroups.length > 0 && (
              <>
                <div className="ft-skipped-divider">
                  <span>Not doing today</span>
                </div>
                {renderMuscleGroups(unpickedGroups, 'skipped')}
              </>
            )}
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
            {showCooldownGate && activeWorkout && (
              <MobilityRoutineModal
                mode="stretch"
                splitId={activeWorkout.splitId}
                splitName={activeWorkout.splitName}
                savedPicks={splitMobilityPicks[activeWorkout.splitId]}
                getMobilityImage={getMobilityImage}
                setMobilityImage={setMobilityImage}
                uploadMobilityImageFromFile={uploadMobilityImageFromFile}
                removeMobilityImage={removeMobilityImage}
                onComplete={handleCooldownComplete}
                onSkip={() => {
                  setShowCooldownGate(false);
                  setShowSummary(true);
                }}
                onClose={() => setShowCooldownGate(false)}
              />
            )}
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

                  <button
                    type="button"
                    className="ft-btn ft-btn--secondary ft-btn--block"
                    disabled={sharingStory}
                    onClick={handleDownloadStory}
                  >
                    <Share2 className="h-4 w-4" />
                    {sharingStory ? 'Creating story…' : 'Download story'}
                  </button>

                  {shareCardData && <WorkoutShareCard ref={shareCardRef} data={shareCardData} />}

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
                  <PinConfirm
                    value={removePin}
                    onChange={(v) => {
                      setRemovePin(v);
                      setRemovePinError(false);
                    }}
                    error={removePinError}
                    label="Enter password to remove"
                  />
                  <div className="flex flex-col gap-3">
                    <button type="button" className="ft-btn ft-btn--secondary ft-btn--block" onClick={closeRemoveConfirm}>
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
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-primary text-primary-foreground shadow-lg mb-2">
                        <Target className="h-3 w-3" />
                        {infoModal.previewVariation}
                      </span>
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
                                'rounded-xl border-2 transition-all overflow-hidden',
                                isActive
                                  ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md shadow-primary/15'
                                  : 'border-border bg-muted/20 opacity-70'
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
                                    className={cn(
                                      'shrink-0 rounded-lg overflow-hidden border-2 cursor-zoom-in transition-shadow',
                                      isActive
                                        ? 'border-primary ring-2 ring-primary/30'
                                        : 'border-border hover:ring-2 hover:ring-primary/40'
                                    )}
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
                                    className={cn(
                                      'text-sm truncate text-left transition-colors',
                                      isActive
                                        ? 'font-black text-primary'
                                        : 'font-semibold hover:text-primary'
                                    )}
                                  >
                                    {variation}
                                  </button>
                                  {isActive && (
                                    <span className="shrink-0 ft-badge ft-badge--primary text-[10px] uppercase tracking-wider">
                                      Active
                                    </span>
                                  )}
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

  const startButtonLabel =
    selectedSplit === todaySplit && todaySplit !== 'rest'
      ? `Start ${SPLIT_NAMES[todaySplit]}`
      : 'Start Workout';

  // Step 1: Split Selection
  return (
    <PageTransition>
      <div className={cn('space-y-6', selectedSplit && 'pb-28')}>
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

        {selectedSplit && pickerExercises.length > 0 && (
          <TodayExercisePicker
            splitId={selectedSplit}
            exercises={pickerExercises}
            picks={todayPicks}
            onPicksChange={handlePicksChange}
            onExercisesChange={setPickerExercises}
            getVariationsForExercise={getVariationsForExercise}
            onAddVariation={addVariation}
            customExercises={customExercises}
            onCreateCustomExercise={handlePickerCreateCustom}
            onRememberSplitExercise={
              selectedSplit ? (id) => rememberSplitExercise(selectedSplit, id) : undefined
            }
            getVariationImage={getVariationImage}
            sequenceLocked={sequenceLocked}
            onSequenceLockedChange={handleSequenceLockedChange}
            onRepeatLastWorkout={handleRepeatLastWorkout}
            hasLastWorkout={!!workouts.find((w) => w.splitId === selectedSplit)}
          />
        )}

        <div className="ft-split-grid">
          {SPLIT_DEFINITIONS.map((split) => {
            const last = getLastTrainedDate(workouts, split.id);
            const selected = selectedSplit === split.id;
            const isTodayPlan = todaySplit === split.id;
            return (
              <div
                key={split.id}
                className={cn(
                  'ft-split-card',
                  selected && 'ft-split-card--selected',
                  isTodayPlan && 'ft-split-card--today'
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedSplit(split.id)}
                  className="w-full text-left bg-transparent border-0 cursor-pointer p-0"
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
                {selected && (
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShareMode(todayPicks.length > 0 ? 'today' : 'overall');
                        setShowSharePicks(true);
                      }}
                      className="ft-btn ft-btn--secondary !px-4"
                      title="Share Protocol"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={openWarmupGate}
                      disabled={todayPicks.length === 0}
                      className="ft-btn ft-btn--primary flex-1 ft-btn--lg"
                    >
                      {startButtonLabel}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedSplit && (
          <div className="ft-action-bar flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShareMode(todayPicks.length > 0 ? 'today' : 'overall');
                setShowSharePicks(true);
              }}
              className="ft-btn ft-btn--secondary ft-btn--lg !px-5"
              title="Share Protocol"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={aiImport.openModal}
              className="ft-btn ft-btn--secondary ft-btn--lg !px-5"
              title="AI Import Workout"
              aria-label="AI Import Workout"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={openWarmupGate}
              disabled={todayPicks.length === 0}
              className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg flex-1"
            >
              {startButtonLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <AIImportModal
          open={aiImport.modalOpen}
          step={aiImport.step}
          progressValue={aiImport.progressValue}
          pastedText={aiImport.pastedText}
          matchedExercises={aiImport.matchedExercises}
          errorMessage={aiImport.errorMessage}
          weightUnit={profile.prefs.unit}
          onPastedTextChange={aiImport.setPastedText}
          onClose={aiImport.closeModal}
          onCopyPrompt={aiImport.copyPrompt}
          onProcess={aiImport.processPastedWorkout}
          onBack={aiImport.goBackToPaste}
          onConfirm={aiImport.confirmImport}
        />

        <AnimatePresence>
          {showWarmupGate && selectedSplit && (
            <MobilityRoutineModal
              mode="warmup"
              splitId={selectedSplit}
              splitName={SPLIT_DEFINITIONS.find((s) => s.id === selectedSplit)?.name ?? ''}
              savedPicks={splitMobilityPicks[selectedSplit]}
              getMobilityImage={getMobilityImage}
              setMobilityImage={setMobilityImage}
              uploadMobilityImageFromFile={uploadMobilityImageFromFile}
              removeMobilityImage={removeMobilityImage}
              onComplete={handleWarmupComplete}
              onSkip={() => {
                setShowWarmupGate(false);
                beginWorkout();
              }}
              onClose={() => setShowWarmupGate(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSharePicks && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-lg bg-background rounded-t-[2rem] sm:rounded-[2rem] border border-border shadow-2xl overflow-hidden"
              >
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Share2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight">Share Protocol</h3>
                        <p className="text-xs text-muted-foreground font-medium">Verification text for your trainer</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSharePicks(false);
                        setCopied(false);
                      }}
                      className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex p-1 bg-muted/50 rounded-xl mb-6">
                    <button
                      onClick={() => {
                        setShareMode('today');
                        setCopied(false);
                      }}
                      disabled={todayPicks.length === 0}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                        shareMode === 'today' 
                          ? "bg-background shadow-sm text-primary" 
                          : "text-muted-foreground hover:text-foreground",
                        todayPicks.length === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      Today's Picks
                    </button>
                    <button
                      onClick={() => {
                        setShareMode('overall');
                        setCopied(false);
                      }}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                        shareMode === 'overall' 
                          ? "bg-background shadow-sm text-primary" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Overall Workout
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={shareText}
                      className="w-full h-48 p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium font-mono leading-relaxed resize-none focus:outline-none"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(shareText);
                        setCopied(true);
                        toast.success('Protocol copied to clipboard');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={cn(
                        "ft-btn ft-btn--primary flex-1 h-14 rounded-2xl transition-all duration-300",
                        copied && "bg-emerald-600 hover:bg-emerald-600"
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="h-5 w-5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="h-5 w-5" />
                          <span>Copy Protocol</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
