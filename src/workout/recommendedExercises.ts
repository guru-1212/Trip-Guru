import type { MuscleGroup, SplitId } from './types';
import { COMBINED_SPLIT_COMPONENTS } from './constants';

/**
 * Curated starting points. Ids reference EXERCISE_LIBRARY; the lists are
 * validated against the library and split pools in fittrack.test.ts.
 */

/** Go-to exercises per coarse muscle group (used for ⭐ badges when browsing any group). */
export const RECOMMENDED_BY_MUSCLE: Record<MuscleGroup, string[]> = {
  Chest: ['bench-press', 'incline-press', 'chest-fly', 'chest-press-machine', 'push-ups'],
  Back: ['deadlift', 'pull-ups', 'rows', 'lat-pulldown', 'straight-arm-pulldown'],
  Shoulders: ['overhead-press', 'lateral-raises', 'rear-delt', 'face-pulls', 'front-raises'],
  Triceps: ['tricep-pushdown', 'skull-crushers', 'overhead-tricep-extension', 'tricep-dips'],
  Biceps: ['barbell-curl', 'hammer-curl', 'preacher-curl', 'concentration-curl'],
  Legs: ['squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'lunges', 'hip-thrust', 'calf-raises'],
  Core: ['plank', 'hanging-leg-raises', 'crunches', 'russian-twists', 'ab-wheel-rollout'],
};

/** Ordered "use recommended" session per split (compound lifts first). */
export const RECOMMENDED_EXERCISES: Record<SplitId, string[]> = {
  ct: [
    'bench-press',
    'incline-press',
    'chest-press-machine',
    'chest-fly',
    'tricep-dips',
    'tricep-pushdown',
    'skull-crushers',
    'overhead-tricep-extension',
  ],
  bb: [
    'deadlift',
    'pull-ups',
    'rows',
    'lat-pulldown',
    'straight-arm-pulldown',
    'face-pulls',
    'barbell-curl',
    'hammer-curl',
  ],
  sh: [
    'overhead-press',
    'lateral-raises',
    'rear-delt',
    'front-raises',
    'upright-row',
    'face-pulls',
    'shrugs',
  ],
  ctbb: [
    'bench-press',
    'incline-press',
    'chest-fly',
    'tricep-pushdown',
    'rows',
    'lat-pulldown',
    'pull-ups',
    'barbell-curl',
  ],
  legs: [
    'squat',
    'romanian-deadlift',
    'leg-press',
    'lunges',
    'leg-curl',
    'leg-extension',
    'hip-thrust',
    'calf-raises',
  ],
  core: [
    'plank',
    'hanging-leg-raises',
    'crunches',
    'russian-twists',
    'ab-wheel-rollout',
    'cable-woodchoppers',
    'dead-bug',
  ],
  coresh: [
    'overhead-press',
    'lateral-raises',
    'rear-delt',
    'face-pulls',
    'plank',
    'hanging-leg-raises',
    'crunches',
    'russian-twists',
  ],
  legsh: [
    'squat',
    'romanian-deadlift',
    'leg-press',
    'leg-curl',
    'calf-raises',
    'overhead-press',
    'lateral-raises',
    'rear-delt',
  ],
  push: [
    'bench-press',
    'overhead-press',
    'incline-press',
    'chest-fly',
    'lateral-raises',
    'tricep-pushdown',
    'overhead-tricep-extension',
    'tricep-dips',
  ],
  pull: [
    'deadlift',
    'pull-ups',
    'rows',
    'lat-pulldown',
    'face-pulls',
    'barbell-curl',
    'hammer-curl',
    'reverse-curl',
  ],
  legscore: [
    'squat',
    'romanian-deadlift',
    'leg-press',
    'leg-curl',
    'lunges',
    'calf-raises',
    'hanging-leg-raises',
    'plank',
  ],
  rest: [],
};

/** The curated session for a split, in order. */
export function getRecommendedForSplit(splitId: SplitId): string[] {
  return RECOMMENDED_EXERCISES[splitId] ?? [];
}

/**
 * True when the exercise is recommended for the split — either in its own
 * curated list or (for combined splits) in a component split's list.
 */
export function isRecommendedForSplit(exerciseId: string, splitId: SplitId): boolean {
  if (getRecommendedForSplit(splitId).includes(exerciseId)) return true;
  const components = COMBINED_SPLIT_COMPONENTS[splitId] ?? [];
  return components.some((c) => getRecommendedForSplit(c).includes(exerciseId));
}

export function isRecommendedForMuscle(exerciseId: string, muscle: MuscleGroup): boolean {
  return (RECOMMENDED_BY_MUSCLE[muscle] ?? []).includes(exerciseId);
}
