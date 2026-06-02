import { ActivityLevel, FitnessGoal, Gender } from '@/types/gym';

const activityMultiplier: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

function toOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  if (!heightM) return 0;
  return toOneDecimal(weightKg / (heightM * heightM));
}

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  if (gender === 'male') return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  if (gender === 'female') return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 78);
}

export function calculateMaintenanceCalories(
  bmr: number,
  activityLevel: ActivityLevel
): number {
  return Math.round(bmr * activityMultiplier[activityLevel]);
}

export function calculateGoalCalories(
  maintenanceCalories: number,
  goal: FitnessGoal
): number {
  switch (goal) {
    case 'weight_loss':
      return Math.max(1200, maintenanceCalories - 400);
    case 'weight_gain':
      return maintenanceCalories + 350;
    case 'muscle_gain':
      return maintenanceCalories + 250;
    case 'strength_gain':
      return maintenanceCalories + 180;
    default:
      return maintenanceCalories;
  }
}

export function calculateMacros(
  calories: number,
  weightKg: number,
  goal: FitnessGoal
): { proteinG: number; carbsG: number; fatsG: number } {
  const proteinMultiplier =
    goal === 'muscle_gain' || goal === 'strength_gain' ? 2.1 : goal === 'weight_loss' ? 2 : 1.8;
  const proteinG = Math.round(weightKg * proteinMultiplier);

  const fatsCal = calories * 0.25;
  const fatsG = Math.round(fatsCal / 9);

  const proteinCal = proteinG * 4;
  const carbsG = Math.max(80, Math.round((calories - proteinCal - fatsG * 9) / 4));

  return { proteinG, carbsG, fatsG };
}

export function calculateWaterMl(weightKg: number, activityLevel: ActivityLevel): number {
  const base = weightKg * 35;
  const extra =
    activityLevel === 'sedentary'
      ? 0
      : activityLevel === 'lightly_active'
      ? 300
      : activityLevel === 'moderately_active'
      ? 500
      : activityLevel === 'very_active'
      ? 700
      : 1000;
  return Math.round(base + extra);
}
