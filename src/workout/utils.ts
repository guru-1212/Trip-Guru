import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type {
  DayKey,
  HabitDay,
  LibraryExercise,
  MuscleGroup,
  PersonalRecord,
  SplitId,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
  VariationImageMap,
} from './types';
import { DAY_KEYS } from './constants';

dayjs.extend(isoWeek);

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

export function getWeekStart(date = dayjs()): string {
  return date.startOf('isoWeek').format('YYYY-MM-DD');
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

export function getLastExerciseSession(
  workouts: WorkoutSession[],
  exerciseId: string
): { weight: number; reps: number; variation: string; date: string } | null {
  for (const w of [...workouts].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const best = ex.sets
      .filter((s) => s.done && s.weight > 0)
      .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    if (best) {
      return { weight: best.weight, reps: best.reps, variation: ex.variation, date: w.date };
    }
  }
  return null;
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
    const weekStart = dayjs().subtract(i, 'week').startOf('isoWeek');
    const weekEnd = weekStart.endOf('isoWeek');
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
      Thu: 'rest',
      Fri: 'ctbb',
      Sat: 'legs',
      Sun: 'rest',
    },
    prefs: {
      restTimer: 60,
      unit: 'kg',
      theme: 'dark',
      defaultSets: 3,
      sound: true,
    },
  };
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

export function notify(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo.svg' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body, icon: '/logo.svg' });
      }
    });
  }
}

export function getMuscleFromSplit(splitId: SplitId): string[] {
  const map: Record<SplitId, string[]> = {
    ct: ['Chest', 'Triceps'],
    bb: ['Back', 'Biceps'],
    sh: ['Shoulders'],
    ctbb: ['Chest', 'Triceps', 'Back', 'Biceps'],
    legs: ['Legs'],
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
    rest: [],
  };
  return map[splitId] ?? [];
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
      result.push({ muscle, exercises: list });
      groups.delete(muscle);
    }
  }
  Array.from(groups.entries()).forEach(([muscle, list]) => {
    if (list.length) result.push({ muscle, exercises: list });
  });
  return result;
}

export function variationImageKey(exerciseId: string, variation: string): string {
  return `${exerciseId}::${variation}`;
}

export function defaultExerciseImageUrl(exerciseId: string): string {
  return `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800&exercise=${exerciseId}`;
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
