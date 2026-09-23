'use client';

import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { useFitTrackCelebration } from '@/components/fittrack/FitTrackCelebrationProvider';
import { getExerciseById } from '@/workout/exerciseLibrary';
import { generateId } from '@/workout/utils';
import {
  attemptsBefore,
  attemptsForTarget,
  buildPrescription,
  createAttempt,
  getAllTimeBest,
  getAttemptForDate,
  getCurrentBest,
  getNextTargetDate,
  getSessionKindForDate,
  projectAchievement,
  recomputeBackoffSets,
} from '@/workout/targets';
import type { Target, TargetAttempt, TargetPrescription } from '@/workout/targets';

export function todayKey(): string {
  return dayjs().format('YYYY-MM-DD');
}

export interface TargetSummary {
  target: Target;
  currentBest: number;
  percent: number;
  /** Today's prescription, or null when today is not a training day. */
  prescription: TargetPrescription | null;
  /** Already-logged attempt for today, if any. */
  todayAttempt: TargetAttempt | null;
  nextDate: string | null;
  needsBaseline: boolean;
  projection: ReturnType<typeof projectAchievement>;
  exerciseName: string;
}

function resolveExerciseName(target: Target, customNames: Record<string, string>): string {
  return getExerciseById(target.exerciseId)?.name ?? customNames[target.exerciseId] ?? target.name;
}

/** Derived view of every target for the list, dashboard widget and workout block. */
export function useTargets(date: string = todayKey()) {
  const { targets, targetAttempts, restDays, customExercises, hydrated } = useWorkoutStore();

  const customNames = useMemo(
    () => Object.fromEntries(customExercises.map((e) => [e.id, e.name])),
    [customExercises]
  );

  const summaries = useMemo<TargetSummary[]>(
    () =>
      targets.map((target) => {
        const currentBest = getCurrentBest(target, targetAttempts);
        return {
          target,
          currentBest,
          percent: target.goalValue > 0 ? Math.min(100, (currentBest / target.goalValue) * 100) : 0,
          prescription: buildPrescription(target, targetAttempts, date, restDays),
          todayAttempt: getAttemptForDate(target.id, targetAttempts, date),
          nextDate: getNextTargetDate(target, date, restDays),
          needsBaseline: target.baseline === null,
          projection: projectAchievement(target, targetAttempts, date),
          exerciseName: resolveExerciseName(target, customNames),
        };
      }),
    [targets, targetAttempts, restDays, date, customNames]
  );

  const active = useMemo(() => summaries.filter((s) => s.target.status === 'active'), [summaries]);

  /** Active targets with something to do today — drives the widget and workout block. */
  const dueToday = useMemo(
    () => active.filter((s) => s.prescription !== null || s.needsBaseline),
    [active]
  );

  return { summaries, active, dueToday, hydrated };
}

export function useTargetSummary(targetId: string, date: string = todayKey()) {
  const { summaries } = useTargets(date);
  return summaries.find((s) => s.target.id === targetId) ?? null;
}

export interface TargetLogger {
  prescription: TargetPrescription | null;
  /** Prescription with back-offs resized against the logged top set. */
  livePrescription: TargetPrescription | null;
  values: number[];
  logged: boolean[];
  /** Last session's top set — the number on screen to beat. */
  ghost: number | null;
  allTimeBest: number;
  isComplete: boolean;
  setValue: (index: number, value: number) => void;
  logSet: (index: number) => void;
  unlogSet: (index: number) => void;
}

/**
 * Logging state machine shared by the in-workout block and the standalone quick
 * log, so both behave identically. Every logged set writes the attempt through,
 * which is what makes progress durable across a reload mid-session.
 */
export function useTargetLogger(
  target: Target,
  date: string = todayKey(),
  sessionId?: string
): TargetLogger {
  const { targetAttempts, restDays, saveTargetAttempt } = useWorkoutStore();
  const { celebrateTargetPR } = useFitTrackCelebration();

  const prescription = useMemo(
    () => buildPrescription(target, targetAttempts, date, restDays),
    [target, targetAttempts, date, restDays]
  );

  const existing = useMemo(
    () => getAttemptForDate(target.id, targetAttempts, date),
    [target.id, targetAttempts, date]
  );

  const allTimeBest = useMemo(
    () => getAllTimeBest(target, attemptsBefore(target.id, targetAttempts, date)),
    [target, targetAttempts, date]
  );

  const setCount = prescription?.sets.length ?? 0;

  // Draft values start from the prescription so the steppers open on the goal.
  const [draft, setDraft] = useState<number[] | null>(null);
  const [loggedFlags, setLoggedFlags] = useState<boolean[] | null>(null);

  // `actual` is stored aligned to `prescribed`, with 0 for a set that has not
  // been logged — a logged set is never 0 reps, so the two are unambiguous and
  // a skipped middle set cannot shift the ones after it.
  const values = useMemo(() => {
    if (draft) return draft;
    if (existing) return prescription?.sets.map((s, i) => existing.actual[i] || s.goal) ?? [];
    return prescription?.sets.map((s) => s.goal) ?? [];
  }, [draft, existing, prescription]);

  const logged = useMemo(() => {
    if (loggedFlags) return loggedFlags;
    if (existing) return Array.from({ length: setCount }, (_, i) => (existing.actual[i] ?? 0) > 0);
    return Array.from({ length: setCount }, () => false);
  }, [loggedFlags, existing, setCount]);

  const topSetLogged = logged[0] ? values[0] : 0;

  const livePrescription = useMemo(() => {
    if (!prescription) return null;
    return topSetLogged > 0 ? recomputeBackoffSets(target, prescription, topSetLogged) : prescription;
  }, [prescription, target, topSetLogged]);

  const persist = useCallback(
    (nextValues: number[], nextLogged: boolean[]) => {
      if (!prescription) return;
      // Zero marks "not logged yet", keeping actual index-aligned with prescribed.
      const actual = prescription.sets.map((_, i) => (nextLogged[i] ? (nextValues[i] ?? 0) : 0));
      if (actual.every((v) => v === 0)) return;

      const attempt = createAttempt({
        id: existing?.id ?? generateId(),
        targetId: target.id,
        date,
        kind: prescription.kind,
        prescribed: prescription.sets.map((s) => s.goal),
        actual,
        allTimeBest,
        sessionId: existing?.sessionId ?? sessionId,
        note: existing?.note,
      });

      saveTargetAttempt(attempt);

      if (attempt.isPR) {
        celebrateTargetPR({
          targetId: target.id,
          targetName: target.name,
          exerciseName: getExerciseById(target.exerciseId)?.name ?? target.name,
          value: attempt.topSet,
          unit: target.unit,
          previousBest: allTimeBest,
          goalValue: target.goalValue,
        });
      }
    },
    [prescription, existing, target, date, allTimeBest, sessionId, saveTargetAttempt, celebrateTargetPR]
  );

  const setValue = useCallback(
    (index: number, value: number) => {
      setDraft((prev) => {
        const base = prev ?? values;
        const next = [...base];
        next[index] = Math.max(0, Math.round(value));
        return next;
      });
    },
    [values]
  );

  const logSet = useCallback(
    (index: number) => {
      const nextLogged = [...logged];
      nextLogged[index] = true;
      setLoggedFlags(nextLogged);
      setDraft(values);
      persist(values, nextLogged);
    },
    [logged, values, persist]
  );

  const unlogSet = useCallback(
    (index: number) => {
      const nextLogged = [...logged];
      nextLogged[index] = false;
      setLoggedFlags(nextLogged);
      setDraft(values);
      persist(values, nextLogged);
    },
    [logged, values, persist]
  );

  return {
    prescription,
    livePrescription,
    values,
    logged,
    ghost: prescription?.ghost ?? null,
    allTimeBest,
    isComplete: setCount > 0 && logged.every(Boolean),
    setValue,
    logSet,
    unlogSet,
  };
}

/**
 * Logs a set done outside the plan — an extra session, or one on a day the
 * target does not normally train.
 *
 * Recorded as a volume attempt on purpose: only test attempts move
 * `currentBest` or feed the autoregulation, so off-plan work adds to your
 * lifetime total without quietly rewriting the programme.
 */
export function useLogExtraSet(target: Target) {
  const { targetAttempts, saveTargetAttempt } = useWorkoutStore();

  return useCallback(
    (count: number, date: string = todayKey()) => {
      if (count <= 0) return;
      const existing = getAttemptForDate(target.id, targetAttempts, date);
      saveTargetAttempt(
        createAttempt({
          id: existing?.id ?? generateId(),
          targetId: target.id,
          date,
          kind: existing?.kind ?? 'volume',
          prescribed: existing?.prescribed ?? [count],
          actual: existing ? [...existing.actual, count] : [count],
          allTimeBest: getAllTimeBest(target, attemptsBefore(target.id, targetAttempts, date)),
          note: existing?.note ?? 'Extra set',
        })
      );
    },
    [target, targetAttempts, saveTargetAttempt]
  );
}

/**
 * Baseline test — the one-off first entry that unlocks the coach.
 *
 * Deliberately does NOT write an attempt: it lives on the target itself. Logged
 * as a test attempt it would tie against `target.baseline`, which
 * computeAutoregulation reads as a stall and would drop the step to 1 before the
 * user had trained a single session. The chart picks it up via getTargetRepHistory.
 */
export function useBaselineTest(target: Target) {
  const { updateTarget } = useWorkoutStore();

  return useCallback(
    (value: number, date: string = todayKey()) => {
      if (value <= 0) return;
      updateTarget(target.id, { baseline: Math.round(value), baselineDate: date });
    },
    [target.id, updateTarget]
  );
}

export { attemptsForTarget, getSessionKindForDate };
