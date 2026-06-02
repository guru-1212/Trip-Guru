import { FitnessGoal } from '@/types/gym';

export function foodSuggestionsForGoal(goal: FitnessGoal): string[] {
  switch (goal) {
    case 'weight_loss':
      return [
        'Focus on high-volume meals: salads, soups, vegetables, lean protein.',
        'Swap calorie-dense snacks with fruit, yogurt, or roasted chickpeas.',
        'Build plates with half vegetables, quarter protein, quarter carbs.',
      ];
    case 'weight_gain':
      return [
        'Use calorie-dense whole foods: nuts, nut butters, whole milk, oats.',
        'Add one extra snack with protein + carbs daily.',
        'Prioritize post-workout carbs with protein for recovery.',
      ];
    case 'muscle_gain':
      return [
        'Distribute protein across 4-5 meals through the day.',
        'Pair training days with slightly higher carbs for performance.',
        'Include eggs, paneer/chicken/fish, lentils, and greek yogurt.',
      ];
    case 'strength_gain':
      return [
        'Center meals around recovery: protein, quality carbs, hydration.',
        'Keep pre-workout meals easy to digest and carb-focused.',
        'Use consistent meal timing on heavy lifting days.',
      ];
    default:
      return [
        'Keep meals balanced and repeatable to maintain consistency.',
        'Choose mostly whole foods while allowing flexible choices.',
        'Track trends weekly and adjust portions gently.',
      ];
  }
}
