import {
  calculateBMR,
  calculateGoalCalories,
  calculateMacros,
  calculateMaintenanceCalories,
} from '@/lib/gymCalculators';
import type { ActivityLevel, FitnessGoal, Gender } from '@/types/gym';
import type {
  GainPace,
  NutrientsPerServing,
  NutritionLogEntry,
  NutritionTargets,
  MicronutrientCoverage,
  VitaminCoverage,
} from '@/types/nutrition';
import { EMPTY_NUTRIENTS } from '@/types/nutrition';
import type { UserProfile } from '@/workout/types';

const GAIN_SURPLUS: Record<GainPace, number> = {
  slow: 250,
  moderate: 350,
  aggressive: 500,
};

const WEEKLY_GAIN_KG: Record<GainPace, number> = {
  slow: 0.25,
  moderate: 0.35,
  aggressive: 0.5,
};

function toGender(g: string): Gender {
  const lower = g.toLowerCase();
  if (lower === 'female') return 'female';
  if (lower === 'other') return 'other';
  return 'male';
}

function toFitnessGoal(goal: string): FitnessGoal {
  const g = goal.toLowerCase();
  if (g.includes('fat') || g.includes('lose')) return 'weight_loss';
  if (g.includes('strength')) return 'strength_gain';
  if (g.includes('muscle') || g.includes('build')) return 'muscle_gain';
  if (g.includes('endurance')) return 'maintenance';
  return 'weight_gain';
}

export function computeNutritionTargets(
  profile: Pick<UserProfile, 'age' | 'gender' | 'height' | 'weight' | 'goal'>,
  gainPace: GainPace = 'moderate',
  targetWeightKg?: number,
  overrides?: Partial<NutrientsPerServing>
): NutritionTargets {
  const gender = toGender(profile.gender);
  const fitnessGoal = toFitnessGoal(profile.goal);
  const activityLevel: ActivityLevel = 'moderately_active';

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, gender);
  const maintenance = calculateMaintenanceCalories(bmr, activityLevel);
  let calories = calculateGoalCalories(maintenance, fitnessGoal);

  if (fitnessGoal === 'weight_gain' || fitnessGoal === 'muscle_gain') {
    calories = maintenance + GAIN_SURPLUS[gainPace];
  }

  const macros = calculateMacros(calories, profile.weight, fitnessGoal);
  const isMale = gender === 'male';

  const base: NutritionTargets = {
    calories,
    proteinG: Math.max(macros.proteinG, Math.round(profile.weight * 1.8)),
    carbsG: macros.carbsG,
    fatG: macros.fatsG,
    fiberG: 30,
    calciumMg: isMale ? 600 : 800,
    ironMg: isMale ? 17 : 21,
    magnesiumMg: 400,
    potassiumMg: 3500,
    vitaminAMcg: isMale ? 900 : 700,
    vitaminCMg: isMale ? 90 : 75,
    vitaminDMcg: Math.round(15 + (Math.max(0, profile.weight - 70) * 0.1)),
    vitaminB12Mcg: 2.4,
    targetWeightKg: targetWeightKg ?? profile.weight + 5,
    currentWeightKg: profile.weight,
  };

  return { ...base, ...overrides };
}

export function scaleNutrients(
  nutrients: NutrientsPerServing,
  servings: number
): NutrientsPerServing {
  const s = servings;
  return {
    calories: Math.round(nutrients.calories * s),
    proteinG: Math.round(nutrients.proteinG * s * 10) / 10,
    carbsG: Math.round(nutrients.carbsG * s * 10) / 10,
    fatG: Math.round(nutrients.fatG * s * 10) / 10,
    fiberG: Math.round(nutrients.fiberG * s * 10) / 10,
    calciumMg: Math.round(nutrients.calciumMg * s),
    ironMg: Math.round(nutrients.ironMg * s * 10) / 10,
    magnesiumMg: Math.round(nutrients.magnesiumMg * s),
    potassiumMg: Math.round(nutrients.potassiumMg * s),
    sodiumMg: nutrients.sodiumMg != null ? Math.round(nutrients.sodiumMg * s) : undefined,
    vitaminAMcg: nutrients.vitaminAMcg != null ? Math.round(nutrients.vitaminAMcg * s) : undefined,
    vitaminCMg: nutrients.vitaminCMg != null ? Math.round(nutrients.vitaminCMg * s * 10) / 10 : undefined,
    vitaminDMcg: nutrients.vitaminDMcg != null ? Math.round(nutrients.vitaminDMcg * s * 10) / 10 : undefined,
    vitaminB12Mcg: nutrients.vitaminB12Mcg != null ? Math.round(nutrients.vitaminB12Mcg * s * 10) / 10 : undefined,
  };
}

export function sumNutrients(entries: NutritionLogEntry[]): NutrientsPerServing {
  return entries.reduce(
    (acc, e) => {
      const n = e.nutrients;
      return {
        calories: acc.calories + n.calories,
        proteinG: Math.round((acc.proteinG + n.proteinG) * 10) / 10,
        carbsG: Math.round((acc.carbsG + n.carbsG) * 10) / 10,
        fatG: Math.round((acc.fatG + n.fatG) * 10) / 10,
        fiberG: Math.round((acc.fiberG + n.fiberG) * 10) / 10,
        calciumMg: acc.calciumMg + n.calciumMg,
        ironMg: Math.round((acc.ironMg + n.ironMg) * 10) / 10,
        magnesiumMg: acc.magnesiumMg + n.magnesiumMg,
        potassiumMg: acc.potassiumMg + n.potassiumMg,
        sodiumMg: (acc.sodiumMg ?? 0) + (n.sodiumMg ?? 0),
        vitaminAMcg: (acc.vitaminAMcg ?? 0) + (n.vitaminAMcg ?? 0),
        vitaminCMg: Math.round(((acc.vitaminCMg ?? 0) + (n.vitaminCMg ?? 0)) * 10) / 10,
        vitaminDMcg: Math.round(((acc.vitaminDMcg ?? 0) + (n.vitaminDMcg ?? 0)) * 10) / 10,
        vitaminB12Mcg: Math.round(((acc.vitaminB12Mcg ?? 0) + (n.vitaminB12Mcg ?? 0)) * 10) / 10,
      };
    },
    { ...EMPTY_NUTRIENTS }
  );
}

export function computeCoverage(
  totals: NutrientsPerServing,
  targets: NutrientsPerServing
): MicronutrientCoverage {
  const pct = (v: number, t: number) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);
  return {
    protein: pct(totals.proteinG, targets.proteinG),
    calcium: pct(totals.calciumMg, targets.calciumMg),
    iron: pct(totals.ironMg, targets.ironMg),
    magnesium: pct(totals.magnesiumMg, targets.magnesiumMg),
    potassium: pct(totals.potassiumMg, targets.potassiumMg),
    fiber: pct(totals.fiberG, targets.fiberG),
  };
}

export function computeVitaminCoverage(
  totals: NutrientsPerServing,
  targets: NutrientsPerServing
): VitaminCoverage {
  const pct = (v: number, t: number) => (t > 0 ? Math.min(100, Math.round((v / t) * 100)) : 0);
  return {
    vitaminA: pct(totals.vitaminAMcg ?? 0, targets.vitaminAMcg ?? 900),
    vitaminC: pct(totals.vitaminCMg ?? 0, targets.vitaminCMg ?? 90),
    vitaminD: pct(totals.vitaminDMcg ?? 0, targets.vitaminDMcg ?? 15),
    vitaminB12: pct(totals.vitaminB12Mcg ?? 0, targets.vitaminB12Mcg ?? 2.4),
  };
}

export function computeWeightProjection(
  currentKg: number,
  targetKg: number,
  gainPace: GainPace
): { kgToGo: number; weeksMin: number; weeksMax: number; label: string } {
  const kgToGo = Math.max(0, Math.round((targetKg - currentKg) * 10) / 10);
  if (kgToGo <= 0) {
    return { kgToGo: 0, weeksMin: 0, weeksMax: 0, label: 'Goal reached' };
  }
  const weekly = WEEKLY_GAIN_KG[gainPace];
  const weeks = kgToGo / weekly;
  const weeksMin = Math.max(1, Math.floor(weeks * 0.85));
  const weeksMax = Math.ceil(weeks * 1.2);
  const monthsMin = Math.max(1, Math.round(weeksMin / 4));
  const monthsMax = Math.max(monthsMin, Math.round(weeksMax / 4));
  return {
    kgToGo,
    weeksMin,
    weeksMax,
    label: `~${monthsMin}–${monthsMax} months realistic`,
  };
}

export function isNutritionGoalMet(
  totals: NutrientsPerServing,
  targets: NutrientsPerServing
): boolean {
  return totals.calories >= targets.calories * 0.9 && totals.proteinG >= targets.proteinG * 0.9;
}
