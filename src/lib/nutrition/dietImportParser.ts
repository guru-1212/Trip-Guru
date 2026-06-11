import { INDIAN_FOOD_DATABASE } from '@/lib/nutrition/indianFoodDatabase';
import type { FoodItem, MealSlot, NutrientsPerServing } from '@/types/nutrition';
import { MEAL_SLOT_ORDER } from '@/types/nutrition';
import type {
  DietImportLogPayload,
  DietMatchResult,
  ImportedFoodItem,
  ImportedFoodQuantity,
} from '@/types/dietImport';

const GRAM_UNITS = new Set(['g', 'gram', 'grams', 'gm']);
const COUNT_UNITS = new Set([
  'piece',
  'pieces',
  'pc',
  'serving',
  'servings',
  'cup',
  'cups',
  'tbsp',
  'ml',
  'medium',
  'egg',
  'eggs',
  'slice',
  'slices',
  'katori',
]);

const MEAL_SLOT_SET = new Set<string>(MEAL_SLOT_ORDER);

export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

export function parseGramsFromLabel(label: string): number | null {
  const match = label.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!match) return null;
  const grams = Number(match[1]);
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

export function normalizeMealSlot(raw: string): MealSlot | null {
  const normalized = raw.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  if (MEAL_SLOT_SET.has(normalized)) return normalized as MealSlot;
  if (normalized === 'snacks') return 'snack';
  if (normalized === 'preworkout' || normalized === 'pre_workout_snack') return 'pre_workout';
  if (normalized === 'postworkout') return 'post_workout';
  return null;
}

function parseQuantity(raw: unknown): ImportedFoodQuantity | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const amount = Number(row.amount);
  const unit = typeof row.unit === 'string' ? row.unit.trim() : '';
  if (!Number.isFinite(amount) || amount <= 0 || !unit) return null;
  return { amount, unit };
}

function parseNutrients(raw: unknown): NutrientsPerServing | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const required = [
    'calories',
    'proteinG',
    'carbsG',
    'fatG',
    'fiberG',
    'calciumMg',
    'ironMg',
    'magnesiumMg',
    'potassiumMg',
  ] as const;

  const nutrients: NutrientsPerServing = {
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

  for (const key of required) {
    const value = Number(row[key]);
    if (!Number.isFinite(value) || value < 0) return null;
    nutrients[key] = key === 'calories' ? Math.round(value) : Math.round(value * 10) / 10;
  }

  if (row.sodiumMg != null) {
    const sodium = Number(row.sodiumMg);
    if (!Number.isFinite(sodium) || sodium < 0) return null;
    nutrients.sodiumMg = Math.round(sodium * 10) / 10;
  }

  return nutrients;
}

export function resolveServings(
  quantity: ImportedFoodQuantity,
  servingLabel: string,
  explicitServings?: number
): { servings: number; servingLabel: string } {
  const label = servingLabel.trim();
  const unit = quantity.unit.trim().toLowerCase();

  if (
    explicitServings != null &&
    Number.isFinite(explicitServings) &&
    explicitServings >= 0.25
  ) {
    return {
      servings: Math.round(explicitServings * 100) / 100,
      servingLabel: label || `${quantity.amount} ${quantity.unit}`,
    };
  }

  if (GRAM_UNITS.has(unit)) {
    const refGrams = parseGramsFromLabel(label);
    if (refGrams) {
      return {
        servings: Math.round((quantity.amount / refGrams) * 100) / 100,
        servingLabel: label || `${refGrams} g`,
      };
    }
    return {
      servings: 1,
      servingLabel: label || `${quantity.amount} g`,
    };
  }

  if (COUNT_UNITS.has(unit)) {
    return {
      servings: quantity.amount,
      servingLabel: label || `1 ${quantity.unit}`,
    };
  }

  return {
    servings: quantity.amount >= 0.25 ? quantity.amount : 1,
    servingLabel: label || `${quantity.amount} ${quantity.unit}`,
  };
}

export function parseImportedFoods(raw: unknown): ImportedFoodItem[] {
  if (!Array.isArray(raw)) {
    throw new Error('invalid');
  }
  if (raw.length === 0) {
    throw new Error('empty');
  }

  return raw.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('invalid');
    const row = item as Record<string, unknown>;

    if (typeof row.foodName !== 'string' || !row.foodName.trim()) {
      throw new Error('invalid');
    }

    const mealSlot = normalizeMealSlot(String(row.mealSlot ?? ''));
    if (!mealSlot) throw new Error('invalid');

    const quantity = parseQuantity(row.quantity);
    if (!quantity) throw new Error('invalid');

    const nutrients = parseNutrients(row.nutrients);
    if (!nutrients) throw new Error('invalid');

    const servingLabel =
      typeof row.servingLabel === 'string' && row.servingLabel.trim()
        ? row.servingLabel.trim()
        : '';

    const explicitServings =
      row.servings != null ? Number(row.servings) : undefined;
    if (explicitServings != null && (!Number.isFinite(explicitServings) || explicitServings < 0.25)) {
      throw new Error('invalid');
    }

    const resolved = resolveServings(quantity, servingLabel, explicitServings);

    return {
      foodName: row.foodName.trim(),
      mealSlot,
      quantity,
      servingLabel: resolved.servingLabel,
      servings: resolved.servings,
      nutrients,
    };
  });
}

export function matchFoodByName(name: string, customFoods: FoodItem[]): FoodItem | undefined {
  const normalized = name.trim().toLowerCase();
  const catalog = [...INDIAN_FOOD_DATABASE, ...customFoods];
  return catalog.find((f) => f.name.trim().toLowerCase() === normalized);
}

export function matchImportedFoods(
  parsed: ImportedFoodItem[],
  customFoods: FoodItem[]
): DietMatchResult[] {
  return parsed.map((imported) => {
    const libraryFood = matchFoodByName(imported.foodName, customFoods);
    if (!libraryFood) {
      return { imported, matched: false };
    }
    return { imported, matched: true, libraryFood };
  });
}

export function toLogPayload(result: DietMatchResult): DietImportLogPayload {
  const { imported, matched, libraryFood } = result;
  return {
    name: imported.foodName,
    mealSlot: imported.mealSlot,
    servings: imported.servings,
    nutrients: imported.nutrients,
    isCustom: !matched,
    ...(matched && libraryFood ? { foodId: libraryFood.id } : {}),
  };
}

export function formatQuantityDisplay(quantity: ImportedFoodQuantity): string {
  const unit = quantity.unit.trim();
  const amount =
    quantity.amount % 1 === 0 ? String(quantity.amount) : String(quantity.amount);
  return `${amount} ${unit}`;
}
