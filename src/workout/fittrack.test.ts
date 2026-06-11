import dayjs from 'dayjs';
import {
  calcSetVolume,
  calcExerciseVolume,
  calcWorkoutVolume,
  kgToLbs,
  lbsToKg,
  estimateOneRepMax,
  suggestWeight,
  syncWorkoutHabits,
} from './utils';
import {
  filterByRange,
  calcTrainingOverview,
} from './analytics';
import { normalizeChecklist } from '../firebase/fittrack.firestore';
import type { WorkoutSession, WorkoutExercise, WorkoutSet, ChecklistData } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

function testVolumeCalculations() {
  console.log('Testing Volume Calculations...');
  
  const set1: WorkoutSet = { weight: 100, reps: 10, done: true };
  const set2: WorkoutSet = { weight: 100, reps: 10, done: false }; // Not done
  const set3: WorkoutSet = { weight: 0, reps: 10, done: true };    // Zero weight
  
  assert(calcSetVolume(set1) === 1000, 'Set volume should be 1000');
  assert(calcSetVolume(set2) === 0, 'Incomplete set should have 0 volume');
  assert(calcSetVolume(set3) === 0, 'Zero weight set should have 0 volume');

  const exercise: WorkoutExercise = {
    exerciseId: '1',
    name: 'Bench Press',
    variation: 'Barbell',
    muscle: 'Chest',
    sets: [set1, set2, { weight: 80, reps: 12, done: true }]
  };

  assert(calcExerciseVolume(exercise) === 1960, 'Exercise volume should be 1000 + 0 + 960 = 1960');

  const workout: WorkoutSession = {
    id: 'w1',
    date: '2024-01-01',
    splitId: 'ct',
    splitName: 'Chest/Triceps',
    duration: 3600,
    exercises: [exercise, { ...exercise, exerciseId: '2' }],
    totalSets: 6,
    totalVolume: 0 // to be calculated
  };

  assert(calcWorkoutVolume(workout.exercises) === 3920, 'Workout volume should be 1960 * 2 = 3920');
}

function testUnitConversions() {
  console.log('Testing Unit Conversions...');
  
  assert(kgToLbs(100) === 220.5, '100kg should be 220.5lbs');
  assert(lbsToKg(220.5) === 100, '220.5lbs should be 100kg');
  assert(kgToLbs(0) === 0, '0kg should be 0lbs');
}

function testStrengthEstimations() {
  console.log('Testing Strength Estimations (1RM)...');
  
  // Epley formula: weight * (1 + reps/30)
  assert(estimateOneRepMax(100, 10) === 133, '100kg x 10 should estimate 133kg 1RM');
  assert(estimateOneRepMax(100, 1) === 100, '100kg x 1 should estimate 100kg 1RM');
  assert(estimateOneRepMax(0, 10) === 0, '0 weight should estimate 0 1RM');
}

function testWeightSuggestions() {
  console.log('Testing Weight Suggestions...');
  
  // suggestWeight(lastWeight, lastReps, unit)
  // If reps >= 10, suggest increase of 2.5kg or 5lbs
  assert(suggestWeight(100, 10, 'kg') === 102.5, 'Should suggest 102.5kg after 100kg x 10');
  assert(suggestWeight(100, 8, 'kg') === 100, 'Should suggest 100kg after 100kg x 8');
  assert(suggestWeight(lbsToKg(220), 10, 'lbs') === 102.1, 'Should suggest 225lbs (in kg approx) after 220lbs x 10');
  // 220lbs is 99.8kg. 225lbs is 102.1kg.
}

function testAnalyticsFiltering() {
  console.log('Testing Analytics Filtering...');
  
  const workouts: WorkoutSession[] = [
    { id: '1', date: '2024-01-01', exercises: [], duration: 3000 } as any,
    { id: '2', date: '2024-01-05', exercises: [], duration: 3000 } as any,
    { id: '3', date: '2024-01-10', exercises: [], duration: 3000 } as any,
  ];

  const filtered = filterByRange(workouts, '2024-01-01', '2024-01-06');
  assert(filtered.length === 2, 'Should find 2 workouts in range');
  assert(filtered[0].id === '1' && filtered[1].id === '2', 'Should have IDs 1 and 2');
}

function testTrainingOverview() {
  console.log('Testing Training Overview...');
  
  const today = dayjs().format('YYYY-MM-DD');
  const workouts: WorkoutSession[] = [
    { id: '1', date: today, exercises: [], duration: 3600, totalVolume: 1000 } as any,
  ];

  const overview = calcTrainingOverview(workouts, 'week');
  assert(overview.totalWorkouts === 1, 'Should have 1 workout this week');
  assert(overview.trainingHours === 1, 'Should have 1 training hour');
}

function testChecklistNormalization() {
  console.log('Testing Checklist Normalization...');
  
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');
  
  const oldChecklist: ChecklistData = {
    date: yesterday,
    dailyItems: [{ id: '1', label: 'Item 1', done: true, type: 'pre' }],
    custom: [{ id: 'c1', label: 'Custom 1', done: false, type: 'custom' }]
  };

  const normalized = normalizeChecklist(oldChecklist);
  assert(normalized.date === today, 'Normalized date should be today');
  assert(normalized.dailyItems.every(item => !item.done), 'Daily items should be reset');
  assert(normalized.custom.length === 1, 'Custom items should be preserved');
  assert(normalized.custom[0].id === 'c1', 'Custom item ID should be preserved');
}

function testSyncHabits() {
  console.log('Testing Habit Sync...');
  
  const workouts: WorkoutSession[] = [
    { id: '1', date: '2024-01-01' } as any,
  ];
  const habits = {
    '2024-01-01': { workout: false, water: true, sleep: true, protein: true, steps: true },
    '2024-01-02': { workout: true, water: true, sleep: true, protein: true, steps: true },
  };

  const synced = syncWorkoutHabits(workouts, habits);
  assert(synced['2024-01-01'].workout === true, 'Habit for 2024-01-01 should have workout true');
  assert(synced['2024-01-02'].workout === false, 'Habit for 2024-01-02 should have workout false (no workout that day)');
}

function runTests() {
  try {
    testVolumeCalculations();
    testUnitConversions();
    testStrengthEstimations();
    testWeightSuggestions();
    testAnalyticsFiltering();
    testTrainingOverview();
    testChecklistNormalization();
    testSyncHabits();
    console.log('\nAll FitTrack tests passed! ✅');
  } catch (error) {
    console.error('\nTests failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

runTests();
