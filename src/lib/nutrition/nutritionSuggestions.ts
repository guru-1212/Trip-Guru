import type { FoodItem, NutrientsPerServing, NutritionLogEntry } from '@/types/nutrition';
import { INDIAN_FOOD_DATABASE } from '@/lib/nutrition/indianFoodDatabase';
import { scaleNutrients } from '@/lib/nutrition/nutritionCalculators';

export interface FoodSuggestion {
  food: FoodItem;
  label: string;
  servings: number;
  benefit: string;
}

function remaining(targets: NutrientsPerServing, totals: NutrientsPerServing) {
  return {
    proteinG: Math.max(0, targets.proteinG - totals.proteinG),
    calories: Math.max(0, targets.calories - totals.calories),
    fiberG: Math.max(0, targets.fiberG - totals.fiberG),
    calciumMg: Math.max(0, targets.calciumMg - totals.calciumMg),
    ironMg: Math.max(0, targets.ironMg - totals.ironMg),
  };
}

export function getNutritionSuggestions(
  totals: NutrientsPerServing,
  targets: NutrientsPerServing,
  loggedFoodIds: Set<string>,
  limit = 6
): FoodSuggestion[] {
  const rem = remaining(targets, totals);
  const suggestions: FoodSuggestion[] = [];

  const candidates = INDIAN_FOOD_DATABASE.filter((f) => !loggedFoodIds.has(f.id));

  if (rem.proteinG >= 15) {
    const proteinFoods = candidates
      .filter((f) => f.nutrients.proteinG >= 6)
      .sort((a, b) => b.nutrients.proteinG - a.nutrients.proteinG);
    for (const food of proteinFoods.slice(0, 3)) {
      const servings = food.nutrients.proteinG >= rem.proteinG ? 1 : Math.ceil(rem.proteinG / food.nutrients.proteinG);
      const scaled = scaleNutrients(food.nutrients, servings);
      suggestions.push({
        food,
        servings,
        label: servings > 1 ? `${food.name} ×${servings}` : food.name,
        benefit: `+${Math.round(scaled.proteinG)}g protein`,
      });
    }
  }

  if (rem.calories >= 150) {
    const calFoods = candidates
      .filter((f) => f.nutrients.calories >= 100 && !suggestions.some((s) => s.food.id === f.id))
      .sort((a, b) => b.nutrients.calories - a.nutrients.calories);
    for (const food of calFoods.slice(0, 2)) {
      suggestions.push({
        food,
        servings: 1,
        label: food.name,
        benefit: `+${food.nutrients.calories} kcal`,
      });
    }
  }

  if (rem.calciumMg >= 100) {
    const dairy = candidates.find(
      (f) =>
        (f.category === 'dairy' || f.name.toLowerCase().includes('milk')) &&
        !suggestions.some((s) => s.food.id === f.id)
    );
    if (dairy) {
      suggestions.push({
        food: dairy,
        servings: 1,
        label: dairy.name,
        benefit: `+${dairy.nutrients.calciumMg}mg calcium`,
      });
    }
  }

  if (rem.ironMg >= 2) {
    const ironFood = candidates.find(
      (f) =>
        f.nutrients.ironMg >= 2 &&
        !suggestions.some((s) => s.food.id === f.id)
    );
    if (ironFood) {
      suggestions.push({
        food: ironFood,
        servings: 1,
        label: ironFood.name,
        benefit: `+${ironFood.nutrients.ironMg}g iron, fibre`,
      });
    }
  }

  return suggestions.slice(0, limit);
}

export function getLoggedFoodIds(entries: NutritionLogEntry[]): Set<string> {
  return new Set(entries.map((e) => e.foodId).filter(Boolean) as string[]);
}
