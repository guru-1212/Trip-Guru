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

export interface LastExerciseSession {
  date: string;
  variation: string;
  sets: { weight: number; reps: number }[];
  bestSet: { weight: number; reps: number };
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

export function isExerciseFullyDone(ex: WorkoutExercise): boolean {
  const vars = getPickedVariations(ex);
  if (!vars.length) return false;
  return vars.every((v) => {
    const sets = getSetsForVariation(ex, v);
    return sets.length > 0 && sets.every((s) => s.done);
  });
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

  if (typeof saved[0] === 'string') {
    const result: TodayExercisePick[] = [];
    for (const exerciseId of saved as string[]) {
      if (!validExerciseIds.has(exerciseId)) continue;
      result.push({
        exerciseId,
        variations: [defaultVariationForExercise(exerciseId, exercisesById)],
      });
    }
    return result;
  }

  const result: TodayExercisePick[] = [];
  const indexById = new Map<string, number>();

  for (const raw of saved as LegacyTodayExercisePick[]) {
    if (!validExerciseIds.has(raw.exerciseId)) continue;
    const variations = raw.variations?.length
      ? raw.variations
      : [
          raw.variation ||
            defaultVariationForExercise(raw.exerciseId, exercisesById),
        ];
    const existingIdx = indexById.get(raw.exerciseId);
    if (existingIdx !== undefined) {
      const merged = new Set([...result[existingIdx].variations, ...variations.filter(Boolean)]);
      result[existingIdx].variations = Array.from(merged);
    } else {
      indexById.set(raw.exerciseId, result.length);
      result.push({
        exerciseId: raw.exerciseId,
        variations: Array.from(new Set(variations.filter(Boolean))),
      });
    }
  }

  return result;
}

export function todayPicksToMap(picks: TodayExercisePick[]): Map<string, string[]> {
  return new Map(picks.map((p) => [p.exerciseId, p.variations]));
}

export function mapToTodayPicks(picks: Map<string, string[]>): TodayExercisePick[] {
  return Array.from(picks.entries()).map(([exerciseId, variations]) => ({
    exerciseId,
    variations,
  }));
}

export function pickOrderFromPicks(picks: TodayExercisePick[]): string[] {
  return picks.map((p) => p.exerciseId);
}

export function sortExercisesByPickOrder(
  exercises: WorkoutExercise[],
  pickOrderIds: string[]
): WorkoutExercise[] {
  const orderIndex = new Map(pickOrderIds.map((id, i) => [id, i]));
  return [...exercises].sort((a, b) => {
    const aIdx = orderIndex.get(a.exerciseId);
    const bIdx = orderIndex.get(b.exerciseId);
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
  const picksMap = todayPicksToMap(picks);
  const pickOrder = pickOrderFromPicks(picks);
  const byId = new Map(allExercises.map((e) => [e.id, e]));

  const picked: WorkoutExercise[] = [];
  for (const id of pickOrder) {
    const lib = byId.get(id);
    if (!lib || !picksMap.has(id)) continue;
    const variations = picksMap.get(id)!;
    let ex = libraryItemToWorkoutExercise(lib, defaultSets);
    ex =
      variations.length > 0
        ? applyWorkoutExerciseFromPicks(ex, variations, defaultSets)
        : { ...ex, pickedToday: true };
    picked.push(ex);
  }

  const unpicked: WorkoutExercise[] = [];
  for (const lib of allExercises) {
    if (picksMap.has(lib.id)) continue;
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

  const lastSession = workouts.find((w) => w.splitId === splitId);
  if (lastSession) {
    const byExercise = new Map<string, Set<string>>();
    const order: string[] = [];
    for (const e of lastSession.exercises) {
      if (!allExerciseIds.has(e.exerciseId)) continue;
      if (!byExercise.has(e.exerciseId)) order.push(e.exerciseId);
      mergeTodayPickVariations(byExercise, e.exerciseId, [e.variation]);
    }
    const fromLast = order.map((exerciseId) => ({
      exerciseId,
      variations: Array.from(byExercise.get(exerciseId)!),
    }));
    if (fromLast.length) return fromLast;
  }

  return exercises.map((e) => ({
    exerciseId: e.id,
    variations: [e.variations[0] ?? 'Standard'],
  }));
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

export function defaultExerciseImageUrl(exerciseId: string): string {
  return `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800&exercise=${exerciseId}`;
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
    if (isRemoteImageUrl(value)) out[key] = value;
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
