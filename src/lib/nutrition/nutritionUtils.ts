import type { MealSlot, NutrientsPerServing, NutritionLogEntry } from '@/types/nutrition';
import { scaleNutrients } from '@/lib/nutrition/nutritionCalculators';
import { getFoodById } from '@/lib/nutrition/indianFoodDatabase';
import { MEAL_SLOT_ORDER } from '@/types/nutrition';
import { getLocalDateString } from '@/lib/water/waterUtils';

export function getTodayDateKey(timezone: string): string {
  return getLocalDateString(new Date(), timezone);
}

export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(dateKey: string, timezone: string): string {
  const today = getTodayDateKey(timezone);
  const yesterday = shiftDateKey(today, -1);
  const d = new Date(dateKey + 'T12:00:00');
  const formatted = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: timezone,
  });
  if (dateKey === today) return `Today · ${formatted}`;
  if (dateKey === yesterday) return `Yesterday · ${formatted}`;
  return formatted;
}

export function groupEntriesByMeal(
  entries: NutritionLogEntry[]
): Record<MealSlot, NutritionLogEntry[]> {
  const groups = Object.fromEntries(
    MEAL_SLOT_ORDER.map((s) => [s, [] as NutritionLogEntry[]])
  ) as Record<MealSlot, NutritionLogEntry[]>;
  for (const e of entries) {
    if (groups[e.mealSlot]) groups[e.mealSlot].push(e);
  }
  return groups;
}

export function formatMacroShort(proteinG: number, carbsG: number, fatG: number): string {
  return `${Math.round(proteinG)}P/${Math.round(carbsG)}C/${Math.round(fatG)}F`;
}

export function formatKcal(n: number): string {
  return n.toLocaleString('en-IN');
}

export function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/** Per 1 serving from a logged entry (or food DB if foodId present) */
export function getPerServingNutrients(entry: NutritionLogEntry): NutrientsPerServing {
  if (entry.foodId) {
    const food = getFoodById(entry.foodId);
    if (food) return { ...food.nutrients };
  }
  const s = entry.servings > 0 ? entry.servings : 1;
  const n = entry.nutrients;
  return {
    calories: Math.round(n.calories / s),
    proteinG: Math.round((n.proteinG / s) * 10) / 10,
    carbsG: Math.round((n.carbsG / s) * 10) / 10,
    fatG: Math.round((n.fatG / s) * 10) / 10,
    fiberG: Math.round((n.fiberG / s) * 10) / 10,
    calciumMg: Math.round(n.calciumMg / s),
    ironMg: Math.round((n.ironMg / s) * 10) / 10,
    magnesiumMg: Math.round(n.magnesiumMg / s),
    potassiumMg: Math.round(n.potassiumMg / s),
  };
}

export function nutrientsForServings(
  entry: NutritionLogEntry,
  servings: number
): NutrientsPerServing {
  return scaleNutrients(getPerServingNutrients(entry), servings);
}
