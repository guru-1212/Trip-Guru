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
  getLastSessionsForSplit,
  buildRepeatDataFromSession,
  repeatSessionPresetKey,
  exerciseMatchesSearch,
  getMatchingVariations,
  exerciseBelongsToSplit,
  getDefaultProfile,
  getRotationQueue,
  getNextRotationSplit,
  getScheduledSplitForDate,
} from './utils';
import {
  filterByRange,
  calcTrainingOverview,
} from './analytics';
import { normalizeChecklist } from '../firebase/fittrack.firestore';
import type { WorkoutSession, WorkoutExercise, WorkoutSet, ChecklistData, LibraryExercise, SplitId } from './types';

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

function testRepeatSessionHelpers() {
  console.log('Testing Repeat Session Helpers...');

  const workouts: WorkoutSession[] = [
    {
      id: 'w1',
      date: '2024-06-20',
      splitId: 'ct',
      splitName: 'Chest/Triceps',
      duration: 3600,
      exercises: [],
      totalSets: 0,
      totalVolume: 0,
    },
    {
      id: 'w2',
      date: '2024-06-24',
      splitId: 'ct',
      splitName: 'Chest/Triceps',
      duration: 3600,
      exercises: [],
      totalSets: 0,
      totalVolume: 0,
    },
    {
      id: 'w3',
      date: '2024-06-27',
      splitId: 'ct',
      splitName: 'Chest/Triceps',
      duration: 3600,
      exercises: [],
      totalSets: 0,
      totalVolume: 0,
    },
    {
      id: 'w4',
      date: '2024-06-28',
      splitId: 'bb',
      splitName: 'Back',
      duration: 3600,
      exercises: [],
      totalSets: 0,
      totalVolume: 0,
    },
    {
      id: 'w5',
      date: '2024-06-29',
      splitId: 'ct',
      splitName: 'Chest/Triceps',
      duration: 3600,
      exercises: [],
      totalSets: 0,
      totalVolume: 0,
    },
  ];

  const recent = getLastSessionsForSplit(workouts, 'ct', 3);
  assert(recent.length === 3, 'Should return 3 sessions for split');
  assert(recent[0].id === 'w5', 'Most recent session should be first');
  assert(recent[1].id === 'w3', 'Second session should be w3');
  assert(recent[2].id === 'w2', 'Third session should be w2');
  assert(recent.every((w) => w.splitId === 'ct'), 'All sessions should match split');

  const session: WorkoutSession = {
    id: 'repeat',
    date: '2024-06-27',
    splitId: 'ct',
    splitName: 'Chest/Triceps',
    duration: 3600,
    totalSets: 3,
    totalVolume: 3000,
    exercises: [
      {
        exerciseId: 'bench',
        name: 'Bench Press',
        variation: 'Barbell',
        muscle: 'Chest',
        sets: [
          { weight: 100, reps: 10, done: true },
          { weight: 100, reps: 8, done: true },
          { weight: 90, reps: 10, done: false },
        ],
      },
      {
        exerciseId: 'fly',
        name: 'Fly',
        variation: 'Cable',
        muscle: 'Chest',
        sets: [
          { weight: 0, reps: 0, done: false },
          { weight: 0, reps: 0, done: false },
        ],
      },
    ],
  };

  const { picks, presets } = buildRepeatDataFromSession(session);
  assert(picks.length === 2, 'Should create picks for all exercises');
  assert(picks[0].exerciseId === 'bench', 'Pick order should match session');
  assert(picks[0].variation === 'Barbell', 'Variation should be preserved');
  assert(picks[1].exerciseId === 'fly', 'Second exercise pick should be preserved');

  const benchKey = repeatSessionPresetKey('bench', 'Barbell');
  const benchSets = presets.get(benchKey);
  assert(benchSets?.length === 2, 'Should include only completed sets');
  assert(!!benchSets?.every((s) => !s.done), 'Preset sets should reset done to false');
  assert(benchSets?.[0].weight === 100 && benchSets?.[0].reps === 10, 'First set values preserved');
  assert(benchSets?.[1].weight === 100 && benchSets?.[1].reps === 8, 'Second set values preserved');
  assert(!presets.has(repeatSessionPresetKey('fly', 'Cable')), 'Exercises without done sets have no preset');
}

function testExerciseSearchHelpers() {
  console.log('Testing Exercise Search Helpers...');

  const benchPress: LibraryExercise = {
    id: 'bench-press',
    name: 'Bench Press',
    muscle: 'Chest',
    secondary: 'Triceps',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    variations: ['Flat Barbell', 'Incline Barbell', 'Decline Barbell'],
    tips: [],
    splitIds: ['ct'],
    category: ['Chest'],
  };

  const variations = benchPress.variations;

  assert(
    exerciseMatchesSearch(benchPress, 'incline', variations),
    'Should match variation substring incline'
  );
  assert(
    exerciseMatchesSearch(benchPress, 'bench', variations),
    'Should match exercise name'
  );
  assert(
    !exerciseMatchesSearch(benchPress, 'squat', variations),
    'Should not match unrelated query'
  );

  const allWhenNameMatch = getMatchingVariations(variations, 'bench press');
  assert(
    allWhenNameMatch.length === variations.length,
    'Should return all variations when exercise name matches but no variation substring matches'
  );

  const matchedOnly = getMatchingVariations(variations, 'incline');
  assert(matchedOnly.length === 1, 'Should return only matched variations');
  assert(matchedOnly[0] === 'Incline Barbell', 'Should return Incline Barbell for incline query');
}

function testSplitExerciseFilter() {
  console.log('Testing Split Exercise Filter...');

  const chestEx: LibraryExercise = {
    id: 'bench',
    name: 'Bench Press',
    muscle: 'Chest',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    variations: ['Flat'],
    tips: [],
    splitIds: ['ct'],
    category: ['Chest'],
  };

  const legEx: LibraryExercise = {
    id: 'squat',
    name: 'Squat',
    muscle: 'Legs',
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    variations: ['Standard'],
    tips: [],
    splitIds: ['legs'],
    category: ['Legs'],
  };

  assert(exerciseBelongsToSplit(chestEx, 'ct'), 'Chest exercise belongs to ct split');
  assert(!exerciseBelongsToSplit(legEx, 'ct'), 'Leg exercise does not belong to ct split');
  assert(exerciseBelongsToSplit(legEx, 'legs'), 'Leg exercise belongs to legs split');
}

function testRotationScheduling() {
  console.log('Testing Rotation Scheduling...');

  const session = (date: string, splitId: SplitId): WorkoutSession => ({
    id: date + splitId,
    date,
    splitId,
    splitName: splitId,
    duration: 0,
    exercises: [],
    totalSets: 0,
    totalVolume: 0,
  });

  const profile = getDefaultProfile(); // Mon ct, Tue bb, Wed sh, Thu core, Fri ctbb, Sat legs, Sun coresh
  const queue = getRotationQueue(profile);
  assert(
    JSON.stringify(queue) === JSON.stringify(['ct', 'bb', 'sh', 'core', 'ctbb', 'legs', 'coresh']),
    'Rotation queue follows weekday order excluding rest'
  );

  // getNextRotationSplit
  assert(getNextRotationSplit(null, queue) === 'ct', 'No last split → first in queue');
  assert(getNextRotationSplit('ct', queue) === 'bb', 'ct → bb');
  assert(getNextRotationSplit('coresh', queue) === 'ct', 'last split wraps to first');
  assert(getNextRotationSplit('rest', queue) === 'ct', 'unknown split → first');

  // Dates: 2025-01-06 Mon, 07 Tue, 08 Wed, 09 Thu
  // No history → first workout in rotation.
  assert(getScheduledSplitForDate('2025-01-06', profile, [], []) === 'ct', 'Empty history → ct');

  // Did ct Monday → Tuesday should be bb.
  const afterCt = [session('2025-01-06', 'ct')];
  assert(getScheduledSplitForDate('2025-01-07', profile, afterCt, []) === 'bb', 'After ct → bb');

  // CARRY-OVER: skipped Tuesday (no log) → Wednesday still shows bb.
  assert(
    getScheduledSplitForDate('2025-01-08', profile, afterCt, []) === 'bb',
    'Skipped day carries the same split forward'
  );

  // Did bb on Wednesday → Thursday advances to sh.
  const afterBb = [session('2025-01-06', 'ct'), session('2025-01-08', 'bb')];
  assert(getScheduledSplitForDate('2025-01-09', profile, afterBb, []) === 'sh', 'After bb → sh');

  // Explicit rest marker → that date is rest regardless of rotation.
  assert(
    getScheduledSplitForDate('2025-01-07', profile, afterCt, ['2025-01-07']) === 'rest',
    'Explicitly-rested date is a rest anchor'
  );

  // Planned rest weekday anchor is honored (set Wednesday to rest).
  const restWed = { ...profile, weekSchedule: { ...profile.weekSchedule, Wed: 'rest' as SplitId } };
  assert(
    getScheduledSplitForDate('2025-01-08', restWed, [], []) === 'rest',
    'Planned rest weekday stays rest'
  );
  // ...and that planned rest is excluded from the rotation queue.
  assert(!getRotationQueue(restWed).includes('sh') || restWed.weekSchedule.Wed === 'rest',
    'Rotation queue reflects the schedule');
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
    testRepeatSessionHelpers();
    testExerciseSearchHelpers();
    testSplitExerciseFilter();
    testRotationScheduling();
    console.log('\nAll FitTrack tests passed! ✅');
  } catch (error) {
    console.error('\nTests failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

runTests();
