import { Timestamp } from 'firebase/firestore';

export type FitnessGoal =
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'strength_gain'
  | 'maintenance';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'athlete';

export type Gender = 'male' | 'female' | 'other';
export type WorkoutLevel = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutType =
  | 'full_body'
  | 'upper_lower'
  | 'ppl'
  | 'arnold_split'
  | 'bro_split';

export interface GymProfile {
  uid: string;
  age: number;
  gender: Gender;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  caloriesTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatsTargetG: number;
  waterTargetMl: number;
  updatedAt?: Timestamp;
}

export interface WorkoutExerciseSet {
  setNumber: number;
  reps: number;
  weightKg: number;
}

export interface WorkoutLog {
  id: string;
  uid: string;
  date: string;
  workoutPlanId?: string;
  workoutType: WorkoutType;
  durationMinutes: number;
  completed: boolean;
  caloriesBurned?: number;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: WorkoutExerciseSet[];
  }>;
  notes?: string;
  createdAt?: Timestamp;
}

export interface WeightLog {
  id: string;
  uid: string;
  date: string;
  weightKg: number;
  createdAt?: Timestamp;
}

export interface MeasurementLog {
  id: string;
  uid: string;
  date: string;
  chestCm: number;
  waistCm: number;
  armsCm: number;
  shouldersCm: number;
  thighsCm: number;
  calvesCm: number;
  createdAt?: Timestamp;
}

export interface ProgressPhotoLog {
  id: string;
  uid: string;
  date: string;
  frontUrl?: string;
  sideUrl?: string;
  backUrl?: string;
  notes?: string;
  createdAt?: Timestamp;
}

export interface DailyChecklist {
  dateKey: string;
  workoutDone: boolean;
  proteinGoalMet: boolean;
  waterGoalMet: boolean;
  calorieGoalMet: boolean;
  sleepGoalMet: boolean;
  updatedAt?: Timestamp;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  imageUrl: string;
  instructions: string[];
  targetMuscles: string[];
  commonMistakes: string[];
  trainerTips: string[];
  difficulty: WorkoutLevel;
}

export interface WorkoutPlanExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  targetMuscles: string[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  level: WorkoutLevel;
  type: WorkoutType;
  difficultyLabel: string;
  estimatedMinutes: number;
  exercises: WorkoutPlanExercise[];
}
