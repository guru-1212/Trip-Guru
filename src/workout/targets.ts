import dayjs from 'dayjs';
import type { DayKey } from './types';
import { getDayKeyForDate, getTrackingWeekStart } from './utils';

/**
 * Targets: a measurable goal on one exercise ("100 non-stop push-ups") with an
 * autoregulated coach that prescribes each session, adapts to hits and misses,
 * and projects an achievement date.
 *
 * Everything here is pure — no Firestore, no React — so `targets.test.ts` can
 * exercise the whole coach. Functions that need "today" take an `asOf` date
 * string: the test runner is a plain script with no clock mocking.
 *
 * Design note: no coach state is stored on the Target. `currentBest`, `step`,
 * misses and deload flags are all *derived* from the attempt list on every read,
 * so editing or deleting an attempt recomputes correctly and there is nothing
 * to migrate later.
 */

/** Reps for calisthenics goals, seconds for holds (plank, dead hang). */
export type TargetUnit = 'reps' | 'seconds';

export type TargetStatus = 'active' | 'achieved' | 'paused' | 'archived';

/**
 * test   — set 1 is a max-effort AMRAP that re-baselines `currentBest`.
 * volume — all sets submax, no failure. Accumulates reps without the fatigue cost.
 * deload — planned easy week, stop well short of failure.
 */
export type TargetSessionKind = 'test' | 'volume' | 'deload';

export interface TargetScheme {
  /** Multipliers of currentBest. Index 0 on a test day is the AMRAP. */
  testPercents: number[];
  volumePercents: number[];
  deloadPercents: number[];
  restSeconds: number;
  /** Added to the AMRAP goal after a hit. Autoregulated between 1 and 2. */
  step: number;
  /** 0 disables planned deloads. */
  deloadEveryNWeeks: number;
  /** true = every scheduled day is a max-effort test (harder on recovery). */
  testEveryDay: boolean;
}

export interface Target {
  id: string;
  name: string;
  exerciseId: string;
  variation?: string;
  unit: TargetUnit;
  goalValue: number;
  /** null until the baseline test is logged. */
  baseline: number | null;
  baselineDate?: string;
  startDate: string;
  /** The user's own deadline. null = let the app project one. */
  targetDate: string | null;
  trainingDays: DayKey[];
  scheme: TargetScheme;
  status: TargetStatus;
  achievedDate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TargetAttempt {
  id: string;
  targetId: string;
  date: string;
  kind: TargetSessionKind;
  prescribed: number[];
  actual: number[];
  /** Best single set — the AMRAP result on a test day. */
  topSet: number;
  totalVolume: number;
  isPR: boolean;
  /** Stamped at confirmFinish when the attempt was done inside a gym session. */
  sessionId?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TargetPrescriptionSet {
  index: number;
  goal: number;
  isAmrap: boolean;
}

export interface TargetPrescription {
  kind: TargetSessionKind;
  sets: TargetPrescriptionSet[];
  restSeconds: number;
  currentBest: number;
  /** Last test's top set — the number to beat. */
  ghost: number | null;
  coachNote: string;
  isHolding: boolean;
  totalGoal: number;
}

export interface AutoregulationState {
  currentBest: number;
  allTimeBest: number;
  step: number;
  consecutiveMisses: number;
  consecutiveHits: number;
  /** Repeating the previous prescription after a single miss. */
  isHolding: boolean;
  /** Two misses in a row — the next session drops to a deload. */
  forceDeload: boolean;
  /** No improvement across the last 3 tests: time to change the stimulus. */
  plateaued: boolean;
  lifetimeVolume: number;
  testCount: number;
  lastTest: TargetAttempt | null;
}

export type ProjectionStatus =
  | 'insufficientData'
  | 'onPace'
  | 'ahead'
  | 'behind'
  | 'stalled'
  | 'achieved';

export interface TargetProjection {
  status: ProjectionStatus;
  projectedDate: string | null;
  weeksRemaining: number | null;
  recentRatePerWeek: number;
  /** Only set when the target has a user deadline. */
  requiredRatePerWeek: number | null;
  testsUntilProjectable: number;
}

/** Tests needed before a date can be projected honestly. */
export const MIN_TESTS_FOR_PROJECTION = 3;

/** Below this many units/week the series is flat, not slow. */
const STALL_RATE_THRESHOLD = 0.1;

/** Rep gains slow sharply near the ceiling; damp the fitted slope accordingly. */
const DECELERATION_FACTOR = 0.35;

/** Tests fed to the regression — recent rate, not lifetime average. */
const PROJECTION_WINDOW = 6;

/** Tests used for currentBest, so one fluke AMRAP can't inflate every session. */
const BEST_WINDOW = 3;

export const DEFAULT_TARGET_SCHEME: TargetScheme = {
  testPercents: [1, 0.7, 0.5, 0.5],
  volumePercents: [0.6, 0.6, 0.55, 0.5, 0.5],
  deloadPercents: [0.5, 0.5, 0.5, 0.5],
  restSeconds: 90,
  step: 2,
  deloadEveryNWeeks: 4,
  testEveryDay: false,
};

/** The user's original plan: max effort every scheduled day, no planned deloads. */
export const MAX_EFFORT_TARGET_SCHEME: TargetScheme = {
  ...DEFAULT_TARGET_SCHEME,
  testEveryDay: true,
  deloadEveryNWeeks: 0,
};

// ---------------------------------------------------------------------------
// Attempt selection
// ---------------------------------------------------------------------------

function byDateAsc(a: TargetAttempt, b: TargetAttempt): number {
  const diff = dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
  return diff !== 0 ? diff : a.createdAt - b.createdAt;
}

/** All attempts for a target, oldest first. */
export function attemptsForTarget(targetId: string, attempts: TargetAttempt[]): TargetAttempt[] {
  return attempts.filter((a) => a.targetId === targetId).sort(byDateAsc);
}

/** Attempts logged strictly before `date` — what the coach knew when prescribing. */
export function attemptsBefore(
  targetId: string,
  attempts: TargetAttempt[],
  date: string
): TargetAttempt[] {
  const cutoff = dayjs(date);
  return attemptsForTarget(targetId, attempts).filter((a) => dayjs(a.date).isBefore(cutoff, 'day'));
}

function testAttempts(targetId: string, attempts: TargetAttempt[]): TargetAttempt[] {
  return attemptsForTarget(targetId, attempts).filter((a) => a.kind === 'test');
}

export function getAttemptForDate(
  targetId: string,
  attempts: TargetAttempt[],
  date: string
): TargetAttempt | null {
  return attemptsForTarget(targetId, attempts).find((a) => a.date === date) ?? null;
}

// ---------------------------------------------------------------------------
// Current best
// ---------------------------------------------------------------------------

/**
 * Working number every prescription is built from: the best top set across the
 * last few tests, not the lifetime max. It decays if you detrain, which is what
 * keeps the percentages honest after a layoff.
 */
export function getCurrentBest(target: Target, attempts: TargetAttempt[]): number {
  const recent = testAttempts(target.id, attempts).slice(-BEST_WINDOW);
  if (recent.length === 0) return target.baseline ?? 0;
  return Math.max(...recent.map((a) => a.topSet));
}

/** Lifetime best — what a new top set has to beat to count as a PR. */
export function getAllTimeBest(target: Target, attempts: TargetAttempt[]): number {
  const tests = testAttempts(target.id, attempts);
  return Math.max(target.baseline ?? 0, ...tests.map((a) => a.topSet), 0);
}

// ---------------------------------------------------------------------------
// Autoregulation
// ---------------------------------------------------------------------------

function allSetsCompleted(attempt: TargetAttempt): boolean {
  if (attempt.prescribed.length === 0) return false;
  return attempt.prescribed.every((goal, i) => (attempt.actual[i] ?? 0) >= goal);
}

/**
 * Replays the attempt history to work out where the coach stands: how big a jump
 * to ask for, whether to repeat the week, and whether a deload is due.
 */
export function computeAutoregulation(
  target: Target,
  attempts: TargetAttempt[]
): AutoregulationState {
  const history = attemptsForTarget(target.id, attempts);
  const baseStep = target.scheme.step || DEFAULT_TARGET_SCHEME.step;

  let step = baseStep;
  let misses = 0;
  let hits = 0;
  let lifetimeVolume = 0;
  let runningBest = target.baseline ?? 0;
  let lastTest: TargetAttempt | null = null;

  for (const attempt of history) {
    lifetimeVolume += attempt.totalVolume;

    if (attempt.kind === 'deload') {
      // A deload consumes the miss streak — you come back fresh and retest.
      misses = 0;
      continue;
    }
    if (attempt.kind !== 'test') continue;

    const previous = runningBest;
    lastTest = attempt;

    if (attempt.topSet > previous) {
      runningBest = attempt.topSet;
      misses = 0;
      hits = allSetsCompleted(attempt) ? hits + 1 : 0;
    } else if (attempt.topSet === previous) {
      // Tied: still progressing, but ask for less next time.
      step = 1;
      hits = 0;
    } else {
      misses += 1;
      hits = 0;
    }
  }

  // Three clean sessions in a row earns the bigger jump back.
  if (hits >= 3) step = baseStep;

  const tests = testAttempts(target.id, attempts);
  const lastThree = tests.slice(-3);
  const plateaued =
    lastThree.length === 3 && lastThree.every((a) => a.topSet <= lastThree[0].topSet);

  return {
    currentBest: getCurrentBest(target, attempts),
    allTimeBest: getAllTimeBest(target, attempts),
    step,
    consecutiveMisses: misses,
    consecutiveHits: hits,
    isHolding: misses === 1,
    forceDeload: misses >= 2,
    plateaued,
    lifetimeVolume,
    testCount: tests.length,
    lastTest,
  };
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/**
 * Literal weekday match — deliberately NOT getScheduledSplitForDate, which is
 * rotation-aware and carries splits forward across skipped days. A Mon/Thu
 * target must stay on Mon/Thu.
 */
export function isTargetDay(target: Target, date: string, restDays: string[] = []): boolean {
  if (target.status !== 'active') return false;
  if (dayjs(date).isBefore(dayjs(target.startDate), 'day')) return false;
  if (restDays.includes(date)) return false;
  return target.trainingDays.includes(getDayKeyForDate(date));
}

/** Tracking weeks (Mon-start) elapsed since the target began. */
function weekIndexSinceStart(target: Target, date: string): number {
  const start = getTrackingWeekStart(target.startDate);
  const current = getTrackingWeekStart(date);
  return current.diff(start, 'week');
}

function isFirstTrainingDayOfWeek(target: Target, date: string): boolean {
  const dayKey = getDayKeyForDate(date);
  const weekStart = getTrackingWeekStart(date);
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = weekStart.add(offset, 'day');
    const candidateKey = getDayKeyForDate(candidate.format('YYYY-MM-DD'));
    if (target.trainingDays.includes(candidateKey)) return candidateKey === dayKey;
  }
  return false;
}

/** null when `date` is not a training day for this target. */
export function getSessionKindForDate(
  target: Target,
  attempts: TargetAttempt[],
  date: string,
  restDays: string[] = []
): TargetSessionKind | null {
  if (!isTargetDay(target, date, restDays)) return null;

  const prior = attemptsBefore(target.id, attempts, date);
  if (computeAutoregulation(target, prior).forceDeload) return 'deload';

  const everyN = target.scheme.deloadEveryNWeeks;
  if (everyN > 0) {
    const week = weekIndexSinceStart(target, date);
    if (week > 0 && (week + 1) % everyN === 0) return 'deload';
  }

  if (target.scheme.testEveryDay) return 'test';
  return isFirstTrainingDayOfWeek(target, date) ? 'test' : 'volume';
}

/** Next date on or after `asOf` that this target trains. */
export function getNextTargetDate(
  target: Target,
  asOf: string,
  restDays: string[] = []
): string | null {
  if (target.status !== 'active' || target.trainingDays.length === 0) return null;
  const from = dayjs(asOf).isBefore(dayjs(target.startDate), 'day')
    ? dayjs(target.startDate)
    : dayjs(asOf);
  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = from.add(offset, 'day').format('YYYY-MM-DD');
    if (isTargetDay(target, candidate, restDays)) return candidate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Prescription
// ---------------------------------------------------------------------------

function scaleSet(best: number, pct: number): number {
  // toFixed first: 45 * 0.7 is 31.4999… in binary floating point, which would
  // round down to 31 where a human working out "70% of 45" expects 32.
  return Math.max(1, Math.round(Number((best * pct).toFixed(6))));
}

function percentsForKind(scheme: TargetScheme, kind: TargetSessionKind): number[] {
  if (kind === 'test') return scheme.testPercents;
  if (kind === 'volume') return scheme.volumePercents;
  return scheme.deloadPercents;
}

function buildCoachNote(
  kind: TargetSessionKind,
  auto: AutoregulationState,
  unit: TargetUnit,
  amrapGoal: number
): string {
  const noun = unit === 'seconds' ? 'seconds' : 'reps';

  if (kind === 'deload') {
    if (auto.forceDeload) {
      return `Two sessions held, so this week is deliberately easy. Stop 3 ${noun} short of failure — you are consolidating, not testing.`;
    }
    return `Planned easy week. Stop 3 ${noun} short of failure on every set; this is where the last three weeks turn into strength.`;
  }

  if (kind === 'volume') {
    return `Volume day — no max effort. Every set stops well short of failure; the goal is total ${noun} on the board, not a new number.`;
  }

  if (auto.isHolding) {
    return `Held at ${auto.currentBest} last time. Totally normal — this is where adaptation happens. Same numbers again, and we break through.`;
  }
  if (auto.plateaued) {
    return `Three tests without a jump. Go for ${amrapGoal} today; if it holds again, it is time to change the stimulus rather than push harder.`;
  }
  if (auto.testCount === 0) {
    return `First programmed session. Set 1 is all-out — ${amrapGoal} is the number to chase.`;
  }
  return `Test day. Set 1 is all-out: beat ${auto.currentBest}, and ${amrapGoal} is the target.`;
}

/**
 * Today's set scheme, or null when `date` is not a training day or no baseline
 * has been logged yet (the UI shows the baseline test instead).
 */
export function buildPrescription(
  target: Target,
  attempts: TargetAttempt[],
  date: string,
  restDays: string[] = []
): TargetPrescription | null {
  if (target.baseline === null) return null;

  const kind = getSessionKindForDate(target, attempts, date, restDays);
  if (!kind) return null;

  const prior = attemptsBefore(target.id, attempts, date);
  const auto = computeAutoregulation(target, prior);
  const best = auto.currentBest;
  if (best <= 0) return null;

  const percents = percentsForKind(target.scheme, kind);
  const sets: TargetPrescriptionSet[] = [];

  let amrapGoal = 0;
  if (kind === 'test') {
    // Holding repeats the previous ask verbatim rather than lowering it.
    amrapGoal =
      auto.isHolding && auto.lastTest?.prescribed.length
        ? auto.lastTest.prescribed[0]
        : best + auto.step;
    sets.push({ index: 0, goal: amrapGoal, isAmrap: true });
    percents.slice(1).forEach((pct, i) => {
      sets.push({ index: i + 1, goal: scaleSet(best, pct), isAmrap: false });
    });
  } else {
    percents.forEach((pct, i) => {
      sets.push({ index: i, goal: scaleSet(best, pct), isAmrap: false });
    });
  }

  const lastTest = auto.lastTest;

  return {
    kind,
    sets,
    restSeconds: target.scheme.restSeconds || DEFAULT_TARGET_SCHEME.restSeconds,
    currentBest: best,
    ghost: lastTest ? lastTest.topSet : target.baseline,
    coachNote: buildCoachNote(kind, auto, target.unit, amrapGoal),
    isHolding: auto.isHolding && kind === 'test',
    totalGoal: sets.reduce((sum, s) => sum + s.goal, 0),
  };
}

/**
 * Once set 1 is logged, resize the back-off sets against what was actually hit
 * rather than last session's number — the way a coach calls it on the floor:
 * "you got 45, so give me 32, 23, 23".
 */
export function recomputeBackoffSets(
  target: Target,
  prescription: TargetPrescription,
  actualTopSet: number
): TargetPrescription {
  if (prescription.kind !== 'test' || actualTopSet <= 0) return prescription;
  const percents = target.scheme.testPercents;
  const sets = prescription.sets.map((s) =>
    s.isAmrap ? s : { ...s, goal: scaleSet(actualTopSet, percents[s.index] ?? 0.5) }
  );
  return { ...prescription, sets, totalGoal: sets.reduce((sum, s) => sum + s.goal, 0) };
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

function leastSquaresSlope(points: { x: number; y: number }[]): number | null {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }
  if (denominator === 0) return null;
  return numerator / denominator;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Projects when the goal will be reached from the recent rate of improvement.
 * Returns no date rather than a flattering one: fewer than three tests is
 * `insufficientData`, and a flat series is `stalled`.
 */
export function projectAchievement(
  target: Target,
  attempts: TargetAttempt[],
  asOf: string
): TargetProjection {
  const best = getCurrentBest(target, attempts);
  const remaining = target.goalValue - best;

  const empty: TargetProjection = {
    status: 'insufficientData',
    projectedDate: null,
    weeksRemaining: null,
    recentRatePerWeek: 0,
    requiredRatePerWeek: null,
    testsUntilProjectable: MIN_TESTS_FOR_PROJECTION,
  };

  if (remaining <= 0) {
    return { ...empty, status: 'achieved', testsUntilProjectable: 0 };
  }

  const requiredRate = requiredRatePerWeek(target, best, asOf);
  const tests = testAttempts(target.id, attempts);
  if (tests.length < MIN_TESTS_FOR_PROJECTION) {
    return {
      ...empty,
      requiredRatePerWeek: requiredRate,
      testsUntilProjectable: MIN_TESTS_FOR_PROJECTION - tests.length,
    };
  }

  const window = tests.slice(-PROJECTION_WINDOW);
  const origin = dayjs(window[0].date);
  const slope = leastSquaresSlope(
    window.map((a) => ({ x: dayjs(a.date).diff(origin, 'day') / 7, y: a.topSet }))
  );

  if (slope === null || slope < STALL_RATE_THRESHOLD) {
    return {
      status: 'stalled',
      projectedDate: null,
      weeksRemaining: null,
      recentRatePerWeek: round2(slope ?? 0),
      requiredRatePerWeek: requiredRate,
      testsUntilProjectable: 0,
    };
  }

  const decay = Math.max(0.2, 1 - (best / target.goalValue) * DECELERATION_FACTOR);
  const effectiveRate = slope * decay;
  const weeks = remaining / effectiveRate;
  const projectedDate = dayjs(asOf).add(Math.ceil(weeks * 7), 'day').format('YYYY-MM-DD');

  let status: ProjectionStatus = 'onPace';
  if (requiredRate !== null) {
    if (requiredRate <= 0) status = 'behind';
    else {
      const ratio = effectiveRate / requiredRate;
      if (ratio >= 1.15) status = 'ahead';
      else if (ratio >= 0.95) status = 'onPace';
      else status = 'behind';
    }
  }

  return {
    status,
    projectedDate,
    weeksRemaining: Math.ceil(weeks),
    recentRatePerWeek: round2(slope),
    requiredRatePerWeek: requiredRate,
    testsUntilProjectable: 0,
  };
}

function requiredRatePerWeek(target: Target, best: number, asOf: string): number | null {
  if (!target.targetDate) return null;
  const weeks = dayjs(target.targetDate).diff(dayjs(asOf), 'day') / 7;
  if (weeks <= 0) return 0;
  return round2((target.goalValue - best) / weeks);
}

// ---------------------------------------------------------------------------
// History & display helpers
// ---------------------------------------------------------------------------

export interface TargetHistoryPoint {
  date: string;
  label: string;
  topSet: number;
  totalVolume: number;
}

/**
 * Reps-first history for the progress chart. getExerciseSessionChart can't be
 * reused: it filters `weight > 0`, which drops every bodyweight set.
 */
export function getTargetRepHistory(
  target: Target,
  attempts: TargetAttempt[]
): TargetHistoryPoint[] {
  const points = attemptsForTarget(target.id, attempts).map((a) => ({
    date: a.date,
    label: dayjs(a.date).format('MMM D'),
    topSet: a.topSet,
    totalVolume: a.totalVolume,
  }));

  // The baseline lives on the target rather than in the attempt log, so the
  // chart has to prepend it to show where the journey actually started.
  if (target.baseline !== null && target.baselineDate) {
    points.unshift({
      date: target.baselineDate,
      label: dayjs(target.baselineDate).format('MMM D'),
      topSet: target.baseline,
      totalVolume: target.baseline,
    });
  }
  return points;
}

export function getTargetProgressPercent(target: Target, attempts: TargetAttempt[]): number {
  if (target.goalValue <= 0) return 0;
  return Math.min(100, (getCurrentBest(target, attempts) / target.goalValue) * 100);
}

/** "43" for reps, "45s" / "1:30" for holds. */
export function formatTargetValue(value: number, unit: TargetUnit): string {
  if (unit !== 'seconds') return String(value);
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * "43 / 28 / 20" — skips the zeros that mark sets which were never logged.
 * @see useTargetLogger for why `actual` is index-aligned and zero-padded.
 */
export function formatAttemptSets(attempt: TargetAttempt, unit: TargetUnit): string {
  return attempt.actual
    .filter((v) => v > 0)
    .map((v) => formatTargetValue(v, unit))
    .join(' / ');
}

export function describeSessionKind(kind: TargetSessionKind): string {
  if (kind === 'test') return 'Test day';
  if (kind === 'volume') return 'Volume day';
  return 'Deload';
}

/** "Session 7 · 43 (+1) · 113 total reps" */
export function summarizeAttempt(
  target: Target,
  attempt: TargetAttempt,
  sessionNumber: number,
  previousBest: number
): string {
  const noun = target.unit === 'seconds' ? 'total seconds' : 'total reps';
  const delta = attempt.topSet - previousBest;
  const deltaLabel = delta > 0 ? ` (+${delta})` : '';
  const top = formatTargetValue(attempt.topSet, target.unit);
  return `Session ${sessionNumber} · ${top}${deltaLabel} · ${attempt.totalVolume} ${noun}`;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export interface CreateTargetInput {
  id: string;
  name: string;
  exerciseId: string;
  variation?: string;
  unit: TargetUnit;
  goalValue: number;
  startDate: string;
  targetDate: string | null;
  trainingDays: DayKey[];
  scheme?: Partial<TargetScheme>;
}

export function createTarget(input: CreateTargetInput): Target {
  const now = Date.now();
  return {
    id: input.id,
    name: input.name,
    exerciseId: input.exerciseId,
    variation: input.variation,
    unit: input.unit,
    goalValue: input.goalValue,
    baseline: null,
    startDate: input.startDate,
    targetDate: input.targetDate,
    trainingDays: input.trainingDays,
    scheme: { ...DEFAULT_TARGET_SCHEME, ...input.scheme },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateAttemptInput {
  id: string;
  targetId: string;
  date: string;
  kind: TargetSessionKind;
  prescribed: number[];
  actual: number[];
  allTimeBest: number;
  sessionId?: string;
  note?: string;
}

export function createAttempt(input: CreateAttemptInput): TargetAttempt {
  const now = Date.now();
  const actual = input.actual.map((v) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0));
  const topSet = actual.length ? Math.max(...actual) : 0;
  return {
    id: input.id,
    targetId: input.targetId,
    date: input.date,
    kind: input.kind,
    prescribed: input.prescribed,
    actual,
    topSet,
    totalVolume: actual.reduce((sum, v) => sum + v, 0),
    isPR: input.kind === 'test' && topSet > input.allTimeBest,
    sessionId: input.sessionId,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  };
}

/** True once the goal has been reached — the caller flips status to 'achieved'. */
export function hasReachedGoal(target: Target, attempts: TargetAttempt[]): boolean {
  return getAllTimeBest(target, attempts) >= target.goalValue;
}
