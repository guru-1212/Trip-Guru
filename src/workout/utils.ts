import dayjs from 'dayjs';
import type {
  ActiveWorkoutState,
  CustomExercise,
  DayKey,
  HabitDay,
  LibraryExercise,
  MuscleGroup,
  PersonalRecord,
  SplitId,
  TodayExercisePick,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
  VariationImageMap,
} from './types';
import { DAY_KEYS } from './constants';
import { getExerciseById, getExercisesForSplit } from './exerciseLibrary';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getTodayDayKey(): DayKey {
  const day = dayjs().day();
  const map: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[day];
}

export function getDayKeyForDate(dateStr: string): DayKey {
  const map: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[dayjs(dateStr).day()];
}

export function getGreeting(): string {
  const hour = dayjs().hour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function calcSetVolume(set: WorkoutSet): number {
  if (!set.done || set.weight <= 0 || set.reps <= 0) return 0;
  return set.weight * set.reps;
}

export function calcExerciseVolume(exercise: WorkoutExercise): number {
  return exercise.sets.reduce((sum, s) => sum + calcSetVolume(s), 0);
}

export function calcWorkoutVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, e) => sum + calcExerciseVolume(e), 0);
}

export function countCompletedSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.done).length, 0);
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

export function displayWeight(kg: number, unit: 'kg' | 'lbs'): number {
  return unit === 'kg' ? kg : kgToLbs(kg);
}

export function inputToKg(value: number, unit: 'kg' | 'lbs'): number {
  return unit === 'kg' ? value : lbsToKg(value);
}

export function formatWeight(kg: number, unit: 'kg' | 'lbs'): string {
  const val = displayWeight(kg, unit);
  return `${val}${unit}`;
}

/** Epley formula — estimated one-rep max from weight and reps. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function suggestWeight(
  lastWeight: number,
  lastReps: number,
  unit: 'kg' | 'lbs'
): number {
  if (lastWeight <= 0) return 0;
  
  const increment = unit === 'kg' ? 2.5 : 5;
  // Heuristic: if reps were >= 10 (good effort), suggest a small increase
  if (lastReps >= 10) {
    return inputToKg(displayWeight(lastWeight, unit) + increment, unit);
  }
  
  return lastWeight;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatCountdownHMS(totalSeconds: number): string {
  const abs = Math.abs(Math.ceil(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Training week runs Mon–Sun; resets at midnight each Monday. */
export function getTrackingWeekStart(date: dayjs.ConfigType = dayjs()): dayjs.Dayjs {
  const d = dayjs(date);
  // (d.day() + 6) % 7: Mon=0, Tue=1, ..., Sat=5, Sun=6
  const daysSinceMonday = (d.day() + 6) % 7;
  return d.subtract(daysSinceMonday, 'day').startOf('day');
}

export function getTrackingWeekEnd(date: dayjs.ConfigType = dayjs()): dayjs.Dayjs {
  return getTrackingWeekStart(date).add(6, 'day').endOf('day');
}

export function getWeekStart(date: dayjs.ConfigType = dayjs()): string {
  return getTrackingWeekStart(date).format('YYYY-MM-DD');
}

export function getTrackingWeekNumber(date: dayjs.ConfigType = dayjs()): number {
  const d = dayjs(date);
  const weekStart = getTrackingWeekStart(d);
  const yearWeekOne = getTrackingWeekStart(d.startOf('year'));
  return weekStart.diff(yearWeekOne, 'week') + 1;
}

export function getTrackingWeekRangeLabel(date: dayjs.ConfigType = dayjs()): string {
  const start = getTrackingWeekStart(date);
  const end = getTrackingWeekEnd(date);
  return `${start.format('MMM D')} – ${end.format('MMM D')}`;
}

export function filterWorkoutsInTrackingWeek(
  workouts: WorkoutSession[],
  refDate: dayjs.ConfigType = dayjs()
): WorkoutSession[] {
  const start = getTrackingWeekStart(refDate).format('YYYY-MM-DD');
  const end = getTrackingWeekEnd(refDate).format('YYYY-MM-DD');
  return getWorkoutsInRange(workouts, start, end);
}

export function isSameDay(d1: string, d2: string): boolean {
  return dayjs(d1).isSame(dayjs(d2), 'day');
}

export function isYesterday(date: string): boolean {
  return dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day');
}

export function getTodaysSplit(profile: UserProfile): SplitId {
  const dayKey = getTodayDayKey();
  return profile.weekSchedule[dayKey];
}

/**
 * The ordered rotation cycle of workout splits, derived from the weekly plan
 * (weekday order, rest days excluded, duplicates collapsed). This is the
 * sequence the app advances through as you train.
 */
export function getRotationQueue(profile: UserProfile): SplitId[] {
  const seen = new Set<SplitId>();
  const queue: SplitId[] = [];
  for (const day of DAY_KEYS) {
    const split = profile.weekSchedule[day];
    if (split !== 'rest' && !seen.has(split)) {
      seen.add(split);
      queue.push(split);
    }
  }
  return queue;
}

/** The split that follows `lastSplit` in the rotation (wraps; null → first). */
export function getNextRotationSplit(lastSplit: SplitId | null, queue: SplitId[]): SplitId | null {
  if (queue.length === 0) return null;
  if (!lastSplit) return queue[0];
  const idx = queue.indexOf(lastSplit);
  if (idx === -1) return queue[0];
  return queue[(idx + 1) % queue.length];
}

/**
 * Rotation-aware scheduled split for a date, tolerant of skipped days.
 * - A planned rest weekday OR an explicitly-rested date is a rest anchor → 'rest'.
 * - Otherwise it's the next split in the rotation after the most recent workout
 *   logged strictly BEFORE this date. Because a skipped day logs no workout, the
 *   "next" split simply carries over to the following training day.
 */
export function getScheduledSplitForDate(
  dateStr: string,
  profile: UserProfile,
  workouts: WorkoutSession[],
  restDays: string[] = []
): SplitId {
  const dayKey = getDayKeyForDate(dateStr);
  if (profile.weekSchedule[dayKey] === 'rest') return 'rest';
  if (restDays.includes(dateStr)) return 'rest';

  const queue = getRotationQueue(profile);
  if (queue.length === 0) return 'rest';

  const target = dayjs(dateStr);
  const lastBefore = workouts
    .filter((w) => dayjs(w.date).isBefore(target, 'day') && queue.includes(w.splitId))
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())[0];

  return getNextRotationSplit(lastBefore?.splitId ?? null, queue) ?? 'rest';
}

/** Training days in the weekly split (non-rest days). */
export function countScheduledWorkoutDays(profile: UserProfile): number {
  return DAY_KEYS.filter((day) => profile.weekSchedule[day] !== 'rest').length;
}

export function getLastTrainedDate(workouts: WorkoutSession[], splitId: SplitId): string | null {
  const match = workouts
    .filter((w) => w.splitId === splitId)
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())[0];
  return match?.date ?? null;
}

export function getLastSessionsForSplit(
  workouts: WorkoutSession[],
  splitId: SplitId,
  limit = 3
): WorkoutSession[] {
  return workouts
    .filter((w) => w.splitId === splitId)
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
    .slice(0, limit);
}

export function repeatSessionPresetKey(exerciseId: string, variation: string): string {
  return `${exerciseId}::${variation}`;
}

export function buildRepeatDataFromSession(session: WorkoutSession): {
  picks: TodayExercisePick[];
  presets: Map<string, WorkoutSet[]>;
} {
  const presets = new Map<string, WorkoutSet[]>();
  const picks: TodayExercisePick[] = session.exercises.map((e) => {
    const doneSets = e.sets.filter((s) => s.done && (s.weight > 0 || s.reps > 0));
    if (doneSets.length > 0) {
      presets.set(
        repeatSessionPresetKey(e.exerciseId, e.variation),
        doneSets.map((s) => ({ weight: s.weight, reps: s.reps, done: false }))
      );
    }
    return {
      id: generateId(),
      exerciseId: e.exerciseId,
      variation: e.variation,
    };
  });
  return { picks, presets };
}

export interface LastExerciseSession {
  date: string;
  variation: string;
  sets: { weight: number; reps: number }[];
  bestSet: { weight: number; reps: number };
  notes?: string;
}

function normalizeVariation(variation: string): string {
  return variation.trim();
}

function variationMatches(a: string, b: string): boolean {
  return normalizeVariation(a) === normalizeVariation(b);
}

export function getLastExerciseSession(
  workouts: WorkoutSession[],
  exerciseId: string,
  variation?: string
): LastExerciseSession | null {
  for (const w of [...workouts].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())) {
    const ex = w.exercises.find((e) => {
      if (e.exerciseId !== exerciseId) return false;
      if (variation !== undefined && !variationMatches(e.variation, variation)) return false;
      return true;
    });
    if (!ex) continue;
    const doneSets = ex.sets.filter((s) => s.done && s.weight > 0);
    if (doneSets.length === 0) continue;
    const best = [...doneSets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    return {
      date: w.date,
      variation: ex.variation,
      sets: doneSets.map((s) => ({ weight: s.weight, reps: s.reps })),
      bestSet: { weight: best.weight, reps: best.reps },
      notes: ex.notes,
    };
  }
  return null;
}

export function getPickedVariations(ex: WorkoutExercise): string[] {
  if (ex.pickedVariations?.length) return ex.pickedVariations;
  return [ex.variation];
}

export function getSetsForVariation(ex: WorkoutExercise, variation: string): WorkoutSet[] {
  if (ex.setsByVariation?.[variation]) return ex.setsByVariation[variation];
  if (variationMatches(ex.variation, variation)) return ex.sets;
  return [];
}

export function patchExerciseSets(ex: WorkoutExercise, sets: WorkoutSet[]): WorkoutExercise {
  if (!ex.setsByVariation) {
    return { ...ex, sets };
  }
  return {
    ...ex,
    sets,
    setsByVariation: { ...ex.setsByVariation, [ex.variation]: sets },
  };
}

export function migrateWorkoutExercise(ex: WorkoutExercise, defaultSets: number): WorkoutExercise {
  if (ex.setsByVariation && Object.keys(ex.setsByVariation).length > 0) {
    const pickedVariations = ex.pickedVariations?.length ? ex.pickedVariations : getPickedVariations(ex);
    const setsByVariation = { ...ex.setsByVariation, [ex.variation]: ex.sets };
    return {
      ...ex,
      pickedVariations,
      setsByVariation,
      sets: setsByVariation[ex.variation] ?? ex.sets,
    };
  }

  const pickedVariations = ex.pickedVariations?.length ? ex.pickedVariations : [ex.variation];
  const setsByVariation: Record<string, WorkoutSet[]> = {};
  for (const v of pickedVariations) {
    setsByVariation[v] = variationMatches(v, ex.variation) ? ex.sets : createDefaultSets(defaultSets);
  }
  if (!setsByVariation[ex.variation]) {
    setsByVariation[ex.variation] = ex.sets;
  }

  return {
    ...ex,
    pickedVariations,
    setsByVariation,
    sets: setsByVariation[ex.variation] ?? ex.sets,
  };
}

export function migrateActiveWorkoutState(
  state: ActiveWorkoutState,
  defaultSets: number
): ActiveWorkoutState {
  const exercises = state.exercises.map((ex) => migrateWorkoutExercise(ex, defaultSets));
  const pickOrder =
    state.pickOrder?.length
      ? state.pickOrder
      : exercises.filter(isPickedToday).map((e) => e.exerciseId);
  return {
    ...state,
    exercises,
    pickOrder,
  };
}

export function switchActiveVariation(
  ex: WorkoutExercise,
  nextVariation: string,
  defaultSets: number
): WorkoutExercise {
  if (variationMatches(ex.variation, nextVariation)) return ex;

  const setsByVariation = { ...(ex.setsByVariation ?? { [ex.variation]: ex.sets }) };
  setsByVariation[ex.variation] = ex.sets;

  const nextSets = setsByVariation[nextVariation] ?? createDefaultSets(defaultSets);
  setsByVariation[nextVariation] = nextSets;

  return {
    ...ex,
    variation: nextVariation,
    sets: nextSets,
    setsByVariation,
  };
}

export function toSubVariationLabel(index: number): string {
  const labels = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  return labels[index] ?? String(index + 1);
}

export function applyWorkoutExerciseFromPicks(
  ex: WorkoutExercise,
  pickedVariations: string[],
  defaultSets: number
): WorkoutExercise {
  const uniqueVariations: string[] = [];
  for (const v of pickedVariations) {
    if (!v || uniqueVariations.includes(v)) continue;
    uniqueVariations.push(v);
  }
  if (!uniqueVariations.length) return ex;

  const setsByVariation = Object.fromEntries(
    uniqueVariations.map((v) => [v, createDefaultSets(defaultSets)])
  );
  const activeVariation = uniqueVariations[0];

  return {
    ...ex,
    pickedToday: true,
    pickedVariations: uniqueVariations,
    variation: activeVariation,
    sets: setsByVariation[activeVariation],
    setsByVariation,
  };
}

export function isVariationFullyDone(ex: WorkoutExercise, variation: string): boolean {
  const sets = getSetsForVariation(ex, variation);
  return sets.length > 0 && sets.every((s) => s.done);
}

export function isExerciseFullyDone(ex: WorkoutExercise): boolean {
  const vars = getPickedVariations(ex);
  if (!vars.length) return false;
  return vars.every((v) => isVariationFullyDone(ex, v));
}

export function exerciseHasLoggedSets(ex: WorkoutExercise): boolean {
  if (ex.setsByVariation) {
    return Object.values(ex.setsByVariation).some((sets) => sets.some((s) => s.done));
  }
  return ex.sets.some((s) => s.done);
}

function exerciseCompletionTier(ex: WorkoutExercise): number {
  if (isExerciseFullyDone(ex)) return 0;
  if (exerciseHasLoggedSets(ex)) return 1;
  return 2;
}

export function sortExercisesByCompletion(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return [...exercises].sort((a, b) => {
    const tierDiff = exerciseCompletionTier(a) - exerciseCompletionTier(b);
    if (tierDiff !== 0) return tierDiff;
    return a.name.localeCompare(b.name);
  });
}

export function isPickedToday(ex: WorkoutExercise): boolean {
  return ex.pickedToday !== false;
}

export function partitionExercisesByPick(exercises: WorkoutExercise[]): {
  picked: WorkoutExercise[];
  unpicked: WorkoutExercise[];
} {
  const picked: WorkoutExercise[] = [];
  const unpicked: WorkoutExercise[] = [];
  for (const ex of exercises) {
    if (isPickedToday(ex)) picked.push(ex);
    else unpicked.push(ex);
  }
  return { picked, unpicked };
}

export function countPickedExercisesDone(exercises: WorkoutExercise[]): { done: number; total: number } {
  const picked = exercises.filter(isPickedToday);
  return {
    done: picked.filter(isExerciseFullyDone).length,
    total: picked.length,
  };
}

export function countVariationsInTodayPicks(picks: TodayExercisePick[]): number {
  return picks.length;
}

export function countPickedVariationsDone(exercises: WorkoutExercise[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const ex of exercises.filter(isPickedToday)) {
    const vars = getPickedVariations(ex);
    total += vars.length;
    done += vars.filter((v) => isVariationFullyDone(ex, v)).length;
  }
  return { done, total };
}

function stripSessionExerciseFields(ex: WorkoutExercise): WorkoutExercise {
  const { pickedVariations: _pv, setsByVariation: _sbv, ...rest } = ex;
  return rest;
}

export function expandExercisesForSave(exercises: WorkoutExercise[]): WorkoutExercise[] {
  const result: WorkoutExercise[] = [];

  for (const ex of exercises) {
    const vars = getPickedVariations(ex);
    const syncedSetsByVariation = ex.setsByVariation
      ? { ...ex.setsByVariation, [ex.variation]: ex.sets }
      : undefined;

    if (!syncedSetsByVariation || vars.length <= 1) {
      result.push(stripSessionExerciseFields(ex));
      continue;
    }

    for (const v of vars) {
      result.push(
        stripSessionExerciseFields({
          ...ex,
          variation: v,
          sets: syncedSetsByVariation[v] ?? createDefaultSets(ex.sets.length || 3),
        })
      );
    }
  }

  return result;
}

export function filterExercisesForSave(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return expandExercisesForSave(exercises).filter(
    (ex) => isPickedToday(ex) || exerciseHasLoggedSets(ex)
  );
}

export function defaultVariationForExercise(
  exerciseId: string,
  exercisesById: Map<string, Pick<LibraryExercise, 'variations'>>
): string {
  return exercisesById.get(exerciseId)?.variations[0] ?? 'Standard';
}

type LegacyTodayExercisePick = {
  exerciseId: string;
  variation?: string;
  variations?: string[];
};

function mergeTodayPickVariations(
  byExercise: Map<string, Set<string>>,
  exerciseId: string,
  variations: string[]
): void {
  const set = byExercise.get(exerciseId) ?? new Set<string>();
  for (const v of variations) {
    if (v) set.add(v);
  }
  byExercise.set(exerciseId, set);
}

export function normalizeSavedTodayPicks(
  saved: TodayExercisePick[] | string[] | LegacyTodayExercisePick[] | undefined,
  validExerciseIds: Set<string>,
  exercisesById: Map<string, Pick<LibraryExercise, 'variations'>>
): TodayExercisePick[] {
  if (!saved?.length) return [];

  // 1. Check if already in new flat format
  if (typeof saved[0] === 'object' && 'id' in saved[0] && 'variation' in saved[0]) {
    return (saved as TodayExercisePick[]).filter((p) => validExerciseIds.has(p.exerciseId));
  }

  // 2. Backward compatibility: Handle old string array format [id, id, ...]
  if (typeof saved[0] === 'string') {
    const result: TodayExercisePick[] = [];
    for (const exerciseId of saved as string[]) {
      if (!validExerciseIds.has(exerciseId)) continue;
      result.push({
        id: generateId(),
        exerciseId,
        variation: defaultVariationForExercise(exerciseId, exercisesById),
      });
    }
    return result;
  }

  // 3. Backward compatibility: Handle old LegacyTodayExercisePick format
  const result: TodayExercisePick[] = [];
  for (const raw of saved as LegacyTodayExercisePick[]) {
    if (!validExerciseIds.has(raw.exerciseId)) continue;
    const variations = raw.variations?.length
      ? raw.variations
      : [
          raw.variation ||
            defaultVariationForExercise(raw.exerciseId, exercisesById),
        ];
    
    for (const v of variations) {
      if (!v) continue;
      result.push({
        id: generateId(),
        exerciseId: raw.exerciseId,
        variation: v,
      });
    }
  }

  return result;
}

export function todayPicksToMap(picks: TodayExercisePick[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const pick of picks) {
    const vars = map.get(pick.exerciseId) ?? [];
    if (!vars.includes(pick.variation)) {
      vars.push(pick.variation);
    }
    map.set(pick.exerciseId, vars);
  }
  return map;
}

export function mapToTodayPicks(picksMap: Map<string, string[]>): TodayExercisePick[] {
  const result: TodayExercisePick[] = [];
  for (const [exerciseId, variations] of Array.from(picksMap.entries())) {
    for (const variation of variations) {
      result.push({ id: generateId(), exerciseId, variation });
    }
  }
  return result;
}

export function pickOrderFromPicks(picks: TodayExercisePick[]): string[] {
  return picks.map((p) => `${p.exerciseId}::${p.variation}`);
}

export function sortExercisesByPickOrder(
  exercises: WorkoutExercise[],
  pickOrderKeys: string[]
): WorkoutExercise[] {
  const orderIndex = new Map(pickOrderKeys.map((key, i) => [key, i]));
  return [...exercises].sort((a, b) => {
    const aKey = `${a.exerciseId}::${a.variation}`;
    const bKey = `${b.exerciseId}::${b.variation}`;
    const aIdx = orderIndex.get(aKey);
    const bIdx = orderIndex.get(bKey);
    const aOrder = aIdx === undefined ? Number.MAX_SAFE_INTEGER : aIdx;
    const bOrder = bIdx === undefined ? Number.MAX_SAFE_INTEGER : bIdx;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
}

export function buildWorkoutExercisesInPickOrder(
  allExercises: LibraryExercise[],
  picks: TodayExercisePick[],
  defaultSets: number
): WorkoutExercise[] {
  const byId = new Map(allExercises.map((e) => [e.id, e]));

  const picked: WorkoutExercise[] = [];
  for (const pick of picks) {
    const lib = byId.get(pick.exerciseId);
    if (!lib) continue;
    
    // Create a standalone WorkoutExercise for this specific variation
    let ex = libraryItemToWorkoutExercise(lib, defaultSets);
    ex = {
      ...ex,
      variation: pick.variation,
      pickedToday: true,
      pickedVariations: [pick.variation],
      setsByVariation: {
        [pick.variation]: Array.from({ length: defaultSets }, () => ({ weight: 0, reps: 0, done: false })),
      }
    };
    picked.push(ex);
  }

  // Also include unpicked exercises for the "Not doing today" section
  const pickedIds = new Set(picks.map(p => p.exerciseId));
  const unpicked: WorkoutExercise[] = [];
  for (const lib of allExercises) {
    if (pickedIds.has(lib.id)) continue;
    unpicked.push({ ...libraryItemToWorkoutExercise(lib, defaultSets), pickedToday: false });
  }

  return [...picked, ...unpicked];
}

export function getDefaultTodayPicks(
  splitId: SplitId,
  workouts: WorkoutSession[],
  splitTodayPicks: Partial<Record<SplitId, TodayExercisePick[] | string[]>>,
  exercises: LibraryExercise[]
): TodayExercisePick[] {
  const exercisesById = new Map(exercises.map((e) => [e.id, e]));
  const allExerciseIds = new Set(exercises.map((e) => e.id));

  const saved = normalizeSavedTodayPicks(splitTodayPicks[splitId], allExerciseIds, exercisesById);
  if (saved.length) return saved;

  return [];
}

export function formatLastSessionPreview(
  last: LastExerciseSession,
  unit: 'kg' | 'lbs',
  maxSets = 2
): string {
  const setStrs = last.sets.slice(0, maxSets).map(
    (s) => `${formatWeight(s.weight, unit)}×${s.reps}`
  );
  const extra = last.sets.length > maxSets ? `, +${last.sets.length - maxSets} more` : '';
  return setStrs.join(', ') + extra;
}

export function isPR(
  exerciseId: string,
  weight: number,
  prs: Record<string, PersonalRecord>
): boolean {
  const pr = prs[exerciseId];
  if (!pr) return weight > 0;
  return weight > pr.weight;
}

export interface PRBeatDetails {
  isPR: boolean;
  isFirstRecord: boolean;
  previousWeight?: number;
  delta?: number;
}

export function getPRBeatDetails(
  exerciseId: string,
  weight: number,
  prs: Record<string, PersonalRecord>
): PRBeatDetails {
  if (weight <= 0) return { isPR: false, isFirstRecord: false };
  const pr = prs[exerciseId];
  if (!pr) return { isPR: true, isFirstRecord: true };
  if (weight > pr.weight) {
    return {
      isPR: true,
      isFirstRecord: false,
      previousWeight: pr.weight,
      delta: weight - pr.weight,
    };
  }
  return { isPR: false, isFirstRecord: false };
}

export function updatePRsFromWorkout(
  exercises: WorkoutExercise[],
  date: string,
  existing: Record<string, PersonalRecord>
): Record<string, PersonalRecord> {
  const updated = { ...existing };
  for (const ex of exercises) {
    const bestSet = ex.sets
      .filter((s) => s.done && s.weight > 0)
      .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    if (!bestSet) continue;
    const current = updated[ex.exerciseId];
    if (!current || bestSet.weight > current.weight) {
      updated[ex.exerciseId] = {
        weight: bestSet.weight,
        reps: bestSet.reps,
        date,
        variation: ex.variation,
      };
    }
  }
  return updated;
}

export function calcStreak(workouts: WorkoutSession[]): number {
  if (!workouts.length) return 0;
  const dates = new Set(workouts.map((w) => w.date));
  let streak = 0;
  let d = dayjs();
  while (dates.has(d.format('YYYY-MM-DD'))) {
    streak++;
    d = d.subtract(1, 'day');
  }
  return streak;
}

export type AttendanceKind = 'none' | 'regular' | 'early';

function getDateKeyInTimezone(timestampMs: number, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(timestampMs));
}

function getTimePartsInTimezone(timestampMs: number, timezone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(timestampMs));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

function parseGymTime(gymTime: string | null): { hour: number; minute: number } {
  if (!gymTime) return { hour: 12, minute: 0 };
  const [hourPart, minutePart] = gymTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return { hour: 12, minute: 0 };
  return { hour, minute };
}

export function isEarlyAttendance(
  completedAt: number,
  gymTime: string | null,
  timezone: string
): boolean {
  const { hour, minute } = getTimePartsInTimezone(completedAt, timezone);
  const cutoff = parseGymTime(gymTime);
  return hour < cutoff.hour || (hour === cutoff.hour && minute < cutoff.minute);
}

export function buildYearlyAttendanceMap(
  workouts: WorkoutSession[],
  year: number,
  profile: Pick<UserProfile, 'gymTime' | 'timezone'>
): Record<string, AttendanceKind> {
  const timezone = profile.timezone || 'UTC';
  const byDate = new Map<string, WorkoutSession[]>();
  for (const workout of workouts) {
    const date = workout.date;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(workout);
  }

  const attendanceMap: Record<string, AttendanceKind> = {};
  const start = dayjs(`${year}-01-01`);
  const end = dayjs(`${year}-12-31`);
  for (let day = start; day.isSame(end) || day.isBefore(end); day = day.add(1, 'day')) {
    const dateKey = day.format('YYYY-MM-DD');
    const dayWorkouts = byDate.get(dateKey) ?? [];
    if (!dayWorkouts.length) {
      attendanceMap[dateKey] = 'none';
      continue;
    }

    const early = dayWorkouts.some((workout) => {
      if (!workout.completedAt) return false;
      if (getDateKeyInTimezone(workout.completedAt, timezone) !== workout.date) return false;
      return isEarlyAttendance(workout.completedAt, profile.gymTime, timezone);
    });
    attendanceMap[dateKey] = early ? 'early' : 'regular';
  }
  return attendanceMap;
}

export function getLongestStreakForYear(workouts: WorkoutSession[], year: number): number {
  const yearDates = new Set(
    workouts
      .map((workout) => workout.date)
      .filter((date) => dayjs(date).year() === year)
  );
  if (!yearDates.size) return 0;

  let best = 0;
  let current = 0;
  const start = dayjs(`${year}-01-01`);
  const end = dayjs(`${year}-12-31`);
  for (let day = start; day.isSame(end) || day.isBefore(end); day = day.add(1, 'day')) {
    if (yearDates.has(day.format('YYYY-MM-DD'))) {
      current += 1;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

export function getWorkoutsInRange(workouts: WorkoutSession[], start: string, end: string): WorkoutSession[] {
  return workouts.filter((w) => {
    const d = dayjs(w.date);
    return d.isAfter(dayjs(start).subtract(1, 'day')) && d.isBefore(dayjs(end).add(1, 'day'));
  });
}

export function getWeeklyVolumes(workouts: WorkoutSession[], weeks = 8): { week: string; volume: number }[] {
  const result: { week: string; volume: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = getTrackingWeekStart().subtract(i, 'week');
    const weekEnd = weekStart.add(6, 'day').endOf('day');
    const label = weekStart.format('MMM D');
    const volume = workouts
      .filter((w) => {
        const d = dayjs(w.date);
        return d.isAfter(weekStart.subtract(1, 'day')) && d.isBefore(weekEnd.add(1, 'day'));
      })
      .reduce((sum, w) => sum + w.totalVolume, 0);
    result.push({ week: label, volume });
  }
  return result;
}

export function getMuscleFrequency(workouts: WorkoutSession[], days = 30): { muscle: string; count: number }[] {
  const cutoff = dayjs().subtract(days, 'day');
  const counts: Record<string, number> = {};
  for (const w of workouts.filter((wd) => dayjs(wd.date).isAfter(cutoff))) {
    const muscles = Array.from(new Set(w.exercises.map((e) => e.muscle)));
    for (const m of muscles) {
      counts[m] = (counts[m] ?? 0) + 1;
    }
  }
  return Object.entries(counts).map(([muscle, count]) => ({ muscle, count }));
}

export function getCalendarDays(): { date: string; hasWorkout: boolean; isToday: boolean }[] {
  const days: { date: string; hasWorkout: boolean; isToday: boolean }[] = [];
  const start = dayjs().subtract(34, 'day');
  for (let i = 0; i < 35; i++) {
    const d = start.add(i, 'day');
    days.push({
      date: d.format('YYYY-MM-DD'),
      hasWorkout: false,
      isToday: d.isSame(dayjs(), 'day'),
    });
  }
  return days;
}

export function createDefaultSets(count: number): WorkoutSet[] {
  return Array.from({ length: count }, () => ({ weight: 0, reps: 0, done: false }));
}

export function libraryItemToWorkoutExercise(
  ex: Pick<LibraryExercise, 'id' | 'name' | 'muscle' | 'variations'>,
  defaultSets: number
): WorkoutExercise {
  return {
    exerciseId: ex.id,
    name: ex.name,
    variation: ex.variations[0] ?? 'Standard',
    muscle: ex.muscle,
    sets: createDefaultSets(defaultSets),
    notes: '',
  };
}

export function createWorkoutExercises(
  library: LibraryExercise[],
  defaultSets: number
): WorkoutExercise[] {
  return library.map((ex) => libraryItemToWorkoutExercise(ex, defaultSets));
}

export function getDefaultChecklistItems() {
  return [
    { id: 'pre-water', label: 'Drink 500ml water before workout', done: false, isDefault: true, type: 'pre' as const },
    { id: 'pre-warmup', label: 'Dynamic warm-up (5 min)', done: false, isDefault: true, type: 'pre' as const },
    { id: 'pre-split', label: "Check today's split", done: false, isDefault: true, type: 'pre' as const },
    { id: 'pre-meal', label: 'Pre-workout meal/supplement', done: false, isDefault: true, type: 'pre' as const },
    { id: 'post-cooldown', label: 'Cool down stretching (5 min)', done: false, isDefault: true, type: 'post' as const },
    { id: 'post-protein', label: 'Protein intake within 30 min', done: false, isDefault: true, type: 'post' as const },
    { id: 'post-log', label: 'Log workout in app', done: false, isDefault: true, type: 'post' as const },
    { id: 'post-water', label: 'Drink 500ml water post workout', done: false, isDefault: true, type: 'post' as const },
  ];
}

export function getDefaultProfile(): UserProfile {
  return {
    name: 'Athlete',
    age: 25,
    gender: 'Male',
    height: 175,
    weight: 75,
    goal: 'Build Muscle',
    avatar: '',
    weekSchedule: {
      Mon: 'ct',
      Tue: 'bb',
      Wed: 'sh',
      Thu: 'core',
      Fri: 'ctbb',
      Sat: 'legs',
      Sun: 'coresh',
    },
    prefs: {
      restTimer: 60,
      unit: 'kg',
      theme: 'dark',
      defaultSets: 3,
      sound: true,
    },
    gymTime: null,
    gymRemindersEnabled: false,
    timezone: typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC',
  };
}

export function normalizeProfile(profile: Partial<UserProfile> | null | undefined): UserProfile {
  const defaults = getDefaultProfile();
  if (!profile) return defaults;
  return {
    ...defaults,
    ...profile,
    prefs: { ...defaults.prefs, ...profile.prefs },
    weekSchedule: { ...defaults.weekSchedule, ...profile.weekSchedule },
    gymTime: profile.gymTime ?? null,
    gymRemindersEnabled: profile.gymRemindersEnabled ?? false,
    timezone: profile.timezone ?? defaults.timezone,
  };
}

export function getBrowserTimezone(): string {
  if (typeof Intl === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function playBeep(frequency = 880, duration = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // audio not available
  }
}

export async function showLocalNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;

  const options: NotificationOptions = {
    body,
    icon: '/logo.svg',
    tag: 'tripmate-local',
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    } catch {
      // fall through to Notification API
    }
  }

  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

export function notify(title: string, body: string) {
  void showLocalNotification(title, body);
}

export function buildSplitExerciseLibrary(
  splitId: SplitId,
  customExercises: CustomExercise[],
  splitExtras: Partial<Record<SplitId, string[]>>
): LibraryExercise[] {
  const library = getExercisesForSplit(splitId);
  const splitMuscles = getMuscleFromSplit(splitId);
  const customForSplit = customExercises
    .filter(
      (c) =>
        splitMuscles.includes(c.muscle) ||
        (c.secondary && splitMuscles.includes(c.secondary))
    )
    .map(
      (c): LibraryExercise => ({
        id: c.id,
        name: c.name,
        muscle: c.muscle,
        secondary: c.secondary,
        equipment: c.equipment,
        difficulty: c.difficulty,
        variations: c.variations,
        tips: c.notes ? [c.notes] : [],
        splitIds: [splitId],
        category: [c.muscle],
      })
    );

  const baseIds = new Set(library.map((l) => l.id));
  const savedExtraIds = splitExtras[splitId] ?? [];
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
        splitIds: [splitId] as SplitId[],
        category: [custom.muscle] as LibraryExercise['category'],
      } satisfies LibraryExercise;
    })
    .filter((ex): ex is LibraryExercise => !!ex);

  return [
    ...library,
    ...customForSplit.filter((c) => !library.some((l) => l.id === c.id)),
    ...extraLibrary.filter(
      (c) => !library.some((l) => l.id === c.id) && !customForSplit.some((x) => x.id === c.id)
    ),
  ];
}

export function groupLibraryExercisesByMuscle(
  exercises: LibraryExercise[],
  splitId: SplitId
): { muscle: string; exercises: LibraryExercise[] }[] {
  const order = getMuscleOrderForSplit(splitId);
  const groups = new Map<string, LibraryExercise[]>();

  for (const ex of exercises) {
    const list = groups.get(ex.muscle) ?? [];
    list.push(ex);
    groups.set(ex.muscle, list);
  }

  const result: { muscle: string; exercises: LibraryExercise[] }[] = [];
  for (const muscle of order) {
    const list = groups.get(muscle);
    if (list?.length) {
      result.push({ muscle, exercises: [...list].sort((a, b) => a.name.localeCompare(b.name)) });
      groups.delete(muscle);
    }
  }
  Array.from(groups.entries()).forEach(([muscle, list]) => {
    if (list.length) {
      result.push({ muscle, exercises: [...list].sort((a, b) => a.name.localeCompare(b.name)) });
    }
  });
  return result;
}

export function getMuscleFromSplit(splitId: SplitId): string[] {
  const map: Record<SplitId, string[]> = {
    ct: ['Chest', 'Triceps'],
    bb: ['Back', 'Biceps'],
    sh: ['Shoulders'],
    ctbb: ['Chest', 'Triceps', 'Back', 'Biceps'],
    legs: ['Legs'],
    core: ['Core'],
    coresh: ['Core', 'Shoulders'],
    rest: [],
  };
  return map[splitId];
}

/** True when an exercise targets muscles in the active split (e.g. Chest/Triceps for ct). */
export function exerciseBelongsToSplit(
  ex: Pick<LibraryExercise, 'muscle' | 'secondary' | 'splitIds'>,
  splitId: SplitId
): boolean {
  if (splitId === 'rest') return false;
  const splitMuscles = getMuscleFromSplit(splitId);
  if (splitMuscles.includes(ex.muscle)) return true;
  if (ex.secondary && splitMuscles.includes(ex.secondary)) return true;
  if (splitId === 'ctbb') {
    return ex.splitIds.includes('ct') || ex.splitIds.includes('bb');
  }
  if (splitId === 'coresh') {
    return ex.splitIds.includes('core') || ex.splitIds.includes('sh');
  }
  return ex.splitIds.includes(splitId);
}

export function getMuscleOrderForSplit(splitId: SplitId): MuscleGroup[] {
  const map: Record<SplitId, MuscleGroup[]> = {
    ct: ['Chest', 'Triceps'],
    bb: ['Back', 'Biceps'],
    sh: ['Shoulders'],
    ctbb: ['Chest', 'Triceps', 'Back', 'Biceps'],
    legs: ['Legs'],
    core: ['Core'],
    coresh: ['Core', 'Shoulders'],
    rest: [],
  };
  return map[splitId] ?? [];
}

function muscleGroupCompletionScore(exercises: WorkoutExercise[]): number {
  const fullyDone = exercises.filter(isExerciseFullyDone).length;
  const partial = exercises.filter(
    (e) => !isExerciseFullyDone(e) && exerciseHasLoggedSets(e)
  ).length;
  return fullyDone * 1000 + partial * 10;
}

export function groupExercisesByMuscle(
  exercises: WorkoutExercise[],
  splitId: SplitId
): { muscle: string; exercises: WorkoutExercise[] }[] {
  const order = getMuscleOrderForSplit(splitId);
  const groups = new Map<string, WorkoutExercise[]>();

  for (const ex of exercises) {
    const list = groups.get(ex.muscle) ?? [];
    list.push(ex);
    groups.set(ex.muscle, list);
  }

  const result: { muscle: string; exercises: WorkoutExercise[] }[] = [];
  for (const muscle of order) {
    const list = groups.get(muscle);
    if (list?.length) {
      result.push({ muscle, exercises: sortExercisesByCompletion(list) });
      groups.delete(muscle);
    }
  }
  Array.from(groups.entries()).forEach(([muscle, list]) => {
    if (list.length) result.push({ muscle, exercises: sortExercisesByCompletion(list) });
  });

  return result.sort((a, b) => {
    const scoreDiff = muscleGroupCompletionScore(b.exercises) - muscleGroupCompletionScore(a.exercises);
    if (scoreDiff !== 0) return scoreDiff;
    const aIdx = order.indexOf(a.muscle as (typeof order)[number]);
    const bIdx = order.indexOf(b.muscle as (typeof order)[number]);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });
}

export function variationImageKey(exerciseId: string, variation: string): string {
  return `${exerciseId}::${variation}`;
}

export function mobilityImageKey(mobilityId: string, variation: string): string {
  return `mobility::${mobilityId}::${variation}`;
}

export function mobilityStorageId(mobilityId: string): string {
  return `mobility::${mobilityId}`;
}

const LIBRARY_MUSCLE_ORDER: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Triceps',
  'Biceps',
  'Legs',
  'Core',
];

export function groupLibraryExercisesByMuscleAll(
  exercises: LibraryExercise[]
): { muscle: string; exercises: LibraryExercise[] }[] {
  const groups = new Map<string, LibraryExercise[]>();
  for (const ex of exercises) {
    const list = groups.get(ex.muscle) ?? [];
    list.push(ex);
    groups.set(ex.muscle, list);
  }

  const result: { muscle: string; exercises: LibraryExercise[] }[] = [];
  for (const muscle of LIBRARY_MUSCLE_ORDER) {
    const list = groups.get(muscle);
    if (list?.length) {
      result.push({ muscle, exercises: [...list].sort((a, b) => a.name.localeCompare(b.name)) });
      groups.delete(muscle);
    }
  }
  Array.from(groups.entries()).forEach(([muscle, list]) => {
    if (list.length) {
      result.push({ muscle, exercises: [...list].sort((a, b) => a.name.localeCompare(b.name)) });
    }
  });
  return result;
}

export function validateImageHttpUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return 'Enter an image URL';
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'URL must start with http:// or https://';
    }
    return null;
  } catch {
    return 'Enter a valid URL';
  }
}

export function isCustomAddedVariation(
  exerciseId: string,
  variation: string,
  baseVariations: string[],
  customVariations: Record<string, string[]>
): boolean {
  return (customVariations[exerciseId] ?? []).includes(variation);
}

export function canRemoveVariation(
  isCustomExercise: boolean,
  variation: string,
  variations: string[],
  exerciseId: string,
  baseVariations: string[],
  customVariations: Record<string, string[]>
): boolean {
  if (isCustomExercise) return variations.length > 1;
  return isCustomAddedVariation(exerciseId, variation, baseVariations, customVariations);
}

export function canRenameVariation(
  isCustomExercise: boolean,
  variation: string,
  exerciseId: string,
  baseVariations: string[],
  customVariations: Record<string, string[]>
): boolean {
  if (isCustomExercise) return true;
  return isCustomAddedVariation(exerciseId, variation, baseVariations, customVariations);
}

export function getVariationsMissingUploadedImage(
  exerciseId: string,
  allVariations: string[],
  getImage: (exerciseId: string, variation: string) => string | undefined
): string[] {
  return allVariations.filter((v) => !getImage(exerciseId, v));
}

export function exerciseHasMissingUploadedImage(
  exerciseId: string,
  allVariations: string[],
  getImage: (exerciseId: string, variation: string) => string | undefined
): boolean {
  return getVariationsMissingUploadedImage(exerciseId, allVariations, getImage).length > 0;
}

export function defaultExerciseImageUrl(exerciseId: string): string {
  return `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800&exercise=${exerciseId}`;
}

export function defaultMobilityImageUrl(mobilityId: string): string {
  return `https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=800&mobility=${mobilityId}`;
}

export function resolveExerciseImageUrl(
  exerciseId: string,
  variations: string[],
  getImage: (exerciseId: string, variation: string) => string | undefined,
  preferredVariation?: string
): string {
  if (preferredVariation) {
    const preferred = getImage(exerciseId, preferredVariation);
    if (preferred) return preferred;
  }
  for (const variation of variations) {
    const image = getImage(exerciseId, variation);
    if (image) return image;
  }
  return defaultExerciseImageUrl(exerciseId);
}

export function isRemoteImageUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://');
}

/** Firestore documents max ~1 MiB — only sync small http(s) URLs, not base64 blobs. */
export function cloudSafeVariationImages(images: VariationImageMap): VariationImageMap {
  const out: VariationImageMap = {};
  for (const [key, value] of Object.entries(images)) {
    if (value === '' || isRemoteImageUrl(value)) out[key] = value;
  }
  return out;
}

export function mergeVariationImages(
  local: VariationImageMap,
  remote: VariationImageMap
): VariationImageMap {
  return { ...remote, ...local };
}

export function compressImageFile(file: File, maxWidth = 960, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process image'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function getDayIndex(date: string): number {
  return DAY_KEYS.indexOf(dayjs(date).format('ddd') as DayKey);
}

const EMPTY_HABIT = { workout: false, water: false, sleep: false, protein: false, steps: false };

export function syncWorkoutHabits(
  workouts: WorkoutSession[],
  habits: Record<string, HabitDay>
): Record<string, HabitDay> {
  const next = { ...habits };
  const workoutDates = new Set(workouts.map((w) => w.date));

  for (const [date, habit] of Object.entries(next)) {
    if (habit.workout && !workoutDates.has(date)) {
      next[date] = { ...habit, workout: false };
    }
  }

  for (const date of Array.from(workoutDates)) {
    next[date] = { ...(next[date] ?? EMPTY_HABIT), workout: true };
  }

  return next;
}

export function exerciseMatchesSearch(
  ex: LibraryExercise,
  query: string,
  variations: string[]
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    ex.name.toLowerCase().includes(q) ||
    ex.muscle.toLowerCase().includes(q) ||
    (ex.secondary?.toLowerCase().includes(q) ?? false) ||
    variations.some((v) => v.toLowerCase().includes(q))
  );
}

export function getMatchingVariations(variations: string[], query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return variations;
  const matched = variations.filter((v) => v.toLowerCase().includes(q));
  return matched.length > 0 ? matched : variations;
}

export function variationMatchesSearch(variation: string, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  return variation.toLowerCase().includes(q);
}

export function exerciseSearchRank(
  ex: LibraryExercise,
  query: string,
  variations: string[]
): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (ex.name.toLowerCase().includes(q)) return 0;
  if (ex.muscle.toLowerCase().includes(q) || (ex.secondary?.toLowerCase().includes(q) ?? false)) return 1;
  if (variations.some((v) => v.toLowerCase().includes(q))) return 2;
  return 3;
}

export function updatePRDatesForWorkout(
  workout: WorkoutSession,
  oldDate: string,
  newDate: string,
  prs: Record<string, PersonalRecord>
): Record<string, PersonalRecord> {
  const updated = { ...prs };
  const exerciseIds = new Set(workout.exercises.map((e) => e.exerciseId));
  for (const [id, pr] of Object.entries(updated)) {
    if (exerciseIds.has(id) && pr.date === oldDate) {
      updated[id] = { ...pr, date: newDate };
    }
  }
  return updated;
}
