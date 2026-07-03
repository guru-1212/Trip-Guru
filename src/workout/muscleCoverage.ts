import anatomy from './muscleAnatomy.json';
import { EXERCISE_LIBRARY } from './exerciseLibrary';
import { SPLIT_DEFINITIONS } from './constants';
import type { CustomExercise, LibraryExercise, SplitId, TodayExercisePick } from './types';

/** A fine-grained muscle region id from muscleAnatomy.json (e.g. 'chest-upper'). */
export type SubMuscleId = string;

/**
 * Visual state of a muscle region on the body map:
 * - covered   → a picked exercise hits it as a PRIMARY target (bright green)
 * - secondary → only hit as a secondary target so far (soft green)
 * - pending   → part of today's split but no pick hits it yet (red)
 * - idle      → not part of today's split (grey)
 */
export type MuscleState = 'covered' | 'secondary' | 'pending' | 'idle';

export interface SubMuscle {
  id: SubMuscleId;
  name: string;
  group: string;
}

export interface ExerciseTargets {
  primary: SubMuscleId[];
  secondary: SubMuscleId[];
}

export const SUB_MUSCLES: SubMuscle[] = anatomy.muscles;

const GROUP_TO_MUSCLES: Record<string, SubMuscleId[]> = anatomy.groupToMuscles;
const EXERCISE_TARGETS: Record<string, ExerciseTargets> = anatomy.exercises;

export function getSubMuscleName(id: SubMuscleId): string {
  return SUB_MUSCLES.find((m) => m.id === id)?.name ?? id;
}

/**
 * Detailed targets for an exercise. Custom exercises (no entry in the JSON)
 * fall back to their coarse muscle group's regions.
 */
export function getExerciseTargets(
  exerciseId: string,
  customExercises: CustomExercise[] = []
): ExerciseTargets {
  const mapped = EXERCISE_TARGETS[exerciseId];
  if (mapped) return mapped;

  const custom = customExercises.find((e) => e.id === exerciseId);
  if (custom) {
    return {
      primary: GROUP_TO_MUSCLES[custom.muscle] ?? [],
      secondary: custom.secondary ? (GROUP_TO_MUSCLES[custom.secondary] ?? []) : [],
    };
  }
  return { primary: [], secondary: [] };
}

/** All muscle regions today's split is expected to train. */
export function getSplitSubMuscles(splitId: SplitId): Set<SubMuscleId> {
  const split = SPLIT_DEFINITIONS.find((s) => s.id === splitId);
  const result = new Set<SubMuscleId>();
  if (!split) return result;
  for (const group of split.muscles) {
    for (const sub of GROUP_TO_MUSCLES[group] ?? []) result.add(sub);
  }
  return result;
}

/** Body-map state for every muscle region, given the split and current picks. */
export function computeMuscleStates(
  splitId: SplitId,
  picks: TodayExercisePick[],
  customExercises: CustomExercise[] = []
): Record<SubMuscleId, MuscleState> {
  const splitMuscles = getSplitSubMuscles(splitId);
  const hitPrimary = new Set<SubMuscleId>();
  const hitSecondary = new Set<SubMuscleId>();

  for (const pick of picks) {
    const targets = getExerciseTargets(pick.exerciseId, customExercises);
    targets.primary.forEach((m) => hitPrimary.add(m));
    targets.secondary.forEach((m) => hitSecondary.add(m));
  }

  const states: Record<SubMuscleId, MuscleState> = {};
  for (const muscle of SUB_MUSCLES) {
    if (hitPrimary.has(muscle.id)) states[muscle.id] = 'covered';
    else if (hitSecondary.has(muscle.id)) states[muscle.id] = 'secondary';
    else if (splitMuscles.has(muscle.id)) states[muscle.id] = 'pending';
    else states[muscle.id] = 'idle';
  }
  return states;
}

export interface CoverageSuggestion {
  muscleId: SubMuscleId;
  muscleName: string;
  /** Best library exercise (belonging to this split) that primarily hits the muscle. */
  exerciseId: string;
  exerciseName: string;
}

/** Split-aware library pool (mirrors getExercisesForSplit's combined-split logic). */
function exercisesForSplit(splitId: SplitId) {
  if (splitId === 'ctbb') {
    return EXERCISE_LIBRARY.filter((e) => e.splitIds.includes('ct') || e.splitIds.includes('bb'));
  }
  if (splitId === 'coresh') {
    return EXERCISE_LIBRARY.filter((e) => e.splitIds.includes('core') || e.splitIds.includes('sh'));
  }
  return EXERCISE_LIBRARY.filter((e) => e.splitIds.includes(splitId));
}

export interface MuscleExerciseMatch {
  exercise: LibraryExercise;
  /** How the exercise hits the tapped muscle(s). */
  role: 'primary' | 'secondary';
  /** Whether the exercise belongs to today's split. */
  inSplit: boolean;
}

/**
 * All library exercises that hit any of the given muscles, for the
 * tap-a-muscle popup. Sorted: today's split first, primary before secondary,
 * then by name.
 */
export function getExercisesForMuscles(
  muscleIds: SubMuscleId[],
  splitId: SplitId
): MuscleExerciseMatch[] {
  const splitIds = new Set(exercisesForSplit(splitId).map((e) => e.id));
  const wanted = new Set(muscleIds);
  const matches: MuscleExerciseMatch[] = [];

  for (const exercise of EXERCISE_LIBRARY) {
    const targets = EXERCISE_TARGETS[exercise.id];
    if (!targets) continue;
    const role = targets.primary.some((m) => wanted.has(m))
      ? 'primary'
      : targets.secondary.some((m) => wanted.has(m))
        ? 'secondary'
        : null;
    if (!role) continue;
    matches.push({ exercise, role, inSplit: splitIds.has(exercise.id) });
  }

  return matches.sort((a, b) => {
    if (a.inSplit !== b.inSplit) return a.inSplit ? -1 : 1;
    if (a.role !== b.role) return a.role === 'primary' ? -1 : 1;
    return a.exercise.name.localeCompare(b.exercise.name);
  });
}

/**
 * For every split muscle not yet primarily covered, suggest one un-picked
 * exercise from the library that hits it as a primary target.
 */
export function getCoverageSuggestions(
  splitId: SplitId,
  picks: TodayExercisePick[],
  customExercises: CustomExercise[] = []
): CoverageSuggestion[] {
  const states = computeMuscleStates(splitId, picks, customExercises);
  const pickedIds = new Set(picks.map((p) => p.exerciseId));
  const pool = exercisesForSplit(splitId);
  const suggestions: CoverageSuggestion[] = [];

  for (const muscle of SUB_MUSCLES) {
    const state = states[muscle.id];
    if (state !== 'pending' && state !== 'secondary') continue;

    const candidate = pool.find(
      (ex) =>
        !pickedIds.has(ex.id) &&
        (EXERCISE_TARGETS[ex.id]?.primary ?? []).includes(muscle.id)
    );
    if (candidate) {
      suggestions.push({
        muscleId: muscle.id,
        muscleName: muscle.name,
        exerciseId: candidate.id,
        exerciseName: candidate.name,
      });
    }
  }
  return suggestions;
}
