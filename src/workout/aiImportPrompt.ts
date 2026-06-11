import dayjs from 'dayjs';
import { SPLIT_DEFINITIONS } from './constants';
import { filterByRange } from './analytics';
import { displayWeight, formatWeight, inputToKg, toSubVariationLabel } from './utils';
import type {
  BodyStat,
  FitnessGoal,
  LibraryExercise,
  PersonalRecord,
  SplitId,
  UserProfile,
  WeightUnit,
  WorkoutSession,
  WorkoutSet,
} from './types';

export type ProgressionType = 'reps' | 'weight' | 'hold' | 'reduce' | 'baseline';

export interface ProgressionTarget {
  weightKg: number;
  reps: number;
  progressionType: ProgressionType;
  note: string;
}

function repRangeForGoal(goal: FitnessGoal, isIsolation: boolean): { bottom: number; top: number } {
  switch (goal) {
    case 'Strength':
      return { bottom: 4, top: isIsolation ? 8 : 6 };
    case 'Lose Fat':
    case 'Endurance':
      return { bottom: 10, top: isIsolation ? 15 : 12 };
    default:
      return { bottom: 8, top: isIsolation ? 15 : 12 };
  }
}

function isIsolationExercise(ex: LibraryExercise): boolean {
  return ex.category.includes('Isolation');
}

function isLowerCompound(ex: LibraryExercise): boolean {
  return (
    ex.category.includes('Compound') &&
    (ex.muscle === 'Legs' ||
      ex.name.toLowerCase().includes('squat') ||
      ex.name.toLowerCase().includes('deadlift') ||
      ex.name.toLowerCase().includes('leg press'))
  );
}

function weightIncrementKg(ex: LibraryExercise, lastWeightKg: number, unit: WeightUnit): number {
  const display = displayWeight(lastWeightKg, unit);
  if (isIsolationExercise(ex) && display < 30) return 0;
  const step = isLowerCompound(ex) ? 5 : 2.5;
  return inputToKg(step, unit);
}

function workingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.weight > 0 || s.reps > 0);
}

export function computeProgressionTarget(
  lastSets: WorkoutSet[],
  exercise: LibraryExercise,
  unit: WeightUnit,
  goal: FitnessGoal
): ProgressionTarget {
  const sets = workingSets(lastSets);
  if (!sets.length) {
    return {
      weightKg: 0,
      reps: repRangeForGoal(goal, isIsolationExercise(exercise)).bottom,
      progressionType: 'baseline',
      note: 'No prior sets — start conservative at RPE 7',
    };
  }

  const lastWeightKg = sets[sets.length - 1].weight || sets[0].weight;
  const reps = sets.map((s) => s.reps);
  const { bottom, top } = repRangeForGoal(goal, isIsolationExercise(exercise));
  const allAtCeiling = reps.every((r) => r >= top);
  const repsDropped =
    reps.length >= 2 &&
    reps[reps.length - 1] < reps[0] &&
    reps[reps.length - 1] < reps[reps.length - 2];
  const weakestRep = Math.min(...reps);

  if (repsDropped && weakestRep < bottom) {
    const reduced = Math.max(0, lastWeightKg * 0.9);
    return {
      weightKg: Math.round(reduced * 10) / 10,
      reps: bottom,
      progressionType: 'reduce',
      note: `Reduce ~10% — reps dropped last session; rebuild at ${formatWeight(reduced, unit)}`,
    };
  }

  if (repsDropped || weakestRep < bottom) {
    const targetRep = Math.min(top, Math.max(...reps) + 1);
    return {
      weightKg: lastWeightKg,
      reps: targetRep,
      progressionType: 'hold',
      note: `HOLD ${formatWeight(lastWeightKg, unit)} — rebuild reps (target ${targetRep})`,
    };
  }

  if (allAtCeiling) {
    const increment = weightIncrementKg(exercise, lastWeightKg, unit);
    const maxBump = lastWeightKg * 0.05;
    const actualIncrement = increment > 0 ? Math.min(increment, maxBump) : 0;
    if (actualIncrement <= 0) {
      return {
        weightKg: lastWeightKg,
        reps: top,
        progressionType: 'reps',
        note: `STAY ${formatWeight(lastWeightKg, unit)} — light load, rep-only progression`,
      };
    }
    const newWeight = lastWeightKg + actualIncrement;
    return {
      weightKg: Math.round(newWeight * 10) / 10,
      reps: bottom,
      progressionType: 'weight',
      note: `Weight bump — hit ${top} reps at ${formatWeight(lastWeightKg, unit)}, move to ${formatWeight(newWeight, unit)}`,
    };
  }

  const targetRep = Math.min(top, weakestRep + 1);
  return {
    weightKg: lastWeightKg,
    reps: targetRep,
    progressionType: 'reps',
    note: `Rep progression — STAY ${formatWeight(lastWeightKg, unit)}, aim ${targetRep} reps`,
  };
}

export function getTargetMuscles(splitId: SplitId): string[] {
  const def = SPLIT_DEFINITIONS.find((s) => s.id === splitId);
  return def?.muscles ?? [];
}

export function formatExerciseCatalog(exercises: LibraryExercise[]): string {
  const byMuscle = new Map<string, { compound: LibraryExercise[]; isolation: LibraryExercise[] }>();

  for (const ex of exercises) {
    const key = ex.muscle;
    if (!byMuscle.has(key)) byMuscle.set(key, { compound: [], isolation: [] });
    const bucket = byMuscle.get(key)!;
    if (isIsolationExercise(ex)) bucket.isolation.push(ex);
    else bucket.compound.push(ex);
  }

  const lines: string[] = [];
  for (const [muscle, { compound, isolation }] of Array.from(byMuscle.entries())) {
    if (compound.length) {
      lines.push(`### ${muscle} — Compound`);
      for (const ex of compound) {
        lines.push(`- ${ex.name} (${ex.equipment}, ${ex.difficulty})`);
      }
    }
    if (isolation.length) {
      lines.push(`### ${muscle} — Isolation`);
      for (const ex of isolation) {
        lines.push(`- ${ex.name} (${ex.equipment}, ${ex.difficulty})`);
      }
    }
  }
  return lines.join('\n');
}

function formatSetLine(sets: WorkoutSet[], unit: WeightUnit): string {
  const working = workingSets(sets);
  if (!working.length) return 'no logged sets';
  return working.map((s) => `${formatWeight(s.weight, unit)}×${s.reps}`).join(', ');
}

export function formatLastWorkoutBlock(
  session: WorkoutSession | null,
  exercises: LibraryExercise[],
  unit: WeightUnit,
  goal: FitnessGoal,
  splitName: string
): string {
  if (!session) {
    return `No prior ${splitName} session logged — design a conservative baseline at RPE 7.`;
  }

  const exByName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]));

  const lines = session.exercises.map((ex) => {
    const lib = exByName.get(ex.name.toLowerCase());
    const setStr = formatSetLine(ex.sets, unit);
    const progression = lib ? computeProgressionTarget(ex.sets, lib, unit, goal) : null;
    const hint = progression ? `\n  → App progression hint: ${progression.note}` : '';
    return `- ${ex.name} | variation: ${ex.variation} | ${ex.sets.length} sets: ${setStr}${hint}`;
  });

  return `Date: ${session.date}\n${lines.join('\n')}`;
}

export function formatPRsForSplit(
  exercises: LibraryExercise[],
  prs: Record<string, PersonalRecord>,
  unit: WeightUnit
): string {
  const lines: string[] = [];
  for (const ex of exercises) {
    const pr = prs[ex.id];
    if (!pr) continue;
    lines.push(`- ${ex.name}: ${formatWeight(pr.weight, unit)} × ${pr.reps} (${pr.date})`);
  }
  return lines.length ? lines.join('\n') : 'No PRs logged for this split yet.';
}

export function getExpandingTrainingWindows(workouts: WorkoutSession[]): number[] {
  if (!workouts.length) return [30];
  const oldest = workouts.reduce(
    (min, w) => (w.date < min ? w.date : min),
    workouts[0].date
  );
  const daysOfHistory = dayjs().diff(dayjs(oldest), 'day');
  const windows: number[] = [30];
  if (daysOfHistory > 30) windows.push(60);
  if (daysOfHistory > 60) windows.push(90);
  if (daysOfHistory > 90) windows.push(180);
  if (daysOfHistory > 180) windows.push(365);
  return windows;
}

function windowLabel(days: number): string {
  if (days === 30) return 'Last 30 days';
  if (days === 60) return 'Last 60 days';
  if (days === 90) return 'Last 90 days';
  if (days === 180) return 'Last 6 months';
  return 'Last 12 months';
}

export function formatTrainingHistoryBlock(
  workouts: WorkoutSession[],
  splitId: SplitId,
  splitName: string
): string {
  if (!workouts.length) {
    return 'No workout history logged yet — treat as a complete beginner. Use conservative volume.';
  }

  const oldest = workouts.reduce(
    (min, w) => (w.date < min ? w.date : min),
    workouts[0].date
  );
  const daysOfData = dayjs().diff(dayjs(oldest), 'day');
  const windows = getExpandingTrainingWindows(workouts);
  const end = dayjs().format('YYYY-MM-DD');

  const splitSessions = workouts.filter((w) => w.splitId === splitId);
  const lastSplitDate = splitSessions[0]?.date ?? null;
  const daysSinceSplit = lastSplitDate ? dayjs().diff(dayjs(lastSplitDate), 'day') : null;

  const lines: string[] = [
    `First logged workout: ${oldest} (${daysOfData} days of data)`,
    '',
  ];

  for (const windowDays of windows) {
    const start = dayjs().subtract(windowDays, 'day').format('YYYY-MM-DD');
    const inWindow = filterByRange(workouts, start, end);
    const splitInWindow = inWindow.filter((w) => w.splitId === splitId);
    const weeks = windowDays / 7;
    const perWeek = Math.round((inWindow.length / weeks) * 10) / 10;
    const splitPerWeek = Math.round((splitInWindow.length / weeks) * 10) / 10;

    lines.push(`${windowLabel(windowDays)}:`);
    lines.push(`- All workouts: ${inWindow.length} sessions (~${perWeek}/week)`);
    lines.push(
      `- ${splitName} (today's split): ${splitInWindow.length} sessions (~${splitPerWeek}/week)`
    );
    if (windowDays === 30 && daysSinceSplit !== null) {
      lines.push(`- Last ${splitName} session: ${daysSinceSplit} days ago`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function formatAthleteProfile(
  profile: UserProfile,
  bodyStats: BodyStat[],
  unit: WeightUnit
): string {
  const sorted = [...bodyStats].sort((a, b) => b.date.localeCompare(a.date));
  const bodyWeight = sorted[0]?.weight ?? profile.weight;
  return [
    `- Age: ${profile.age} | Gender: ${profile.gender}`,
    `- Height: ${profile.height} cm | Body weight: ${bodyWeight} kg (latest logged)`,
    `- Goal: ${profile.goal}`,
    `- Weight unit for ALL lift weights: ${unit}`,
  ].join('\n');
}

export function formatFullWorkoutProtocol(
  exercises: LibraryExercise[],
  getVariations?: (exerciseId: string, baseVariations: string[]) => string[]
): string {
  if (!exercises.length) return '';

  return exercises
    .map((ex, index) => {
      const variations = getVariations?.(ex.id, ex.variations) ?? ex.variations;
      const variationLines = (variations.length ? variations : ['Standard'])
        .map((v, vIdx) => `   ${toSubVariationLabel(vIdx)}) ${v}`)
        .join('\n');
      return `${index + 1}) ${ex.name}\n${variationLines}`;
    })
    .join('\n');
}

export interface BuildAIPromptParams {
  splitName: string;
  targetMuscles: string[];
  athleteProfileBlock: string;
  trainingHistoryBlock: string;
  exerciseCatalog: string;
  fullWorkoutProtocolBlock: string;
  lastSessionBlock: string;
  prBlock: string;
  weightUnit: WeightUnit;
}

export function buildAIPrompt(params: BuildAIPromptParams): string {
  return `You are an expert fitness coach AI. I will give you my workout details and you must return a structured JSON workout plan.
Today's workout focus: ${params.splitName}
Available exercises (you MUST only pick from this list, no exceptions):
${params.exerciseCatalog}
Last workout for this body part:
${params.lastSessionBlock}
(If this is your first time, write: "This is my first session for this body part")
Your task:

Select the best exercises from the available list above only
selected workouts shoudl Ensure all muscle parts of ${params.splitName} are fully covered
Sequence should be correct as per the real time trainer suggestions.
Apply progressive overload or variation based on my last workout history

Return ONLY this JSON format, no extra text, no markdown, no explanation:
[
  { "exerciseName": "Barbell Bench Press", "sets": 4, "reps": "8", "weight": 80, "notes": "Focus on full range" },
  { "exerciseName": "Incline Dumbbell Press", "sets": 3, "reps": "10", "weight": 22, "notes": "Progressive overload from last session" }
]
Remember: only exercises from my list, valid JSON only, no other text.`;
}

export function normalizeImportedReps(reps: string): string {
  const trimmed = reps.trim();
  const rangeMatch = trimmed.match(/^(\d+)\s*[-–]\s*\d+$/);
  if (rangeMatch) return rangeMatch[1];
  if (trimmed.includes(',')) return trimmed.split(',')[0].trim();
  return trimmed;
}

export function clampImportedWeight(
  exerciseName: string,
  aiWeightDisplay: number,
  unit: WeightUnit,
  goal: FitnessGoal,
  lastSession: WorkoutSession | null,
  library: LibraryExercise[]
): number {
  if (!lastSession || aiWeightDisplay <= 0) return aiWeightDisplay;

  const lib = library.find((e) => e.name.toLowerCase() === exerciseName.toLowerCase());
  if (!lib) return aiWeightDisplay;

  const lastEx = lastSession.exercises.find(
    (e) => e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  if (!lastEx) return aiWeightDisplay;

  const target = computeProgressionTarget(lastEx.sets, lib, unit, goal);
  if (target.progressionType !== 'weight') {
    const lastKg = workingSets(lastEx.sets).at(-1)?.weight ?? 0;
    const lastDisplay = displayWeight(lastKg, unit);
    if (aiWeightDisplay > lastDisplay) return lastDisplay;
    return aiWeightDisplay;
  }

  const maxDisplay = displayWeight(target.weightKg, unit);
  return Math.min(aiWeightDisplay, maxDisplay);
}
