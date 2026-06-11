'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { SPLIT_NAMES } from '@/workout/constants';
import { buildSplitExerciseLibrary, generateId } from '@/workout/utils';
import type { ImportedExercise, MatchResult, AIImportStep } from '@/types/aiImport';
import type { LibraryExercise, SplitId, TodayExercisePick } from '@/workout/types';

const PROCESSING_DURATION_MS = 1500;

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

function formatLastWorkoutLine(
  name: string,
  sets: { weight: number; reps: number }[],
  unit: 'kg' | 'lbs'
): string {
  if (!sets.length) return name;
  const first = sets[0];
  const weightLabel = unit === 'lbs' ? `${Math.round(first.weight * 2.20462)}lbs` : `${first.weight}kg`;
  const repsLabel = sets.every((s) => s.reps === first.reps)
    ? `${first.reps} reps`
    : sets.map((s) => s.reps).join('/');
  return `${name} (${sets.length} sets x ${repsLabel}, ${weightLabel})`;
}

function buildPrompt(
  bodyPart: string,
  exercises: LibraryExercise[],
  lastWorkoutLines: string[] | null
): string {
  const exerciseList = exercises.map((e) => e.name).join(', ');

  const historyBlock = lastWorkoutLines?.length
    ? `For my last ${bodyPart} workout, I performed:
${lastWorkoutLines.map((line) => `- ${line}`).join('\n')}
Please suggest today's workout with progressive overload or smart variation based on this history.`
    : `This is my first time working out these muscle groups in this program.
Please provide a solid baseline routine.`;

  return `You are an expert fitness coach. My scheduled workout today focuses on: ${bodyPart}.

Here are the ONLY exercises I have available. You MUST NOT suggest any exercise not on this list:
${exerciseList}

${historyBlock}

Instructions:
1. Select the best 5–6 exercises from my available list only.
2. Ensure the routine hits ALL muscle parts of ${bodyPart} completely.
3. Sequence optimally: heavy compound movements first, isolation exercises last.
4. Apply progressive overload logic based on last session if available.

Return ONLY the following JSON format. No extra text, no markdown, no explanation, nothing outside the JSON array:

[
  {
    "exerciseName": "Barbell Bench Press",
    "sets": 4,
    "reps": "8",
    "weight": 80,
    "notes": "Progressive overload — increase weight by 2.5kg"
  }
]`;
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
    const reps = String(row.reps ?? '').trim();
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
  const { profile, workouts, customExercises, splitExtras, rememberTodayPicks } = useWorkoutStore();

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

    const lastLines = lastWorkoutForSplit
      ? lastWorkoutForSplit.exercises.map((ex) =>
          formatLastWorkoutLine(
            ex.name,
            ex.sets.filter((s) => s.weight > 0 || s.reps > 0),
            profile.prefs.unit
          )
        )
      : null;

    const prompt = buildPrompt(bodyPartName, exerciseLibrary, lastLines);
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [splitId, exerciseLibrary, lastWorkoutForSplit, bodyPartName, profile.prefs.unit]);

  const runValidation = useCallback(
    (text: string) => {
      try {
        const payload = extractJsonPayload(text);
        const parsed = parseImportedExercises(JSON.parse(payload));
        const matched = matchImportedExercises(parsed, exerciseLibrary);
        setParsedExercises(parsed);
        setMatchedExercises(matched);
        setErrorMessage(null);
        setStep('preview');
      } catch {
        setProgressValue(0);
        setStep('error');
        setErrorMessage('Invalid format. Please make sure you pasted the exact AI response.');
      }
    },
    [exerciseLibrary]
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
