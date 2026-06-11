import type { FoodItem, MealSlot, NutrientsPerServing } from '@/types/nutrition';

export interface ImportedFoodQuantity {
  amount: number;
  unit: string;
}

export interface ImportedFoodItem {
  foodName: string;
  mealSlot: MealSlot;
  quantity: ImportedFoodQuantity;
  servingLabel: string;
  servings: number;
  nutrients: NutrientsPerServing;
}

export interface DietMatchResult {
  imported: ImportedFoodItem;
  matched: boolean;
  libraryFood?: FoodItem;
}

export type DietImportStep = 'paste' | 'processing' | 'preview' | 'error';

export interface DietImportLogPayload {
  name: string;
  mealSlot: MealSlot;
  servings: number;
  servingLabel: string;
  nutrients: NutrientsPerServing;
  isCustom: boolean;
  foodId?: string;
}
