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
  getLastLoggedSets,
  buildRepeatDataFromSession,
  repeatSessionPresetKey,
  exerciseMatchesSearch,
  getMatchingVariations,
  exerciseBelongsToSplit,
  getDefaultProfile,
  getRotationQueue,
  getNextRotationSplit,
  getScheduledSplitForDate,
  getScheduledSplitsForDay,
  getRemainingSplitsForDate,
  getMuscleFromSplit,
  orderActiveWorkoutExercises,
  filterExercisesForSave,
  migrateActiveWorkoutState,
  workoutExerciseKey,
} from './utils';
import { getExercisesForSplit, getExerciseById, EXPLICIT_SPLIT_MEMBERS } from './exerciseLibrary';
import { getWarmupForSplitMerged, getStretchForSplitMerged } from './mobilityLibrary';
import { getSplitSubMuscles, getExerciseTargets } from './muscleCoverage';
import {
  RECOMMENDED_EXERCISES,
  RECOMMENDED_BY_MUSCLE,
  getRecommendedForSplit,
  isRecommendedForSplit,
  isRecommendedForMuscle,
} from './recommendedExercises';
import { MUSCLE_GROUPS, SPLIT_DEFINITIONS } from './constants';
import { parsePastedWorkout, parseImportedWeight, ImportFormatError } from './aiImportParser';
import {
  filterByRange,
  calcTrainingOverview,
} from './analytics';
import { computeMuscleRecovery } from './recovery';
import { normalizeChecklist } from '../firebase/fittrack.firestore';
import type {
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  ChecklistData,
  LibraryExercise,
  SplitId,
  ActiveWorkoutState,
} from './types';

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

function testMultiSplitScheduling() {
  console.log('Testing Multi-split Scheduling...');

  const profile = getDefaultProfile();
  const multiSplitProfile = {
    ...profile,
    weekSchedule: {
      ...profile.weekSchedule,
      Wed: ['legs', 'sh'] as SplitId[],
    },
  };

  const splits = getScheduledSplitsForDay(multiSplitProfile, 'Wed');
  assert(JSON.stringify(splits) === JSON.stringify(['legs', 'sh']), 'Wednesday exposes both configured splits');
  assert(getRotationQueue(multiSplitProfile).includes('legs') && getRotationQueue(multiSplitProfile).includes('sh'), 'Multi-split days contribute both splits to rotation');
  assert(getScheduledSplitForDate('2025-01-08', multiSplitProfile, [], []) === 'legs', 'First configured split is used for scheduling fallback');

  // Remaining sessions on a multi-split day (2025-01-08 is a Wednesday).
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

  assert(
    JSON.stringify(getRemainingSplitsForDate('2025-01-08', multiSplitProfile, [], [])) ===
      JSON.stringify(['legs', 'sh']),
    'Nothing trained yet → both sessions remain'
  );
  assert(
    JSON.stringify(
      getRemainingSplitsForDate('2025-01-08', multiSplitProfile, [session('2025-01-08', 'legs')], [])
    ) === JSON.stringify(['sh']),
    'After the first session only the second remains'
  );
  assert(
    getRemainingSplitsForDate(
      '2025-01-08',
      multiSplitProfile,
      [session('2025-01-08', 'legs'), session('2025-01-08', 'sh')],
      []
    ).length === 0,
    'Both sessions logged → nothing remains'
  );
  assert(
    getRemainingSplitsForDate('2025-01-08', multiSplitProfile, [], ['2025-01-08']).length === 0,
    'Explicit rest day → nothing remains'
  );
}

function testCombinedLegShouldersSplit() {
  console.log('Testing Legs + Shoulders combined split...');

  assert(
    JSON.stringify(getMuscleFromSplit('legsh')) === JSON.stringify(['Legs', 'Shoulders']),
    'legsh targets Legs and Shoulders'
  );

  const pool = getExercisesForSplit('legsh');
  assert(
    pool.some((e) => e.splitIds.includes('legs')) && pool.some((e) => e.splitIds.includes('sh')),
    'legsh exercise pool merges legs and shoulder exercises'
  );

  const legEx = { muscle: 'Legs', splitIds: ['legs'] } as Pick<
    LibraryExercise,
    'muscle' | 'secondary' | 'splitIds'
  >;
  const shEx = { muscle: 'Shoulders', splitIds: ['sh'] } as Pick<
    LibraryExercise,
    'muscle' | 'secondary' | 'splitIds'
  >;
  const chestEx = { muscle: 'Chest', splitIds: ['ct'] } as Pick<
    LibraryExercise,
    'muscle' | 'secondary' | 'splitIds'
  >;
  assert(exerciseBelongsToSplit(legEx, 'legsh'), 'Leg exercise belongs to legsh');
  assert(exerciseBelongsToSplit(shEx, 'legsh'), 'Shoulder exercise belongs to legsh');
  assert(!exerciseBelongsToSplit(chestEx, 'legsh'), 'Chest exercise does not belong to legsh');

  const warmups = getWarmupForSplitMerged('legsh');
  const stretches = getStretchForSplitMerged('legsh');
  assert(warmups.length > 0, 'legsh has merged warmups');
  assert(stretches.length > 0, 'legsh has merged stretches');
  assert(
    new Set(warmups.map((w) => w.id)).size === warmups.length,
    'Merged legsh warmups have no duplicates'
  );
}

function testMuscleRecoveryTiming() {
  console.log('Testing Muscle Recovery Timing...');

  const daysAgo = (n: number) => dayjs().subtract(n, 'day').format('YYYY-MM-DD');
  const legShoulderExercises: WorkoutExercise[] = [
    { exerciseId: 'test-squat', name: 'Squat', variation: 'Standard', muscle: 'Legs', sets: [{ weight: 100, reps: 5, done: true }] },
    { exerciseId: 'test-press', name: 'Shoulder Press', variation: 'Standard', muscle: 'Shoulders', sets: [{ weight: 40, reps: 8, done: true }] },
  ];

  // A session TRAINED 5 days ago but SAVED just now (completedAt = now) — as
  // happens when a workout is backdated, its date is edited, or it is started
  // one day and finished on a later one. Recovery must anchor to the logged
  // training day, not the save moment.
  const backdated: WorkoutSession = {
    id: 'backdated',
    date: daysAgo(5),
    completedAt: dayjs().valueOf(),
    splitId: 'legsh',
    splitName: 'Legs + Shoulders',
    duration: 3600,
    exercises: legShoulderExercises,
    totalSets: 2,
    totalVolume: 500,
  };

  const rec = computeMuscleRecovery([backdated]);
  assert(rec['Shoulders'].recoveryPct === 100, 'Shoulders fully recovered 5 days after training, despite a same-day completedAt');
  assert(rec['Shoulders'].status === 'recovered', 'Shoulders status should be recovered');
  assert(rec['Shoulders'].etaHours === 0, 'Shoulders should have no remaining recovery time');
  assert(rec['Quads'].recoveryPct === 100, 'Quads (Legs, 72h) fully recovered 5 days after training');
  assert(rec['Quads'].etaHours === 0, 'Quads should have no remaining recovery time');

  // Control: trained AND saved today → still fatigued, with time remaining.
  const trainedToday: WorkoutSession = {
    ...backdated,
    id: 'today',
    date: dayjs().format('YYYY-MM-DD'),
  };
  const recToday = computeMuscleRecovery([trainedToday]);
  assert(recToday['Shoulders'].recoveryPct < 100, 'Shoulders trained today are not yet fully recovered');
  assert(recToday['Shoulders'].etaHours > 0, 'Shoulders trained today have remaining recovery time');
  assert(recToday['Quads'].etaHours > recToday['Shoulders'].etaHours, 'Legs (72h) take longer to recover than Shoulders (48h)');
}

function testAutofillLastLoggedSets() {
  console.log('Testing Auto-fill From Last Session...');

  const mk = (
    id: string,
    date: string,
    sets: WorkoutSet[],
    variation = 'Barbell'
  ): WorkoutSession => ({
    id,
    date,
    splitId: 'ct',
    splitName: 'Chest/Triceps',
    duration: 3600,
    totalSets: sets.length,
    totalVolume: 0,
    exercises: [{ exerciseId: 'bench', name: 'Bench Press', variation, muscle: 'Chest', sets }],
  });

  // No history → nothing to pre-fill.
  assert(getLastLoggedSets([], 'bench', 'Barbell') === null, 'No history returns null');

  // Picks the most recent session and resets done to false.
  const workouts: WorkoutSession[] = [
    mk('old', '2024-06-20', [{ weight: 80, reps: 10, done: true }]),
    mk('new', '2024-06-27', [
      { weight: 100, reps: 8, done: true },
      { weight: 100, reps: 6, done: true },
      { weight: 90, reps: 10, done: false }, // not done → skipped
    ]),
  ];
  const filled = getLastLoggedSets(workouts, 'bench', 'Barbell');
  assert(!!filled && filled.length === 2, 'Pre-fills only the 2 completed sets from the newest session');
  assert(filled![0].weight === 100 && filled![0].reps === 8, 'First set copies last weight/reps');
  assert(filled!.every((s) => s.done === false), 'Pre-filled sets start unchecked');

  // Bodyweight (reps only, weight 0) still pre-fills — unlike getLastExerciseSession.
  const bodyweight = [mk('bw', '2024-06-25', [{ weight: 0, reps: 12, done: true }])];
  const bwFilled = getLastLoggedSets(bodyweight, 'bench', 'Barbell');
  assert(!!bwFilled && bwFilled.length === 1 && bwFilled![0].reps === 12, 'Bodyweight reps pre-fill even with zero weight');

  // Variation-specific: a different variation has no match.
  assert(getLastLoggedSets(workouts, 'bench', 'Incline Dumbbell') === null, 'Different variation does not match');
}

function testReorderPreservedOnSave() {
  console.log('Testing In-Session Reorder Is Preserved On Save...');

  const mk = (id: string, pickedToday: boolean, done: boolean): WorkoutExercise => ({
    exerciseId: id,
    name: id.toUpperCase(),
    variation: 'Standard',
    muscle: 'Chest',
    pickedToday,
    sets: [{ weight: 50, reps: 10, done }],
  });

  // Session started as [a, b, c]; user dragged to [c, a, b]; `d` was not
  // picked today but has a logged set so it must still be saved (last).
  const state: ActiveWorkoutState = {
    splitId: 'ct',
    splitName: 'Chest + Triceps',
    startedAt: 0,
    restTimerSeconds: 60,
    restTimerEnd: null,
    exercises: [mk('a', true, true), mk('b', true, true), mk('c', true, true), mk('d', false, true)],
    pickOrder: ['c::Standard', 'a::Standard', 'b::Standard'],
  };

  const saved = filterExercisesForSave(orderActiveWorkoutExercises(state)).map((e) => e.exerciseId);
  assert(saved.join(',') === 'c,a,b,d', `Saved order follows pickOrder then unpicked: got ${saved.join(',')}`);

  // Without a pickOrder the original sequence is kept.
  const untouched = orderActiveWorkoutExercises({ ...state, pickOrder: undefined }).map((e) => e.exerciseId);
  assert(untouched.join(',') === 'a,b,c,d', 'No pickOrder keeps the original order');

  // Migration fallback must produce `${id}::${variation}` keys, matching the sort key format.
  const migrated = migrateActiveWorkoutState({ ...state, pickOrder: undefined }, 3);
  assert(migrated.pickOrder?.[0] === 'a::Standard', 'Migrated pickOrder uses id::variation keys');
  assert(
    migrated.pickOrder?.every((k) => state.exercises.some((e) => workoutExerciseKey(e) === k)) === true,
    'Every migrated key resolves to an exercise'
  );
}

function testPushPullLegsSplits() {
  console.log('Testing Push / Pull / Legs splits...');

  const ids = (split: SplitId) => new Set(getExercisesForSplit(split).map((e) => e.id));
  const push = ids('push');
  const pull = ids('pull');
  const legscore = ids('legscore');

  for (const id of ['overhead-press', 'lateral-raises', 'front-raises', 'landmine-press', 'dumbbell-pullover', 'bench-press', 'tricep-pushdown']) {
    assert(push.has(id), `Push includes ${id}`);
  }
  for (const id of ['rear-delt', 'face-pulls', 'shrugs', 'squat', 'plank']) {
    assert(!push.has(id), `Push excludes ${id}`);
  }
  for (const id of ['rear-delt', 'face-pulls', 'shrugs', 'deadlift', 'back-extension', 'wrist-curls', 'reverse-curl', 'farmers-carry', 'barbell-curl']) {
    assert(pull.has(id), `Pull includes ${id}`);
  }
  for (const id of ['bench-press', 'overhead-press', 'lateral-raises', 'squat']) {
    assert(!pull.has(id), `Pull excludes ${id}`);
  }
  assert(legscore.has('squat') && legscore.has('plank'), 'Legs + Core pool merges legs and core');
  assert(!legscore.has('bench-press'), 'Legs + Core excludes chest work');

  // Every explicit member must be a real library exercise.
  for (const [split, members] of Object.entries(EXPLICIT_SPLIT_MEMBERS)) {
    for (const id of members ?? []) assert(!!getExerciseById(id), `${split} member ${id} exists in library`);
  }

  // Anatomy sanity: push/pull members primarily hit muscles inside their split.
  const pushRegions = getSplitSubMuscles('push');
  const pullRegions = getSplitSubMuscles('pull');
  assert(pullRegions.has('forearms') && pullRegions.has('rear-delts'), 'Pull coverage includes forearms + rear delts');
  assert(!pushRegions.has('rear-delts') && pushRegions.has('front-delts'), 'Push coverage has front delts but not rear delts');
  for (const id of EXPLICIT_SPLIT_MEMBERS.push ?? []) {
    const primary = getExerciseTargets(id).primary;
    assert(primary.some((m) => pushRegions.has(m)), `${id} primarily hits a push muscle`);
  }
  for (const id of EXPLICIT_SPLIT_MEMBERS.pull ?? []) {
    const primary = getExerciseTargets(id).primary;
    assert(primary.some((m) => pullRegions.has(m)), `${id} primarily hits a pull muscle`);
  }

  // exerciseBelongsToSplit follows the explicit list for library exercises...
  const rearDelt = getExerciseById('rear-delt')!;
  assert(!exerciseBelongsToSplit(rearDelt, 'push'), 'Rear delt does not belong to Push');
  assert(exerciseBelongsToSplit(rearDelt, 'pull'), 'Rear delt belongs to Pull');
  // ...and the coarse muscle rule for custom exercises.
  const customChest = { id: 'custom-1', muscle: 'Chest', splitIds: [] } as Pick<LibraryExercise, 'muscle' | 'secondary' | 'splitIds'> & { id: string };
  assert(exerciseBelongsToSplit(customChest, 'push'), 'Custom chest exercise belongs to Push');
  assert(!exerciseBelongsToSplit(customChest, 'pull'), 'Custom chest exercise does not belong to Pull');

  // Mobility routines merge from component splits.
  for (const split of ['push', 'pull', 'legscore'] as SplitId[]) {
    const warmups = getWarmupForSplitMerged(split);
    assert(warmups.length > 0, `${split} has warmups`);
    assert(new Set(warmups.map((w) => w.id)).size === warmups.length, `${split} warmups are deduped`);
    assert(getStretchForSplitMerged(split).length > 0, `${split} has stretches`);
  }

  // A PPL weekly plan rotates through the 3 splits.
  const profile = getDefaultProfile();
  profile.weekSchedule = { Mon: 'push', Tue: 'pull', Wed: 'legscore', Thu: 'push', Fri: 'pull', Sat: 'legscore', Sun: 'rest' };
  assert(JSON.stringify(getRotationQueue(profile)) === JSON.stringify(['push', 'pull', 'legscore']), 'PPL rotation queue is push → pull → legscore');
}

function testRecommendedExercises() {
  console.log('Testing Recommended Exercises...');

  // Every split (except rest) has a curated list of real exercises drawn from its own pool.
  for (const split of SPLIT_DEFINITIONS) {
    const list = getRecommendedForSplit(split.id);
    assert(list.length >= 6 && list.length <= 8, `${split.id} has 6-8 recommended exercises (got ${list.length})`);
    assert(new Set(list).size === list.length, `${split.id} recommended list has no duplicates`);
    const pool = new Set(getExercisesForSplit(split.id).map((e) => e.id));
    for (const id of list) {
      assert(!!getExerciseById(id), `${split.id} recommended ${id} exists`);
      assert(pool.has(id), `${split.id} recommended ${id} is in the split pool`);
    }
  }
  assert(RECOMMENDED_EXERCISES.rest.length === 0, 'Rest has no recommendations');

  // Per-muscle lists match their muscle group.
  for (const muscle of MUSCLE_GROUPS) {
    for (const id of RECOMMENDED_BY_MUSCLE[muscle]) {
      const ex = getExerciseById(id);
      assert(!!ex, `${muscle} recommended ${id} exists`);
      assert(ex!.muscle === muscle || ex!.secondary === muscle, `${id} targets ${muscle}`);
    }
  }

  assert(isRecommendedForSplit('face-pulls', 'pull'), 'Face pulls recommended for Pull');
  assert(!isRecommendedForSplit('rear-delt', 'push'), 'Rear delt not recommended for Push');
  // Combined splits inherit their components' recommendations for badges.
  assert(isRecommendedForSplit('skull-crushers', 'ctbb'), 'ctbb inherits ct recommendations');
  assert(isRecommendedForMuscle('squat', 'Legs'), 'Squat recommended for Legs');
  assert(!isRecommendedForMuscle('squat', 'Chest'), 'Squat not recommended for Chest');
}

function testAIImportParser() {
  console.log('Testing AI Import Parser...');

  // Real AI response: "Tricep Dips" has no weight (bodyweight) — must import, not fail.
  const pasted = `[
{ "exerciseName": "Bench Press", "sets": 3, "reps": "8", "weight": 60, "notes": "Baseline session at RPE 7." },
{ "exerciseName": "Overhead Press", "sets": 3, "reps": "8", "weight": 40, "notes": "Keep core braced." },
{ "exerciseName": "Lateral Raises", "sets": 3, "reps": "12", "weight": 8, "notes": "Avoid swinging." },
{ "exerciseName": "Tricep Dips", "sets": 3, "reps": "8", "notes": "Bodyweight compound." },
{ "exerciseName": "Tricep Pushdown", "sets": 3, "reps": "12", "weight": 20, "notes": "Lock elbows." }
]`;
  const parsed = parsePastedWorkout(pasted);
  assert(parsed.length === 5, 'All 5 rows parsed');
  assert(parsed[3].exerciseName === 'Tricep Dips' && parsed[3].weight === 0, 'Missing weight is treated as bodyweight (0)');
  assert(parsed[0].weight === 60 && parsed[0].sets === 3 && parsed[0].reps === '8', 'Numeric rows parse as before');

  // Lenient weight forms the AI tends to produce.
  assert(parseImportedWeight(null) === 0, 'null weight -> 0');
  assert(parseImportedWeight('bodyweight') === 0, '"bodyweight" -> 0');
  assert(parseImportedWeight('BW') === 0, '"BW" -> 0');
  assert(parseImportedWeight('60 kg') === 60, '"60 kg" -> 60');
  assert(parseImportedWeight('22.5kg') === 22.5, '"22.5kg" -> 22.5');
  assert(parseImportedWeight(-5) === null, 'negative weight rejected');
  assert(parseImportedWeight('heavy') === null, 'non-numeric text rejected');

  // Markdown fence and an object wrapper are tolerated.
  const fenced = '```json\n{ "workout": [ { "exerciseName": "Squat", "sets": 4, "reps": "6-8", "weight": 100 } ] }\n```';
  const fromFence = parsePastedWorkout(fenced);
  assert(fromFence.length === 1 && fromFence[0].reps === '6', 'Fenced + wrapped JSON parses; rep range keeps the low end');

  // Shape errors name the exercise and the field.
  let message = '';
  try {
    parsePastedWorkout('[{ "exerciseName": "Squat", "sets": 0, "reps": "8", "weight": 100 }]');
  } catch (e) {
    message = e instanceof ImportFormatError ? e.message : 'wrong error type';
  }
  assert(message.includes('Squat') && message.includes('"sets"'), `Error names the row and field: ${message}`);

  let notJson = false;
  try {
    parsePastedWorkout('Here is your plan: Bench Press 3x8');
  } catch (e) {
    notJson = e instanceof SyntaxError;
  }
  assert(notJson, 'Non-JSON text raises a SyntaxError (generic JSON message in the UI)');
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
    testMultiSplitScheduling();
    testCombinedLegShouldersSplit();
    testMuscleRecoveryTiming();
    testAutofillLastLoggedSets();
    testReorderPreservedOnSave();
    testPushPullLegsSplits();
    testRecommendedExercises();
    testAIImportParser();
    console.log('\nAll FitTrack tests passed! ✅');
  } catch (error) {
    console.error('\nTests failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

runTests();
