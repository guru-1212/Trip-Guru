import type { DayKey, SplitDefinition, SplitId, WeekSchedule } from './types';

export const STORAGE_KEYS = {
  profile: 'wk_profile',
  workouts: 'wk_workouts',
  prs: 'wk_prs',
  customExercises: 'wk_custom_exercises',
  bodyStats: 'wk_body_stats',
  habits: 'wk_habits',
  weeklyGoals: 'wk_weekly_goals',
  checklist: 'wk_checklist',
  activeWorkout: 'wk_active_workout',
  customVariations: 'wk_custom_variations',
  variationImages: 'wk_variation_images',
  splitExtras: 'wk_split_extras',
  splitTodayPicks: 'wk_split_today_picks',
  splitSequenceLocked: 'wk_split_sequence_locked',
  splitMobilityPicks: 'wk_split_mobility_picks',
} as const;

export const SPLIT_DEFINITIONS: SplitDefinition[] = [
  {
    id: 'ct',
    name: 'Chest + Triceps',
    muscles: ['Chest', 'Triceps'],
    icon: 'chest',
  },
  {
    id: 'bb',
    name: 'Back + Biceps',
    muscles: ['Back', 'Biceps'],
    icon: 'back',
  },
  {
    id: 'sh',
    name: 'Shoulders',
    muscles: ['Shoulders', 'Traps'],
    icon: 'shoulders',
  },
  {
    id: 'ctbb',
    name: 'Chest+Tri / Back+Bi',
    muscles: ['Chest', 'Triceps', 'Back', 'Biceps'],
    icon: 'upper',
  },
  {
    id: 'legs',
    name: 'Legs',
    muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
    icon: 'legs',
  },
  {
    id: 'core',
    name: 'Core',
    muscles: ['Abs', 'Obliques'],
    icon: 'core',
  },
  {
    id: 'coresh',
    name: 'Core + Shoulders',
    muscles: ['Core', 'Shoulders'],
    icon: 'coresh',
  },
  {
    id: 'legsh',
    name: 'Legs + Shoulders',
    muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Shoulders'],
    icon: 'legsh',
  },
];

/**
 * Combined splits merge two base splits into a single session. Exercise and
 * coverage pools are the union of the component splits' pools.
 */
export const COMBINED_SPLIT_COMPONENTS: Partial<Record<SplitId, SplitId[]>> = {
  ctbb: ['ct', 'bb'],
  coresh: ['core', 'sh'],
  legsh: ['legs', 'sh'],
};

export const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  Mon: 'ct',
  Tue: 'bb',
  Wed: 'sh',
  Thu: 'core',
  Fri: 'ctbb',
  Sat: 'legs',
  Sun: 'coresh',
};

export const DAY_KEYS: DayKey[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Emoji per SplitDefinition.icon key. */
export const SPLIT_ICONS: Record<string, string> = {
  chest: '💪',
  back: '🏋️',
  shoulders: '🎯',
  upper: '⚡',
  legs: '🦵',
  core: '🧘',
  coresh: '⚡',
  legsh: '🔥',
};

export const SPLIT_NAMES: Record<SplitId, string> = {
  ct: 'Chest + Triceps',
  bb: 'Back + Biceps',
  sh: 'Shoulders',
  ctbb: 'Chest+Tri / Back+Bi',
  legs: 'Legs',
  core: 'Core',
  coresh: 'Core + Shoulders',
  legsh: 'Legs + Shoulders',
  rest: 'Rest',
};

export const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#1D9E75',
  Back: '#378ADD',
  Shoulders: '#BA7517',
  Triceps: '#A855F7',
  Biceps: '#EC4899',
  Legs: '#F97316',
  Core: '#14B8A6',
  // Fine-grained groups used by the recovery map (RECOVERY_MUSCLES). Legs
  // splits into its four heads; Core → Abs; Biceps → Forearms.
  Quads: '#F97316',
  Hamstrings: '#FB923C',
  Glutes: '#EA580C',
  Calves: '#FDBA74',
  Abs: '#14B8A6',
  Forearms: '#F472B6',
};

export const REST_TIMER_OPTIONS = [30, 60, 90, 120] as const;
