import type { DayKey, MuscleGroup, SplitDefinition, SplitId, WeekSchedule } from './types';

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
  // Push / Pull / Legs program. Push and Pull pools are explicit id lists
  // (see EXPLICIT_SPLIT_MEMBERS in exerciseLibrary.ts); Legs + Core is a
  // combined split of `legs` + `core`.
  {
    id: 'push',
    name: 'Push',
    muscles: ['Chest', 'Front/Side Delts', 'Triceps'],
    icon: 'push',
  },
  {
    id: 'pull',
    name: 'Pull',
    muscles: ['Back', 'Rear Delts', 'Biceps', 'Forearms'],
    icon: 'pull',
  },
  {
    id: 'legscore',
    name: 'Legs + Core',
    muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Obliques'],
    icon: 'legscore',
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
  legscore: ['legs', 'core'],
};

/** Canonical order of the coarse muscle groups used across pickers and filters. */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Triceps',
  'Biceps',
  'Legs',
  'Core',
];

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

export interface WeekSchedulePreset {
  id: string;
  name: string;
  description: string;
  schedule: WeekSchedule;
}

/** One-tap programs offered on the profile's weekly schedule editor. */
export const WEEK_SCHEDULE_PRESETS: WeekSchedulePreset[] = [
  {
    id: 'ppl6',
    name: 'Push Pull Legs (6-day)',
    description: 'Push · Pull · Legs + Core, twice a week',
    schedule: {
      Mon: 'push',
      Tue: 'pull',
      Wed: 'legscore',
      Thu: 'push',
      Fri: 'pull',
      Sat: 'legscore',
      Sun: 'rest',
    },
  },
  {
    id: 'ppl3',
    name: 'Push Pull Legs (3-day)',
    description: 'Mon Push · Wed Pull · Fri Legs + Core',
    schedule: {
      Mon: 'push',
      Tue: 'rest',
      Wed: 'pull',
      Thu: 'rest',
      Fri: 'legscore',
      Sat: 'rest',
      Sun: 'rest',
    },
  },
  {
    id: 'classic',
    name: 'Classic split',
    description: 'Chest+Tri · Back+Bi · Shoulders · Core · Upper · Legs · Core+Sh',
    schedule: DEFAULT_WEEK_SCHEDULE,
  },
];

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
  push: '🤜',
  pull: '🧲',
  legscore: '🦿',
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
  push: 'Push',
  pull: 'Pull',
  legscore: 'Legs + Core',
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
