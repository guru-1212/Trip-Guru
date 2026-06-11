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

const PROGRESSION_RULES = `## Progressive overload rules (CRITICAL)
Default strategy: DOUBLE PROGRESSION — increase REPS before WEIGHT.

For each exercise, use the "App progression hint" from last session:

1. REP PROGRESSION (most common — ~80% of exercises):
   - Keep the SAME weight as last session.
   - Target +1 rep on the weakest set.
   - Example: last 20kg×8,8,8 → suggest 20kg×9 with notes "Rep progression — stay at 20kg".

2. WEIGHT PROGRESSION (only when ALL sets hit the TOP of the rep range):
   - Then increase weight per increment table and RESET reps to bottom of range.
   - Example: last 20kg×12,12,12 → suggest 22.5kg×8 (not 25kg).

3. HOLD / REDUCE (when reps dropped):
   - Same weight or reduce ~10%. Do NOT increase weight.

4. MAX weight increases per session: at most 1–2 exercises (primary compounds only).

5. INCREMENT TABLE (only when rule 2 applies):
   - Isolation/cable under 30kg: rep-only OR +1.25kg max
   - Isolation 30kg+: +2.5kg max
   - Upper compound: +2.5kg | Lower compound: +5kg
   - Never jump more than 5% of previous weight

6. notes MUST explain the progression choice.`;

const EXPERIENCE_RULES = `## Training experience rules (based on history + body stats)
- < 4 sessions on this split in last 30 days: 4–5 exercises, 3 sets each, RPE 7, no weight increases
- 4–8 sessions on this split in last 30 days: 5–6 exercises, standard double progression
- 8+ sessions on this split in last 30 days: 5–6 exercises, can add 1 back-off set on compounds if progressing well
- 14+ days since last session on this split: re-entry — reduce suggested weights 10% OR same weight minus 1 set
- Scale expectations to body weight, height, and goal`;

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
  const muscles = params.targetMuscles.join(', ');

  return `You are an expert strength & hypertrophy coach designing ONE gym session.

## Athlete profile
${params.athleteProfileBlock}
- Today's split: ${params.splitName}
- Target muscles (must all be trained): ${muscles}

## Training history (how often I train — use to judge experience & recovery)
${params.trainingHistoryBlock}

## Allowed exercises (ONLY these — copy exerciseName EXACTLY as written)
${params.exerciseCatalog}

## Full workout protocol (all exercises & variations for this split)
${params.fullWorkoutProtocolBlock}

## Last ${params.splitName} session
${params.lastSessionBlock}

## Personal records (reference only — do not exceed without notes)
${params.prBlock}

${PROGRESSION_RULES}

${EXPERIENCE_RULES}

## Programming rules
1. Design today's session by choosing from the full workout protocol above — guided by the last session, progression hints, PRs, and training history. Do NOT use any pre-selected plan; decide based on my data.
2. Match the exercise count and order from the last session when one exists (often 7–8 slots). If no last session, select 5–6 exercises. Every exerciseName MUST match the allowed list character-for-character.
3. Muscle coverage: at least 1 compound + 1 isolation per target muscle group.
4. Order: follow the same training order style as the last session when available; otherwise compounds first, isolations last.
5. Follow DOUBLE PROGRESSION and each exercise's App progression hint. Do NOT add weight every session.
6. Sets: 3–4 for compounds, 3 for isolations. Match rep ranges to my goal.
7. Bodyweight exercises: use weight 0.
8. Do NOT invent exercises not on the list.

## Output format — CRITICAL
Your ENTIRE response must be ONLY a raw JSON array — nothing before it, nothing after it.
- NO markdown
- NO code fences
- NO explanation, greeting, or summary text
- NO comments
- Start with [ and end with ]

[
  {
    "exerciseName": "Bench Press",
    "sets": 4,
    "reps": "8",
    "weight": 80,
    "notes": "Rep progression — stay at 80kg, aim 8,8,8,8; no weight increase yet"
  }
]

Field rules:
- exerciseName: exact string from allowed list
- sets: integer 2–5
- reps: single number as string (e.g. "8") — NOT ranges like "8-10"
- weight: number in ${params.weightUnit}; 0 for bodyweight
- notes: brief coaching note (max 120 chars)`;
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
