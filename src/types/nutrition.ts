export type MealSlot =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'pre_workout'
  | 'post_workout';

export type GainPace = 'slow' | 'moderate' | 'aggressive';

export type FoodCategory =
  | 'protein'
  | 'staple'
  | 'dairy'
  | 'fruit'
  | 'nut'
  | 'snack'
  | 'breakfast'
  | 'dal'
  | 'beverage'
  | 'supplement'
  | 'custom';

export type FoodTag = 'veg' | 'egg' | 'non_veg' | 'protein_rich' | 'snack' | 'staple';

export interface NutrientsPerServing {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  calciumMg: number;
  ironMg: number;
  magnesiumMg: number;
  potassiumMg: number;
  sodiumMg?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  nameHi?: string;
  servingLabel: string;
  servingGrams?: number;
  nutrients: NutrientsPerServing;
  category: FoodCategory;
  tags: FoodTag[];
  isCustom?: boolean;
  source?: string;
  price?: number; // Estimated price in local currency
}

export interface NutritionTargets extends NutrientsPerServing {
  targetWeightKg: number;
  currentWeightKg: number;
}

export interface NutritionSettings {
  gainPace: GainPace;
  targetWeightKg: number;
  targetDate?: string;
  overrides?: Partial<NutrientsPerServing>;
  timezone: string;
  googleCalendarEventId?: string;
}

export interface NutritionLogEntry {
  id: string;
  foodId?: string;
  name: string;
  mealSlot: MealSlot;
  servings: number;
  nutrients: NutrientsPerServing;
  time: string;
  isCustom: boolean;
}

export interface NutritionLogDoc {
  entries: NutritionLogEntry[];
  totals: NutrientsPerServing;
  targets: NutrientsPerServing;
  completed: boolean;
}

export interface MicronutrientCoverage {
  calcium: number;
  iron: number;
  magnesium: number;
  potassium: number;
  fiber: number;
  protein: number;
}

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
  pre_workout: 'Pre-workout snack',
  post_workout: 'Post-workout',
};

export const MEAL_SLOT_ORDER: MealSlot[] = [
  'breakfast',
  'lunch',
  'pre_workout',
  'snack',
  'dinner',
  'post_workout',
];

export const EMPTY_NUTRIENTS: NutrientsPerServing = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  calciumMg: 0,
  ironMg: 0,
  magnesiumMg: 0,
  potassiumMg: 0,
};
