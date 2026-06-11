'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_NAMES } from '@/workout/constants';
import {
  buildAIPrompt,
  clampImportedWeight,
  formatAthleteProfile,
  formatExerciseCatalog,
  formatLastWorkoutBlock,
  formatPRsForSplit,
  formatTrainingHistoryBlock,
  getTargetMuscles,
  normalizeImportedReps,
} from '@/workout/aiImportPrompt';
import { buildSplitExerciseLibrary, generateId, inputToKg } from '@/workout/utils';
import type { ImportedExercise, MatchResult, AIImportStep } from '@/types/aiImport';
import type { LibraryExercise, SplitId, TodayExercisePick } from '@/workout/types';

const PROCESSING_DURATION_MS = 1500;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

function matchExerciseByName(
  name: string,
  library: LibraryExercise[]
): LibraryExercise | undefined {
  const normalized = name.trim().toLowerCase();
  return library.find((e) => e.name.trim().toLowerCase() === normalized);
}

function parseImportedExercises(raw: unknown): ImportedExercise[] {
  if (!Array.isArray(raw)) {
    throw new Error('invalid');
  }
  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('invalid');
    const row = item as Record<string, unknown>;
    if (typeof row.exerciseName !== 'string' || !row.exerciseName.trim()) {
      throw new Error('invalid');
    }
    const sets = Number(row.sets);
    if (!Number.isFinite(sets) || sets < 1) throw new Error('invalid');
    const reps = normalizeImportedReps(String(row.reps ?? ''));
    if (!reps) throw new Error('invalid');
    const weight = Number(row.weight);
    if (!Number.isFinite(weight) || weight < 0) throw new Error('invalid');
    return {
      exerciseName: row.exerciseName.trim(),
      sets: Math.round(sets),
      reps,
      weight,
      notes: typeof row.notes === 'string' ? row.notes : undefined,
    };
  });
}

function matchImportedExercises(
  parsed: ImportedExercise[],
  library: LibraryExercise[]
): MatchResult[] {
  return parsed.map((imported) => {
    const libraryExercise = matchExerciseByName(imported.exerciseName, library);
    if (!libraryExercise) {
      return {
        imported,
        matched: false,
        warning: `⚠ '${imported.exerciseName}' not found in your library — skipped`,
      };
    }
    return { imported, matched: true, libraryExercise };
  });
}

export interface UseAIWorkoutImportOptions {
  splitId: SplitId | null;
  onImportSuccess: (picks: TodayExercisePick[], presets: ImportedExercise[]) => void;
}

export function useAIWorkoutImport({ splitId, onImportSuccess }: UseAIWorkoutImportOptions) {
  const {
    profile,
    workouts,
    bodyStats,
    prs,
    customExercises,
    splitExtras,
    rememberTodayPicks,
  } = useWorkoutStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<AIImportStep>('paste');
  const [progressValue, setProgressValue] = useState(0);
  const [pastedText, setPastedText] = useState('');
  const [parsedExercises, setParsedExercises] = useState<ImportedExercise[]>([]);
  const [matchedExercises, setMatchedExercises] = useState<MatchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exerciseLibrary = useMemo(() => {
    if (!splitId) return [];
    return buildSplitExerciseLibrary(splitId, customExercises, splitExtras);
  }, [splitId, customExercises, splitExtras]);

  const bodyPartName = splitId ? SPLIT_NAMES[splitId] : '';

  const lastWorkoutForSplit = useMemo(() => {
    if (!splitId) return null;
    return workouts.find((w) => w.splitId === splitId) ?? null;
  }, [workouts, splitId]);

  const resetModalState = useCallback(() => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    setStep('paste');
    setProgressValue(0);
    setPastedText('');
    setParsedExercises([]);
    setMatchedExercises([]);
    setErrorMessage(null);
  }, []);

  const openModal = useCallback(() => {
    if (!splitId) {
      toast.error('Select a workout split first');
      return;
    }
    resetModalState();
    setModalOpen(true);
  }, [splitId, resetModalState]);

  const closeModal = useCallback(() => {
    resetModalState();
    setModalOpen(false);
  }, [resetModalState]);

  const copyPrompt = useCallback(async () => {
    if (!splitId) return;
    if (!exerciseLibrary.length) {
      toast.error('No exercises found for this split');
      return;
    }

    const unit = profile.prefs.unit;
    const prompt = buildAIPrompt({
      splitName: bodyPartName,
      targetMuscles: getTargetMuscles(splitId),
      athleteProfileBlock: formatAthleteProfile(profile, bodyStats, unit),
      trainingHistoryBlock: formatTrainingHistoryBlock(workouts, splitId, bodyPartName),
      exerciseCatalog: formatExerciseCatalog(exerciseLibrary),
      lastSessionBlock: formatLastWorkoutBlock(
        lastWorkoutForSplit,
        exerciseLibrary,
        unit,
        profile.goal,
        bodyPartName
      ),
      prBlock: formatPRsForSplit(exerciseLibrary, prs, unit),
      weightUnit: unit,
    });

    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [
    splitId,
    exerciseLibrary,
    lastWorkoutForSplit,
    bodyPartName,
    profile,
    bodyStats,
    workouts,
    prs,
  ]);

  const runValidation = useCallback(
    (text: string) => {
      try {
        const payload = extractJsonPayload(text);
        const parsed = parseImportedExercises(JSON.parse(payload));
        const unit = profile.prefs.unit;
        const clamped = parsed.map((ex) => ({
          ...ex,
          weight: inputToKg(
            clampImportedWeight(
              ex.exerciseName,
              ex.weight,
              unit,
              profile.goal,
              lastWorkoutForSplit,
              exerciseLibrary
            ),
            unit
          ),
        }));
        const matched = matchImportedExercises(clamped, exerciseLibrary);
        setParsedExercises(clamped);
        setMatchedExercises(matched);
        setErrorMessage(null);
        setStep('preview');
      } catch {
        setProgressValue(0);
        setStep('error');
        setErrorMessage('Invalid format. Please make sure you pasted the exact AI response.');
      }
    },
    [exerciseLibrary, profile.goal, profile.prefs.unit, lastWorkoutForSplit]
  );

  const processPastedWorkout = useCallback(() => {
    if (!pastedText.trim()) {
      setErrorMessage('Paste your AI-generated workout first.');
      setStep('error');
      return;
    }

    setErrorMessage(null);
    setStep('processing');
    setProgressValue(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setProgressValue(100));
    });

    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    processingTimerRef.current = setTimeout(() => {
      runValidation(pastedText);
      processingTimerRef.current = null;
    }, PROCESSING_DURATION_MS);
  }, [pastedText, runValidation]);

  const goBackToPaste = useCallback(() => {
    setStep('paste');
    setProgressValue(0);
    setErrorMessage(null);
  }, []);

  const confirmImport = useCallback(() => {
    if (!splitId) return;

    const confirmed = matchedExercises.filter((m) => m.matched && m.libraryExercise);
    if (!confirmed.length) {
      toast.error('No valid exercises to import');
      return;
    }

    const picks: TodayExercisePick[] = confirmed.map((m) => ({
      id: generateId(),
      exerciseId: m.libraryExercise!.id,
      variation: m.libraryExercise!.variations[0] ?? 'Standard',
    }));

    const presets: ImportedExercise[] = confirmed.map((m) => m.imported);

    rememberTodayPicks(splitId, picks);
    onImportSuccess(picks, presets);
    closeModal();
    toast.success('Workout imported successfully! 💪');
  }, [splitId, matchedExercises, rememberTodayPicks, onImportSuccess, closeModal]);

  return {
    modalOpen,
    step,
    progressValue,
    pastedText,
    parsedExercises,
    matchedExercises,
    errorMessage,
    bodyPartName,
    setPastedText,
    openModal,
    closeModal,
    copyPrompt,
    processPastedWorkout,
    goBackToPaste,
    confirmImport,
  };
}
