import type {
  ActiveWorkoutState,
  BodyStat,
  ChecklistData,
  CustomExercise,
  HabitDay,
  PersonalRecord,
  SplitId,
  UserProfile,
  WeeklyGoals,
  WorkoutSession,
} from './types';
import { STORAGE_KEYS } from './constants';
import { getDefaultChecklistItems, getDefaultProfile, getWeekStart } from './utils';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfile(): UserProfile {
  return read(STORAGE_KEYS.profile, getDefaultProfile());
}

export function saveProfile(profile: UserProfile): void {
  write(STORAGE_KEYS.profile, profile);
}

export function loadWorkouts(): WorkoutSession[] {
  return read(STORAGE_KEYS.workouts, []);
}

export function saveWorkouts(workouts: WorkoutSession[]): void {
  write(STORAGE_KEYS.workouts, workouts);
}

export function loadPRs(): Record<string, PersonalRecord> {
  return read(STORAGE_KEYS.prs, {});
}

export function savePRs(prs: Record<string, PersonalRecord>): void {
  write(STORAGE_KEYS.prs, prs);
}

export function loadCustomExercises(): CustomExercise[] {
  return read(STORAGE_KEYS.customExercises, []);
}

export function saveCustomExercises(exercises: CustomExercise[]): void {
  write(STORAGE_KEYS.customExercises, exercises);
}

export function loadBodyStats(): BodyStat[] {
  return read(STORAGE_KEYS.bodyStats, []);
}

export function saveBodyStats(stats: BodyStat[]): void {
  write(STORAGE_KEYS.bodyStats, stats);
}

export function loadHabits(): Record<string, HabitDay> {
  return read(STORAGE_KEYS.habits, {});
}

export function saveHabits(habits: Record<string, HabitDay>): void {
  write(STORAGE_KEYS.habits, habits);
}

export function loadWeeklyGoals(): WeeklyGoals {
  return read(STORAGE_KEYS.weeklyGoals, {
    workoutsPerWeek: 4,
    volumeTarget: 50000,
    proteinGoal: 150,
    sleepGoal: 8,
    weekStart: getWeekStart(),
  });
}

export function saveWeeklyGoals(goals: WeeklyGoals): void {
  write(STORAGE_KEYS.weeklyGoals, goals);
}

export function loadChecklist(): ChecklistData {
  const today = new Date().toISOString().slice(0, 10);
  const stored = read<ChecklistData | null>(STORAGE_KEYS.checklist, null);
  if (!stored || stored.date !== today) {
    return {
      date: today,
      dailyItems: getDefaultChecklistItems(),
      custom: stored?.custom ?? [],
    };
  }
  return stored;
}

export function saveChecklist(data: ChecklistData): void {
  write(STORAGE_KEYS.checklist, data);
}

export function loadActiveWorkout(): ActiveWorkoutState | null {
  return read(STORAGE_KEYS.activeWorkout, null);
}

export function saveActiveWorkout(state: ActiveWorkoutState | null): void {
  if (state) write(STORAGE_KEYS.activeWorkout, state);
  else localStorage.removeItem(STORAGE_KEYS.activeWorkout);
}

export function loadCustomVariations(): Record<string, string[]> {
  return read(STORAGE_KEYS.customVariations, {});
}

export function saveCustomVariations(vars: Record<string, string[]>): void {
  write(STORAGE_KEYS.customVariations, vars);
}

export function loadSplitExtras(): Partial<Record<SplitId, string[]>> {
  return read(STORAGE_KEYS.splitExtras, {});
}

export function saveSplitExtras(extras: Partial<Record<SplitId, string[]>>): void {
  write(STORAGE_KEYS.splitExtras, extras);
}

export function exportAllData(): string {
  const data = {
    profile: loadProfile(),
    workouts: loadWorkouts(),
    prs: loadPRs(),
    customExercises: loadCustomExercises(),
    bodyStats: loadBodyStats(),
    habits: loadHabits(),
    weeklyGoals: loadWeeklyGoals(),
    checklist: loadChecklist(),
    customVariations: loadCustomVariations(),
    splitExtras: loadSplitExtras(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.profile) saveProfile(data.profile);
    if (data.workouts) saveWorkouts(data.workouts);
    if (data.prs) savePRs(data.prs);
    if (data.customExercises) saveCustomExercises(data.customExercises);
    if (data.bodyStats) saveBodyStats(data.bodyStats);
    if (data.habits) saveHabits(data.habits);
    if (data.weeklyGoals) saveWeeklyGoals(data.weeklyGoals);
    if (data.checklist) saveChecklist(data.checklist);
    if (data.customVariations) saveCustomVariations(data.customVariations);
    if (data.splitExtras) saveSplitExtras(data.splitExtras);
    return true;
  } catch {
    return false;
  }
}

export function clearWorkoutHistory(): void {
  saveWorkouts([]);
}

export function clearPRs(): void {
  savePRs({});
}
