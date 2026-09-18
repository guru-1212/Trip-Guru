/**
 * Energy / macro maths used by the diet tracker (Mifflin-St Jeor BMR, activity
 * multipliers, goal adjustments). Moved here from the retired gym module.
 */

export type FitnessGoal =
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'strength_gain'
  | 'maintenance';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'athlete';

export type Gender = 'male' | 'female' | 'other';

const activityMultiplier: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

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
