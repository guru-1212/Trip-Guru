import dayjs from 'dayjs';
import {
  DEFAULT_TARGET_SCHEME,
  MIN_TESTS_FOR_PROJECTION,
  attemptsBefore,
  buildPrescription,
  computeAutoregulation,
  createAttempt,
  createTarget,
  formatAttemptSets,
  formatTargetValue,
  getAllTimeBest,
  getCurrentBest,
  getNextTargetDate,
  getSessionKindForDate,
  getTargetProgressPercent,
  getTargetRepHistory,
  hasReachedGoal,
  isTargetDay,
  projectAchievement,
  recomputeBackoffSets,
  summarizeAttempt,
} from './targets';
import type { Target, TargetAttempt, TargetSessionKind } from './targets';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

// Dates: 2025-01-06 Mon, 07 Tue, 09 Thu | 13 Mon, 16 Thu | 20 Mon, 23 Thu | 27 Mon (week 4), 30 Thu
function mkTarget(overrides: Partial<Target> = {}): Target {
  return {
    id: 't1',
    name: '100 non-stop push-ups',
    exerciseId: 'push-ups',
    variation: 'Standard',
    unit: 'reps',
    goalValue: 100,
    baseline: 40,
    baselineDate: '2025-01-02',
    startDate: '2025-01-06',
    targetDate: null,
    trainingDays: ['Mon', 'Thu'],
    scheme: { ...DEFAULT_TARGET_SCHEME },
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

let attemptSeq = 0;
function mkAttempt(
  date: string,
  kind: TargetSessionKind,
  actual: number[],
  prescribed?: number[]
): TargetAttempt {
  attemptSeq += 1;
  return {
    id: `a${attemptSeq}`,
    targetId: 't1',
    date,
    kind,
    prescribed: prescribed ?? actual,
    actual,
    topSet: actual.length ? Math.max(...actual) : 0,
    totalVolume: actual.reduce((s, v) => s + v, 0),
    isPR: false,
    createdAt: attemptSeq,
    updatedAt: attemptSeq,
  };
}

const goals = (sets: { goal: number }[]) => sets.map((s) => s.goal);

function testCurrentBest() {
  console.log('Testing Target current best...');

  const target = mkTarget();
  assert(getCurrentBest(target, []) === 40, 'No attempts → falls back to baseline');
  assert(getCurrentBest(mkTarget({ baseline: null }), []) === 0, 'No baseline → 0');

  // A fluke 50 four tests ago must not inflate today's prescription.
  const attempts = [
    mkAttempt('2025-01-06', 'test', [50, 28, 20, 20]),
    mkAttempt('2025-01-09', 'test', [42, 28, 20, 20]),
    mkAttempt('2025-01-13', 'test', [43, 28, 20, 20]),
    mkAttempt('2025-01-16', 'test', [44, 28, 20, 20]),
  ];
  assert(getCurrentBest(target, attempts) === 44, 'currentBest uses the last 3 tests only');
  assert(getAllTimeBest(target, attempts) === 50, 'allTimeBest keeps the lifetime max');

  // Volume days never move the working number.
  const withVolume = [
    mkAttempt('2025-01-06', 'test', [42, 28, 20, 20]),
    mkAttempt('2025-01-09', 'volume', [24, 24, 22, 20, 20]),
  ];
  assert(getCurrentBest(target, withVolume) === 42, 'Volume day does not change currentBest');

  assert(
    attemptsBefore('t1', attempts, '2025-01-13').length === 2,
    'attemptsBefore is strictly before the given date'
  );
}

function testSessionScheduling() {
  console.log('Testing Target session scheduling...');

  const target = mkTarget();

  assert(getSessionKindForDate(target, [], '2025-01-06') === 'test', 'First Mon of week → test');
  assert(getSessionKindForDate(target, [], '2025-01-09') === 'volume', 'Thu → volume, not a 2nd test');
  assert(getSessionKindForDate(target, [], '2025-01-07') === null, 'Tue is not a training day');
  assert(getSessionKindForDate(target, [], '2025-01-02') === null, 'Before startDate → null');
  assert(
    getSessionKindForDate(target, [], '2025-01-06', ['2025-01-06']) === null,
    'Explicit rest day overrides a training day'
  );

  // deloadEveryNWeeks = 4 → week index 3 is the planned easy week.
  assert(getSessionKindForDate(target, [], '2025-01-13') === 'test', 'Week 2 Mon → test');
  assert(getSessionKindForDate(target, [], '2025-01-20') === 'test', 'Week 3 Mon → test');
  assert(getSessionKindForDate(target, [], '2025-01-27') === 'deload', 'Week 4 Mon → planned deload');
  assert(getSessionKindForDate(target, [], '2025-01-30') === 'deload', 'Week 4 Thu → planned deload');

  const maxEffort = mkTarget({ scheme: { ...DEFAULT_TARGET_SCHEME, testEveryDay: true } });
  assert(
    getSessionKindForDate(maxEffort, [], '2025-01-09') === 'test',
    'testEveryDay makes every training day a test'
  );

  const paused = mkTarget({ status: 'paused' });
  assert(isTargetDay(paused, '2025-01-06') === false, 'Paused target has no training days');

  assert(getNextTargetDate(target, '2025-01-07') === '2025-01-09', 'Next target day after Tue is Thu');
  assert(getNextTargetDate(target, '2025-01-06') === '2025-01-06', 'asOf on a training day returns it');
  assert(
    getNextTargetDate(target, '2025-01-09', ['2025-01-09']) === '2025-01-13',
    'Rested Thu skips to the following Mon'
  );
}

function testPrescription() {
  console.log('Testing Target prescription...');

  const target = mkTarget();

  const first = buildPrescription(target, [], '2025-01-06');
  assert(first !== null, 'Training day with a baseline yields a prescription');
  assert(
    JSON.stringify(goals(first!.sets)) === JSON.stringify([42, 28, 20, 20]),
    'Baseline 40, step 2 → AMRAP 42 then 28 / 20 / 20'
  );
  assert(first!.sets[0].isAmrap === true, 'Set 1 of a test day is the AMRAP');
  assert(first!.sets[1].isAmrap === false, 'Back-off sets are not AMRAP');
  assert(first!.restSeconds === 90, 'Rest comes from the scheme');
  assert(first!.ghost === 40, 'Ghost falls back to the baseline before any test');
  assert(first!.totalGoal === 110, 'totalGoal sums the prescribed sets');

  assert(buildPrescription(target, [], '2025-01-07') === null, 'Non-training day → no prescription');
  assert(
    buildPrescription(mkTarget({ baseline: null }), [], '2025-01-06') === null,
    'No baseline → no prescription (the UI shows the baseline test)'
  );

  // After a clean 42, the next test asks for 44 with back-offs off 42.
  const afterHit = [mkAttempt('2025-01-06', 'test', [42, 28, 20, 20], [42, 28, 20, 20])];
  const second = buildPrescription(target, afterHit, '2025-01-13')!;
  assert(
    JSON.stringify(goals(second.sets)) === JSON.stringify([44, 29, 21, 21]),
    'currentBest 42 + step 2 → 44, back-offs scale off 42'
  );
  assert(second.ghost === 42, 'Ghost is the last test top set');
  assert(second.isHolding === false, 'Not holding after a hit');

  // Volume day: no AMRAP, all submax.
  const volume = buildPrescription(target, afterHit, '2025-01-16')!;
  assert(volume.kind === 'volume', 'Thu is a volume day');
  assert(
    volume.sets.every((s) => !s.isAmrap),
    'Volume day has no max-effort set'
  );
  assert(
    JSON.stringify(goals(volume.sets)) === JSON.stringify([25, 25, 23, 21, 21]),
    'Volume sets scale off currentBest 42'
  );

  // Live back-off recompute: hit 45 instead of 44 and the rest resize upward.
  const live = recomputeBackoffSets(target, second, 45);
  assert(
    JSON.stringify(goals(live.sets)) === JSON.stringify([44, 32, 23, 23]),
    'Back-offs recompute off the actual top set once set 1 is logged'
  );
  assert(live.sets[0].goal === 44, 'Recompute leaves the AMRAP goal alone');
  assert(
    recomputeBackoffSets(target, volume, 30) === volume,
    'Recompute is a no-op on a volume day'
  );
}

function testAutoregulation() {
  console.log('Testing Target autoregulation...');

  const target = mkTarget();

  const hit = computeAutoregulation(target, [
    mkAttempt('2025-01-06', 'test', [42, 28, 20, 20], [42, 28, 20, 20]),
  ]);
  assert(hit.step === 2, 'A hit keeps the full step');
  assert(hit.consecutiveMisses === 0 && hit.isHolding === false, 'A hit clears the miss streak');
  assert(hit.lifetimeVolume === 110, 'lifetimeVolume accumulates every attempt');

  const tie = computeAutoregulation(target, [
    mkAttempt('2025-01-06', 'test', [40, 28, 20, 20], [42, 28, 20, 20]),
  ]);
  assert(tie.step === 1, 'Tying the previous best drops the step to 1');

  const oneMiss = computeAutoregulation(target, [
    mkAttempt('2025-01-06', 'test', [42, 28, 20, 20], [42, 28, 20, 20]),
    mkAttempt('2025-01-13', 'test', [41, 28, 20, 20], [44, 29, 21, 21]),
  ]);
  assert(oneMiss.consecutiveMisses === 1, 'One miss counted');
  assert(oneMiss.isHolding === true, 'One miss → hold the week');
  assert(oneMiss.forceDeload === false, 'One miss does not force a deload');

  const missAttempts = [
    mkAttempt('2025-01-06', 'test', [42, 28, 20, 20], [42, 28, 20, 20]),
    mkAttempt('2025-01-13', 'test', [41, 28, 20, 20], [44, 29, 21, 21]),
    mkAttempt('2025-01-20', 'test', [40, 28, 20, 20], [44, 29, 21, 21]),
  ];
  const twoMisses = computeAutoregulation(target, missAttempts);
  assert(twoMisses.consecutiveMisses === 2, 'Two misses counted');
  assert(twoMisses.forceDeload === true, 'Two misses force a deload');
  assert(
    getSessionKindForDate(target, missAttempts, '2025-01-23') === 'deload',
    'A forced deload overrides the scheduled volume day'
  );

  const afterDeload = computeAutoregulation(target, [
    ...missAttempts,
    mkAttempt('2025-01-23', 'deload', [21, 21, 21, 21]),
  ]);
  assert(afterDeload.consecutiveMisses === 0, 'A deload consumes the miss streak');
  assert(afterDeload.forceDeload === false, 'No second deload in a row');

  // Holding repeats the previous ask verbatim rather than lowering it.
  const holdPrescription = buildPrescription(
    target,
    [
      mkAttempt('2025-01-06', 'test', [42, 28, 20, 20], [42, 28, 20, 20]),
      mkAttempt('2025-01-13', 'test', [41, 28, 20, 20], [44, 29, 21, 21]),
    ],
    '2025-01-20'
  )!;
  assert(holdPrescription.isHolding === true, 'Prescription reports the hold');
  assert(holdPrescription.sets[0].goal === 44, 'Holding repeats the previous AMRAP goal');
  assert(
    holdPrescription.coachNote.includes('adaptation'),
    'Hold copy is encouraging, not a failure state'
  );

  const plateau = computeAutoregulation(target, [
    mkAttempt('2025-01-06', 'test', [44, 28, 20, 20]),
    mkAttempt('2025-01-13', 'test', [44, 28, 20, 20]),
    mkAttempt('2025-01-20', 'test', [43, 28, 20, 20]),
  ]);
  assert(plateau.plateaued === true, 'Three tests without a jump flags a plateau');

  const climbing = computeAutoregulation(target, [
    mkAttempt('2025-01-06', 'test', [42, 28, 20, 20]),
    mkAttempt('2025-01-13', 'test', [43, 28, 20, 20]),
    mkAttempt('2025-01-20', 'test', [44, 28, 20, 20]),
  ]);
  assert(climbing.plateaued === false, 'A climbing series is not a plateau');
}

function testProjection() {
  console.log('Testing Target projection...');

  const target = mkTarget();

  const none = projectAchievement(target, [], '2025-01-06');
  assert(none.status === 'insufficientData', 'No tests → insufficientData');
  assert(none.projectedDate === null, 'No date is invented without data');
  assert(
    none.testsUntilProjectable === MIN_TESTS_FOR_PROJECTION,
    'Reports how many tests are still needed'
  );

  const twoTests = projectAchievement(
    target,
    [mkAttempt('2025-01-06', 'test', [42]), mkAttempt('2025-01-13', 'test', [44])],
    '2025-01-13'
  );
  assert(twoTests.status === 'insufficientData', 'Two tests is still not enough');
  assert(twoTests.testsUntilProjectable === 1, 'One more test to go');

  const flat = projectAchievement(
    target,
    [
      mkAttempt('2025-01-06', 'test', [42]),
      mkAttempt('2025-01-13', 'test', [42]),
      mkAttempt('2025-01-20', 'test', [42]),
    ],
    '2025-01-20'
  );
  assert(flat.status === 'stalled', 'A flat series is stalled, not slow');
  assert(flat.projectedDate === null, 'Stalled shows no date');

  const climbing = [
    mkAttempt('2025-01-06', 'test', [42]),
    mkAttempt('2025-01-13', 'test', [44]),
    mkAttempt('2025-01-20', 'test', [46]),
  ];
  const onPace = projectAchievement(target, climbing, '2025-01-20');
  assert(onPace.recentRatePerWeek === 2, 'Fits +2 reps/week from the recent tests');
  assert(onPace.projectedDate !== null, 'Three climbing tests produce a date');
  assert(
    dayjs(onPace.projectedDate!).isAfter(dayjs('2025-01-20')),
    'Projected date is in the future'
  );
  // 54 reps to go at 2/week damped by (1 - 0.46*0.35) = 0.839 → ~1.68/week → 33 weeks.
  assert(onPace.weeksRemaining === 33, 'Deceleration factor is applied to the raw slope');
  assert(onPace.requiredRatePerWeek === null, 'No deadline → no required rate');

  const tightDeadline = projectAchievement(
    mkTarget({ targetDate: '2025-02-20' }),
    climbing,
    '2025-01-20'
  );
  assert(tightDeadline.status === 'behind', 'A deadline the rate cannot meet reads as behind');
  assert(
    (tightDeadline.requiredRatePerWeek ?? 0) > tightDeadline.recentRatePerWeek,
    'Required rate outruns the observed rate'
  );

  const looseDeadline = projectAchievement(
    mkTarget({ targetDate: '2026-06-01' }),
    climbing,
    '2025-01-20'
  );
  assert(looseDeadline.status === 'ahead', 'A generous deadline reads as ahead');

  const done = projectAchievement(
    mkTarget({ goalValue: 40 }),
    [],
    '2025-01-06'
  );
  assert(done.status === 'achieved', 'Baseline already at goal → achieved');
}

function testAttemptsAndDisplay() {
  console.log('Testing Target attempts and display...');

  const target = mkTarget();

  const pr = createAttempt({
    id: 'x1',
    targetId: 't1',
    date: '2025-01-06',
    kind: 'test',
    prescribed: [42, 28, 20, 20],
    actual: [43, 28, 20, 18],
    allTimeBest: 40,
  });
  assert(pr.topSet === 43, 'topSet is the best single set');
  assert(pr.totalVolume === 109, 'totalVolume sums the logged sets');
  assert(pr.isPR === true, 'Beating the lifetime best is a PR');

  const notPr = createAttempt({
    id: 'x2',
    targetId: 't1',
    date: '2025-01-13',
    kind: 'test',
    prescribed: [45, 30, 22, 22],
    actual: [41, 30, 22, 22],
    allTimeBest: 43,
  });
  assert(notPr.isPR === false, 'Falling short of the lifetime best is not a PR');

  const volumePr = createAttempt({
    id: 'x3',
    targetId: 't1',
    date: '2025-01-16',
    kind: 'volume',
    prescribed: [25, 25, 23, 21, 21],
    actual: [50, 25, 23, 21, 21],
    allTimeBest: 43,
  });
  assert(volumePr.isPR === false, 'Only test days can set a PR');

  // Unlogged sets are stored as 0 so `actual` stays index-aligned with
  // `prescribed` — a skipped middle set must not shift the ones after it.
  const withGap = createAttempt({
    id: 'x4',
    targetId: 't1',
    date: '2025-01-20',
    kind: 'test',
    prescribed: [44, 29, 21, 21],
    actual: [45, 0, 21, 0],
    allTimeBest: 43,
  });
  assert(withGap.actual[2] === 21, 'A skipped set does not shift later sets');
  assert(withGap.topSet === 45, 'Zero placeholders do not affect topSet');
  assert(withGap.totalVolume === 66, 'Zero placeholders do not affect totalVolume');
  assert(
    formatAttemptSets(withGap, 'reps') === '45 / 21',
    'Unlogged sets are hidden from the display'
  );

  const created = createTarget({
    id: 'n1',
    name: '3 minute plank',
    exerciseId: 'plank',
    unit: 'seconds',
    goalValue: 180,
    startDate: '2025-01-06',
    targetDate: null,
    trainingDays: ['Mon', 'Thu'],
  });
  assert(created.baseline === null, 'A new target starts without a baseline');
  assert(created.status === 'active', 'A new target is active');
  assert(created.scheme.testEveryDay === false, 'Defaults to test + volume, not double max effort');

  assert(formatTargetValue(43, 'reps') === '43', 'Reps format plainly');
  assert(formatTargetValue(45, 'seconds') === '45s', 'Sub-minute holds read as seconds');
  assert(formatTargetValue(90, 'seconds') === '1:30', 'Holds over a minute read as m:ss');
  assert(formatTargetValue(180, 'seconds') === '3:00', 'Whole minutes pad the seconds');

  assert(getTargetProgressPercent(target, []) === 40, 'Baseline 40 of 100 → 40%');
  assert(
    getTargetProgressPercent(mkTarget({ baseline: 120 }), []) === 100,
    'Progress is capped at 100%'
  );

  const history = getTargetRepHistory(target, [
    mkAttempt('2025-01-06', 'test', [42, 28, 20, 20]),
    mkAttempt('2025-01-09', 'volume', [25, 25, 23, 21, 21]),
  ]);
  assert(history.length === 3, 'History prepends the baseline point');
  assert(history[0].topSet === 40, 'Baseline is the first chart point');
  assert(history[1].label === 'Jan 6', 'History labels match the recharts convention');

  assert(
    summarizeAttempt(target, mkAttempt('2025-01-06', 'test', [43, 28, 20, 18]), 7, 42) ===
      'Session 7 · 43 (+1) · 109 total reps',
    'Session summary reads as a one-line result'
  );

  assert(
    hasReachedGoal(mkTarget({ goalValue: 45 }), [mkAttempt('2025-01-06', 'test', [46])]) === true,
    'Reaching the goal is detected'
  );
  assert(hasReachedGoal(target, [mkAttempt('2025-01-06', 'test', [46])]) === false, 'Still climbing');
}

function testSecondsUnit() {
  console.log('Testing Target holds (seconds)...');

  const plank = mkTarget({
    id: 't1',
    name: '3 minute plank',
    exerciseId: 'plank',
    unit: 'seconds',
    goalValue: 180,
    baseline: 60,
    scheme: { ...DEFAULT_TARGET_SCHEME, step: 5 },
  });

  const rx = buildPrescription(plank, [], '2025-01-06')!;
  assert(
    JSON.stringify(goals(rx.sets)) === JSON.stringify([65, 42, 30, 30]),
    'Holds follow the identical path with step in seconds'
  );
  assert(rx.coachNote.includes('65'), 'Coach note quotes the hold to chase');

  const afterHit = [mkAttempt('2025-01-06', 'test', [65, 42, 30, 30], [65, 42, 30, 30])];
  const next = buildPrescription(plank, afterHit, '2025-01-13')!;
  assert(next.sets[0].goal === 70, 'A 65s hold progresses to 70s');

  const deload = buildPrescription(plank, [], '2025-01-27')!;
  assert(deload.kind === 'deload', 'Holds get planned easy weeks too');
  assert(
    deload.coachNote.includes('seconds'),
    'Deload copy uses seconds rather than reps for a hold'
  );
}

function runTests() {
  try {
    testCurrentBest();
    testSessionScheduling();
    testPrescription();
    testAutoregulation();
    testProjection();
    testAttemptsAndDisplay();
    testSecondsUnit();
    console.log('\nAll Target tests passed! ✅');
  } catch (error) {
    console.error('\nTests failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

runTests();
