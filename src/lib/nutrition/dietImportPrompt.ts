import { INDIAN_FOOD_DATABASE } from '@/lib/nutrition/indianFoodDatabase';
import { MEAL_SLOT_LABELS } from '@/types/nutrition';
import type { NutrientsPerServing } from '@/types/nutrition';

export function formatFoodCatalogForPrompt(maxItems = 40): string {
  const lines = INDIAN_FOOD_DATABASE.slice(0, maxItems).map(
    (f) => `- ${f.name} (${f.servingLabel})`
  );
  if (INDIAN_FOOD_DATABASE.length > maxItems) {
    lines.push(`… and ${INDIAN_FOOD_DATABASE.length - maxItems} more foods in the app database`);
  }
  return lines.join('\n');
}

export function formatNutritionGapBlock(
  totals: NutrientsPerServing,
  targets: NutrientsPerServing
): string {
  const calLeft = Math.max(0, Math.round(targets.calories - totals.calories));
  const proteinLeft = Math.max(
    0,
    Math.round((targets.proteinG - totals.proteinG) * 10) / 10
  );
  return `Daily targets: ${targets.calories} kcal, ${targets.proteinG}g protein.
Logged so far: ${totals.calories} kcal, ${totals.proteinG}g protein.
Remaining: ${calLeft} kcal, ${proteinLeft}g protein.`;
}

export interface BuildDietAIPromptParams {
  dateLabel: string;
  totals: NutrientsPerServing;
  targets: NutrientsPerServing;
}

export function buildDietAIPrompt({
  dateLabel,
  totals,
  targets,
}: BuildDietAIPromptParams): string {
  const mealSlots = Object.entries(MEAL_SLOT_LABELS)
    .map(([key, label]) => `${key} (${label})`)
    .join(', ');

  return `You are a nutrition expert. I will list foods and quantities I ate on ${dateLabel}.
Calculate total nutrients for each item (not per 100g — totals for what I actually ate).
Use ICMR-NIN / USDA references. Round: calories whole number, macros 1 decimal, minerals 1 decimal, vitamins 1 decimal.

${formatNutritionGapBlock(totals, targets)}

Prefer food names from this catalog when possible:
${formatFoodCatalogForPrompt()}

Return ONLY a JSON array. No markdown, no explanation.

Each item must include:
- foodName (string)
- mealSlot: one of ${mealSlots}
- quantity: { "amount": number, "unit": "g" | "piece" | "cup" | "tbsp" | "ml" | "serving" | "katori" | "slice" }
- servingLabel (reference portion, e.g. "100 g", "1 egg", "1 katori")
- servings (multiplier vs servingLabel)
- nutrients: { calories, proteinG, carbsG, fatG, fiberG, calciumMg, ironMg, magnesiumMg, potassiumMg, sodiumMg?, vitaminAMcg?, vitaminCMg?, vitaminDMcg?, vitaminB12Mcg? }

Example output:
[
  {
    "foodName": "Boiled Egg",
    "mealSlot": "breakfast",
    "quantity": { "amount": 2, "unit": "piece" },
    "servingLabel": "1 egg",
    "servings": 2,
    "nutrients": {
      "calories": 140,
      "proteinG": 12,
      "carbsG": 1,
      "fatG": 10,
      "fiberG": 0,
      "calciumMg": 50,
      "ironMg": 1.8,
      "magnesiumMg": 12,
      "potassiumMg": 140,
      "vitaminAMcg": 160,
      "vitaminCMg": 0,
      "vitaminDMcg": 2.2,
      "vitaminB12Mcg": 1.2
    }
  },
  {
    "foodName": "Rice (Cooked)",
    "mealSlot": "lunch",
    "quantity": { "amount": 150, "unit": "g" },
    "servingLabel": "100 g",
    "servings": 1.5,
    "nutrients": {
      "calories": 195,
      "proteinG": 4,
      "carbsG": 42,
      "fatG": 0.5,
      "fiberG": 0.6,
      "calciumMg": 15,
      "ironMg": 0.3,
      "magnesiumMg": 18,
      "potassiumMg": 53,
      "vitaminAMcg": 0,
      "vitaminCMg": 0,
      "vitaminDMcg": 0,
      "vitaminB12Mcg": 0
    }
  }
]

My food log:
[PASTE YOUR FOOD + QUANTITY HERE — e.g. Breakfast: 2 boiled eggs, 1 banana / Lunch: 2 chapati, 150g chicken breast]`;
}
