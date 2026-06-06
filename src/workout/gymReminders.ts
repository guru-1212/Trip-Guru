import { SPLIT_NAMES } from './constants';
import type { DayKey, FitnessGoal, SplitId, UserProfile } from './types';

const PRE_MEAL_TEMPLATES: Record<FitnessGoal, string[]> = {
  'Build Muscle': [
    'Oats + banana + whey (~{protein}g protein). Eat light, easy to digest.',
    'Greek yogurt + honey + almonds (~{protein}g protein). Keeps energy steady.',
    '2 eggs + toast + peanut butter (~{protein}g protein). Simple and effective.',
  ],
  'Lose Fat': [
    'Apple + handful of almonds (~{protein}g protein). Light fuel, no crash.',
    'Egg whites + whole-grain toast (~{protein}g protein). Lean pre-workout snack.',
    'Protein shake + berries (~{protein}g protein). Low calorie, quick digest.',
  ],
  Strength: [
    'Rice cakes + peanut butter + banana (~{protein}g protein). Carbs for heavy lifts.',
    'Paneer sandwich on whole grain (~{protein}g protein). Solid pre-session fuel.',
    'Oats + milk + dates (~{protein}g protein). Steady energy for PR attempts.',
  ],
  Endurance: [
    'Banana + dates (~{protein}g protein). Quick carbs for longer sessions.',
    'Smoothie: milk, banana, oats (~{protein}g protein). Hydrating pre-workout.',
    'Toast + jam + boiled egg (~{protein}g protein). Balanced endurance fuel.',
  ],
  General: [
    'Banana + peanut butter (~{protein}g protein). Easy pre-workout snack.',
    'Yogurt + fruit + granola (~{protein}g protein). Balanced and light.',
    'Handful of nuts + an orange (~{protein}g protein). Simple whole-food option.',
  ],
};

const DAY_INDEX: Record<DayKey, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function preWorkoutProteinGrams(weightKg: number): number {
  return Math.round(weightKg * 0.35);
}

function postWorkoutProteinGrams(weightKg: number): number {
  const low = Math.round(weightKg * 0.35);
  const high = Math.round(weightKg * 0.5);
  return Math.max(low, Math.min(high, 40));
}

export function getPreWorkoutMealSuggestion(
  goal: FitnessGoal,
  weightKg: number,
  dayKey: DayKey
): string {
  const templates = PRE_MEAL_TEMPLATES[goal] ?? PRE_MEAL_TEMPLATES.General;
  const template = templates[DAY_INDEX[dayKey] % templates.length];
  const protein = preWorkoutProteinGrams(weightKg);
  return template.replace('{protein}', String(protein));
}

export function getGetReadyMessage(splitId: SplitId): string {
  const splitName = SPLIT_NAMES[splitId] ?? 'Workout';
  return `Gym in 1 hour — shower, pack your bag, and warm up. Today: ${splitName}.`;
}

export function getProteinReminderMessage(weightKg: number): string {
  const grams = postWorkoutProteinGrams(weightKg);
  return `Anabolic window closing — aim for ~${grams}g protein in the next 10 minutes.`;
}

export function reminderNotificationUrl(type: 'pre_meal' | 'get_ready' | 'protein'): string {
  if (type === 'get_ready') return '/fittrack/workout';
  return '/fittrack/checklist';
}

export function reminderFcmType(type: 'pre_meal' | 'get_ready' | 'protein'): string {
  return `gym.reminder.${type}`;
}

export function buildPreMealPayload(profile: UserProfile, dayKey: DayKey) {
  const body = getPreWorkoutMealSuggestion(profile.goal, profile.weight, dayKey);
  return {
    title: 'Pre-workout meal',
    body: `Pre-workout fuel: ${body}`,
    url: reminderNotificationUrl('pre_meal'),
  };
}

export function buildGetReadyPayload(splitId: SplitId) {
  return {
    title: 'Get ready for gym',
    body: getGetReadyMessage(splitId),
    url: reminderNotificationUrl('get_ready'),
  };
}

export function buildProteinPayload(weightKg: number) {
  return {
    title: 'Protein reminder',
    body: getProteinReminderMessage(weightKg),
    url: reminderNotificationUrl('protein'),
  };
}
