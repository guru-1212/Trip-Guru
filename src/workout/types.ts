export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type SplitId = 'ct' | 'bb' | 'sh' | 'ctbb' | 'legs' | 'rest';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Triceps'
  | 'Biceps'
  | 'Legs'
  | 'Core';

export type ExerciseCategory = MuscleGroup | 'Compound' | 'Isolation';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type FitnessGoal =
  | 'Build Muscle'
  | 'Lose Fat'
  | 'Strength'
  | 'Endurance'
  | 'General';

export type WeightUnit = 'kg' | 'lbs';

export type ThemePref = 'dark' | 'light' | 'system';

export interface WorkoutSet {
  weight: number;
  reps: number;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  variation: string;
  muscle: MuscleGroup;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  splitId: SplitId;
  splitName: string;
  duration: number;
  exercises: WorkoutExercise[];
  totalSets: number;
  totalVolume: number;
}

export interface PersonalRecord {
  weight: number;
  reps: number;
  date: string;
  variation: string;
}

export interface CustomExercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  secondary?: MuscleGroup;
  equipment: string;
  difficulty: Difficulty;
  variations: string[];
  notes?: string;
}

export interface BodyStat {
  date: string;
  weight: number;
  notes?: string;
}

export interface HabitDay {
  workout: boolean;
  water: boolean;
  sleep: boolean;
  protein: boolean;
  steps: boolean;
}

export interface WeeklyGoals {
  workoutsPerWeek: number;
  volumeTarget: number;
  proteinGoal: number;
  sleepGoal: number;
  weekStart: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  isDefault?: boolean;
  type: 'pre' | 'post' | 'custom';
}

export interface ChecklistData {
  date: string;
  dailyItems: ChecklistItem[];
  custom: ChecklistItem[];
}

export interface UserPrefs {
  restTimer: number;
  unit: WeightUnit;
  theme: ThemePref;
  defaultSets: number;
  sound: boolean;
}

export interface WeekSchedule {
  Mon: SplitId;
  Tue: SplitId;
  Wed: SplitId;
  Thu: SplitId;
  Fri: SplitId;
  Sat: SplitId;
  Sun: SplitId;
}

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: FitnessGoal;
  avatar: string;
  weekSchedule: WeekSchedule;
  prefs: UserPrefs;
}

export interface LibraryExercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  secondary?: MuscleGroup;
  equipment: string;
  difficulty: Difficulty;
  variations: string[];
  tips: string[];
  splitIds: SplitId[];
  category: ExerciseCategory[];
}

export interface SplitDefinition {
  id: SplitId;
  name: string;
  muscles: string[];
  icon: string;
}

export interface ActiveWorkoutState {
  splitId: SplitId;
  splitName: string;
  startedAt: number;
  exercises: WorkoutExercise[];
  restTimerSeconds: number;
  restTimerEnd: number | null;
  /** Exercise IDs added mid-session via Add Exercise (removable before finish). */
  addedExerciseIds?: string[];
}

/** Map key: `${exerciseId}::${variationName}` → base64 data URL */
export type VariationImageMap = Record<string, string>;
