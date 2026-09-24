import {
  DEFAULT_POSE_DETECTOR_OPTIONS,
  LM,
  angleAt,
  createPoseDetectorState,
  normalizedDistance,
  poseRepTempo,
  pushPoseFrame,
  repProgress,
  shoulderWidth,
  smoothAngle,
} from './poseRepCounter';
import type { PoseDetectorState, PoseLandmark, PoseRepSpec } from './poseRepCounter';
import { POSE_REP_SPECS, canCountWithPose, specForExercise } from './poseExerciseSpecs';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

const FPS = 30;
const FRAME_MS = 1000 / FPS;

const PUSH_UP = specForExercise('push-ups')!;
const LATERAL_RAISE = specForExercise('lateral-raises')!;

/* ---------------------------------------------------------------------------
 * Synthetic skeletons
 *
 * Landmarks are placed so that each tracked joint angle is exactly the value
 * asked for, which lets the tests drive the detector with a known angle track
 * instead of guessing at real pose output.
 * ------------------------------------------------------------------------ */

/**
 * A point at `length` from `vertex`, rotated `deg` away from the direction of
 * `reference`. The angle vertex-reference-to-result is therefore exactly `deg`.
 */
function pointAtAngle(
  vertex: PoseLandmark,
  reference: PoseLandmark,
  deg: number,
  length: number
): PoseLandmark {
  const ux = reference.x - vertex.x;
  const uy = reference.y - vertex.y;
  const m = Math.hypot(ux, uy);
  const nx = ux / m;
  const ny = uy / m;
  const r = (deg * Math.PI) / 180;
  return {
    x: vertex.x + length * (nx * Math.cos(r) - ny * Math.sin(r)),
    y: vertex.y + length * (nx * Math.sin(r) + ny * Math.cos(r)),
  };
}

interface FrameAngles {
  elbow?: number;
  shoulder?: number;
  hip?: number;
  knee?: number;
  visibility?: number;
}

/** A full 33-landmark frame whose tracked angles match `angles`. */
function frame(angles: FrameAngles): PoseLandmark[] {
  const vis = angles.visibility ?? 0.95;
  const elbowAngle = angles.elbow ?? 170;
  const shoulderAngle = angles.shoulder ?? 15;
  const hipAngle = angles.hip ?? 170;
  const kneeAngle = angles.knee ?? 170;

  const out: PoseLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: vis,
  }));

  const set = (i: number, p: PoseLandmark) => {
    out[i] = { ...p, visibility: vis };
  };

  // Shoulders are offset left/right so shoulder width is non-zero; the joint
  // chain below is built from the left side and mirrored in value only, which
  // is all the detector reads.
  const shoulder: PoseLandmark = { x: 0.45, y: 0.35 };
  const hip: PoseLandmark = { x: 0.45, y: 0.7 };
  set(LM.leftShoulder, shoulder);
  set(LM.rightShoulder, { x: 0.55, y: 0.35 });
  set(LM.leftHip, hip);
  set(LM.rightHip, { x: 0.55, y: 0.7 });

  const elbow = pointAtAngle(shoulder, hip, shoulderAngle, 0.25);
  const wrist = pointAtAngle(elbow, shoulder, elbowAngle, 0.25);
  const knee = pointAtAngle(hip, shoulder, hipAngle, 0.3);
  const ankle = pointAtAngle(knee, hip, kneeAngle, 0.3);

  set(LM.leftElbow, elbow);
  set(LM.rightElbow, elbow);
  set(LM.leftWrist, wrist);
  set(LM.rightWrist, wrist);
  set(LM.leftKnee, knee);
  set(LM.rightKnee, knee);
  set(LM.leftAnkle, ankle);
  set(LM.rightAnkle, ankle);

  return out;
}

interface Sample {
  angles: FrameAngles;
  now: number;
}

/** Feeds a track of frames and returns the final state. */
function run(
  samples: Sample[],
  spec: PoseRepSpec,
  opts = DEFAULT_POSE_DETECTOR_OPTIONS
): PoseDetectorState {
  let state = createPoseDetectorState();
  for (const s of samples) state = pushPoseFrame(state, frame(s.angles), s.now, spec, opts);
  return state;
}

/**
 * A track of reps on one joint: hold at the start, then ramp to the far end
 * and back, `reps` times. `key` names which angle moves; everything else
 * stays at its resting value.
 */
function repTrack(
  reps: number,
  key: keyof FrameAngles,
  opts: {
    start: number;
    end: number;
    repMs?: number;
    holdMs?: number;
    startMs?: number;
    visibility?: number;
  }
): { samples: Sample[]; endMs: number } {
  const repMs = opts.repMs ?? 2000;
  const holdMs = opts.holdMs ?? 500;
  let t = opts.startMs ?? 0;
  const out: Sample[] = [];

  const emit = (from: number, to: number, ms: number) => {
    const steps = Math.max(1, Math.round(ms / FRAME_MS));
    for (let i = 0; i < steps; i += 1) {
      out.push({
        angles: { [key]: from + ((to - from) * i) / steps, visibility: opts.visibility },
        now: t,
      });
      t += FRAME_MS;
    }
  };

  emit(opts.start, opts.start, holdMs); // settle so the detector seeds cleanly
  for (let r = 0; r < reps; r += 1) {
    emit(opts.start, opts.end, repMs / 2);
    emit(opts.end, opts.end, holdMs); // hold the far extreme
    emit(opts.end, opts.start, repMs / 2);
    emit(opts.start, opts.start, holdMs);
  }
  return { samples: out, endMs: t };
}

/* ---------------------------------------------------------------------------
 * Tests
 * ------------------------------------------------------------------------ */

function testAngleMath() {
  console.log('Testing joint angle maths...');

  const straight = angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 });
  assert(Math.abs(straight - 180) < 0.001, `straight limb should be 180, got ${straight}`);

  const right = angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 });
  assert(Math.abs(right - 90) < 0.001, `right angle should be 90, got ${right}`);

  const folded = angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 });
  assert(Math.abs(folded) < 0.001, `fully folded should be 0, got ${folded}`);

  // A degenerate limb must not produce NaN, or the filter is poisoned for the
  // rest of the set.
  const degenerate = angleAt({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 });
  assert(!Number.isNaN(degenerate), 'coincident landmarks must not yield NaN');

  // The angle must not change when the whole body is scaled or moved: that is
  // what makes it work at any distance from the camera.
  const near = angleAt({ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.5 });
  const far = angleAt({ x: 0.44, y: 0.44 }, { x: 0.5, y: 0.44 }, { x: 0.5, y: 0.5 });
  assert(Math.abs(near - far) < 0.001, 'angle must be invariant to scale');
}

function testNormalisation() {
  console.log('Testing shoulder-width normalisation...');

  const f = frame({});
  const width = shoulderWidth(f);
  assert(width !== null && Math.abs(width - 0.1) < 1e-9, `shoulder width should be 0.1, got ${width}`);

  const near = normalizedDistance(f, LM.leftShoulder, LM.leftHip);
  assert(near !== null, 'normalised distance should resolve');

  // Same pose at half the size must normalise to the same number.
  const shrunk = f.map((lm) => ({ ...lm, x: 0.5 + (lm.x - 0.5) / 2, y: 0.5 + (lm.y - 0.5) / 2 }));
  const far = normalizedDistance(shrunk, LM.leftShoulder, LM.leftHip);
  assert(
    far !== null && Math.abs(near! - far) < 1e-9,
    `normalised distance must survive scaling: ${near} vs ${far}`
  );

  const missing = normalizedDistance([], LM.leftShoulder, LM.leftHip);
  assert(missing === null, 'an empty frame should normalise to null');
}

function testSmoothing() {
  console.log('Testing low-pass filter...');

  assert(smoothAngle(null, 120, 0.4) === 120, 'first sample should pass through');

  // A step input must be approached gradually, never jumped to.
  const first = smoothAngle(100, 200, 0.4);
  assert(first > 100 && first < 200, `EMA should lag a step, got ${first}`);

  // ...and must converge given enough frames, or the detector would never trip.
  let v: number | null = 100;
  for (let i = 0; i < 40; i += 1) v = smoothAngle(v, 200, 0.4);
  assert(Math.abs(v! - 200) < 0.5, `EMA should converge, got ${v}`);
}

function testCountsCleanReps() {
  console.log('Testing rep counting (clean push-up track)...');

  const { samples } = repTrack(10, 'elbow', { start: 170, end: 80 });
  const state = run(samples, PUSH_UP);

  assert(state.count === 10, `expected 10 reps, got ${state.count}`);
  assert(state.quality === 'good', `expected good signal, got ${state.quality}`);
  assert(state.shallowReps === 0, `clean reps should not be flagged, got ${state.shallowReps}`);
  assert(!state.formBroken, 'clean reps should not break form');
  assert(state.calibratedRange !== null, 'range should have been calibrated');
  assert(state.phase === 'high', `should finish locked out, got ${state.phase}`);
}

function testCountsOnReturnToStart() {
  console.log('Testing that a rep only scores on the way back...');

  // Stop at the bottom of the fifth rep: four complete, the fifth unfinished.
  const { samples } = repTrack(4, 'elbow', { start: 170, end: 80 });
  let state = createPoseDetectorState();
  for (const s of samples) state = pushPoseFrame(state, frame(s.angles), s.now, PUSH_UP);

  const before = state.count;
  let t = samples[samples.length - 1].now;
  for (let i = 0; i < 40; i += 1) {
    t += FRAME_MS;
    state = pushPoseFrame(state, frame({ elbow: 80 }), t, PUSH_UP);
  }

  assert(before === 4, `expected 4 reps before the unfinished one, got ${before}`);
  assert(state.count === 4, `a rep held at the bottom must not count, got ${state.count}`);
  assert(state.phase === 'low', `should be sitting at the bottom, got ${state.phase}`);
}

function testTempo() {
  console.log('Testing rep tempo...');

  // 2s of movement plus two 500ms holds = 3s per rep.
  const { samples } = repTrack(6, 'elbow', { start: 170, end: 80, repMs: 2000, holdMs: 500 });
  const state = run(samples, PUSH_UP);
  const tempo = poseRepTempo(state);

  assert(tempo !== null, 'tempo should resolve after several reps');
  assert(Math.abs(tempo! - 3) < 0.4, `expected about 3s per rep, got ${tempo}`);

  const cold = poseRepTempo(createPoseDetectorState());
  assert(cold === null, 'tempo should be null before any reps');
}

function testDepthJudging() {
  console.log('Testing depth judging...');

  // Four honest chest-to-floor reps to calibrate and bank, then three that
  // break the plane far enough to register but stop well short of depth.
  const full = repTrack(4, 'elbow', { start: 175, end: 60 });
  const shallow = repTrack(3, 'elbow', { start: 175, end: 100, startMs: full.endMs });
  const state = run([...full.samples, ...shallow.samples], PUSH_UP);

  assert(state.count === 4, `short reps must not count, got ${state.count}`);
  assert(state.shallowReps === 3, `expected 3 shallow reps, got ${state.shallowReps}`);
  assert(state.lastRepRejected, 'the last attempt should be marked rejected');
  assert(state.formBroken, 'three short reps in a row should end the set');
  assert(state.shouldStop, 'a broken-form set should ask to stop');
  assert(
    state.repDepths.length === 7,
    `every attempt should be recorded, got ${state.repDepths.length}`
  );
}

function testLenientDepth() {
  console.log('Testing lenient depth mode...');

  const opts = { ...DEFAULT_POSE_DETECTOR_OPTIONS, strictDepth: false };
  const full = repTrack(4, 'elbow', { start: 175, end: 60 });
  const shallow = repTrack(2, 'elbow', { start: 175, end: 100, startMs: full.endMs });
  const state = run([...full.samples, ...shallow.samples], PUSH_UP, opts);

  assert(state.count === 6, `lenient mode should count short reps, got ${state.count}`);
  assert(state.shallowReps === 2, `they should still be flagged, got ${state.shallowReps}`);
  assert(!state.lastRepRejected, 'lenient mode should not reject');
}

function testNoiseRejection() {
  console.log('Testing noise rejection...');

  // Jitter around the middle of the band, never reaching either extreme.
  const samples: Sample[] = [];
  let t = 0;
  for (let i = 0; i < 300; i += 1) {
    samples.push({ angles: { elbow: 125 + Math.sin(i / 2) * 8 }, now: t });
    t += FRAME_MS;
  }
  const jitter = run(samples, PUSH_UP);
  assert(jitter.count === 0, `mid-band jitter must not count, got ${jitter.count}`);

  // A flick through the whole range faster than a human can move: the phase
  // debounce should throw it away.
  const flick = repTrack(5, 'elbow', { start: 170, end: 80, repMs: 120, holdMs: 30 });
  const flicked = run(flick.samples, PUSH_UP);
  assert(flicked.count === 0, `impossibly fast reps must not count, got ${flicked.count}`);
}

function testVisibilityGating() {
  console.log('Testing visibility gating...');

  // A perfect rep track that the model can barely see must not be counted.
  const { samples } = repTrack(8, 'elbow', { start: 170, end: 80, visibility: 0.2 });
  const hidden = run(samples, PUSH_UP);
  assert(hidden.count === 0, `unseen joints must not count, got ${hidden.count}`);
  assert(hidden.quality === 'lost', `expected lost signal, got ${hidden.quality}`);

  const dim = run(repTrack(3, 'elbow', { start: 170, end: 80, visibility: 0.55 }).samples, PUSH_UP);
  assert(dim.quality === 'weak', `expected weak signal, got ${dim.quality}`);

  // A frame with no landmarks at all should be survivable, not fatal.
  const empty = pushPoseFrame(createPoseDetectorState(), [], 0, PUSH_UP);
  assert(empty.quality === 'lost', 'an empty frame should read as lost');
  assert(empty.count === 0, 'an empty frame should not count');
}

function testAutoStop() {
  console.log('Testing pause and auto-stop...');

  const { samples, endMs } = repTrack(5, 'elbow', { start: 170, end: 80 });
  let state = run(samples, PUSH_UP);
  assert(!state.shouldStop, 'should not stop while reps are still coming');

  // Stand still at the top for longer than the stop window.
  let t = endMs;
  const held: Sample[] = [];
  while (t < endMs + DEFAULT_POSE_DETECTOR_OPTIONS.stopMs + 1000) {
    held.push({ angles: { elbow: 170 }, now: t });
    t += FRAME_MS;
  }
  for (const s of held) state = pushPoseFrame(state, frame(s.angles), s.now, PUSH_UP);

  assert(state.paused, 'a long gap should read as paused');
  assert(state.shouldStop, 'a longer gap should end the set');
  assert(state.count === 5, `the count must survive the pause, got ${state.count}`);
}

function testDoesNotStopBeforeStarting() {
  console.log('Testing that auto-stop waits for the first rep...');

  // Stand in frame doing nothing for well past the stop window.
  let state = createPoseDetectorState();
  let t = 0;
  while (t < DEFAULT_POSE_DETECTOR_OPTIONS.stopMs + 5000) {
    state = pushPoseFrame(state, frame({ elbow: 170 }), t, PUSH_UP);
    t += FRAME_MS;
  }

  assert(!state.shouldStop, 'must not auto-stop before a single rep has happened');
  assert(!state.paused, 'must not read as paused before starting');
}

function testStartingFromTheBottom() {
  console.log('Testing a set begun from the bottom...');

  // Already down at the bottom when counting starts. Coming up is the finish
  // of a rep that was never seen, so it must not score.
  const samples: Sample[] = [];
  let t = 0;
  const emit = (from: number, to: number, ms: number) => {
    const steps = Math.max(1, Math.round(ms / FRAME_MS));
    for (let i = 0; i < steps; i += 1) {
      samples.push({ angles: { elbow: from + ((to - from) * i) / steps }, now: t });
      t += FRAME_MS;
    }
  };
  emit(80, 80, 500);
  emit(80, 170, 1000);
  emit(170, 170, 500);

  const state = run(samples, PUSH_UP);
  assert(state.count === 0, `a half rep at the start must not count, got ${state.count}`);
  assert(state.phase === 'high', 'should end locked out');
}

function testReversedMovement() {
  console.log('Testing a movement that starts at the low end...');

  // Lateral raises start with the arms down, so the rep scores on the way back
  // down rather than at the top.
  const { samples } = repTrack(7, 'shoulder', { start: 15, end: 92 });
  const state = run(samples, LATERAL_RAISE);

  assert(state.count === 7, `expected 7 raises, got ${state.count}`);
  assert(state.phase === 'low', `should finish with the arms down, got ${state.phase}`);
}

function testProgress() {
  console.log('Testing live rep progress...');

  const top = pushPoseFrame(createPoseDetectorState(), frame({ elbow: 175 }), 0, PUSH_UP);
  assert(repProgress(top, PUSH_UP) < 0.05, 'locked out should read as the start of the rep');

  const bottom = pushPoseFrame(createPoseDetectorState(), frame({ elbow: 70 }), 0, PUSH_UP);
  assert(repProgress(bottom, PUSH_UP) > 0.95, 'at the bottom should read as a full descent');

  const cold = repProgress(createPoseDetectorState(), PUSH_UP);
  assert(cold === 0, 'progress should be zero before any frame');

  // A reversed movement has to read the same way round.
  const down = pushPoseFrame(createPoseDetectorState(), frame({ shoulder: 12 }), 0, LATERAL_RAISE);
  assert(repProgress(down, LATERAL_RAISE) < 0.05, 'arms down is the start of a raise');
}

function testSpecLookup() {
  console.log('Testing exercise spec lookup...');

  assert(specForExercise('squat')?.id === 'squat', 'should resolve a library id');
  assert(specForExercise('push-ups')?.id === 'push-ups', 'should resolve push-ups by id');

  // Custom exercises arrive with no library id, so the name has to carry it.
  assert(specForExercise(undefined, 'Push Ups')?.id === 'push-ups', 'should match a loose name');
  assert(specForExercise(undefined, 'push-up')?.id === 'push-ups', 'should match singular');
  assert(
    specForExercise(undefined, 'Incline Bench Press')?.id === 'bench-press',
    'longest containment should win over a shorter accidental match'
  );

  // Movements with no honest angle signal must resolve to nothing rather than
  // to something approximate.
  assert(specForExercise('plank') === null, 'isometric holds should have no spec');
  assert(specForExercise('russian-twists') === null, 'rotations should have no spec');
  assert(specForExercise('shrugs') === null, 'small-excursion lifts should have no spec');
  assert(specForExercise(undefined, '') === null, 'an empty name should resolve to null');
  assert(specForExercise(undefined) === null, 'nothing in, nothing out');

  assert(canCountWithPose('squat'), 'squats should be countable');
  assert(!canCountWithPose('plank'), 'planks should not be countable');
}

function testSpecsAreWellFormed() {
  console.log('Testing that every spec is usable...');

  const seen = new Set<string>();
  for (const spec of POSE_REP_SPECS) {
    assert(!seen.has(spec.id), `duplicate spec for ${spec.id}`);
    seen.add(spec.id);

    assert(
      spec.highAngle > spec.lowAngle,
      `${spec.id}: high angle must sit above the low one`
    );
    // Too narrow a band and pose jitter alone would trip it.
    assert(
      spec.highAngle - spec.lowAngle >= 30,
      `${spec.id}: band of ${spec.highAngle - spec.lowAngle} degrees is too narrow to be safe`
    );
    assert(spec.lowAngle >= 0 && spec.highAngle <= 180, `${spec.id}: angles out of range`);
    assert(spec.cameraHint.length > 0, `${spec.id}: needs a camera hint`);
    assert(spec.formHint.length > 0, `${spec.id}: needs a form hint`);

    // Every spec must actually count when driven through its own full range,
    // which catches a band that the hysteresis makes unreachable.
    const key: keyof FrameAngles =
      spec.joints.left[1] === LM.leftElbow
        ? 'elbow'
        : spec.joints.left[1] === LM.leftShoulder
          ? 'shoulder'
          : spec.joints.left[1] === LM.leftKnee
            ? 'knee'
            : 'hip';

    const start = spec.countAt === 'high' ? spec.highAngle + 8 : spec.lowAngle - 8;
    const end = spec.countAt === 'high' ? spec.lowAngle - 8 : spec.highAngle + 8;
    const { samples } = repTrack(4, key, {
      start: Math.min(180, Math.max(0, start)),
      end: Math.min(180, Math.max(0, end)),
    });
    const state = run(samples, spec);
    assert(state.count === 4, `${spec.id}: expected 4 reps through its own range, got ${state.count}`);
  }

  assert(seen.size >= 30, `expected a decent spread of exercises, got ${seen.size}`);
}

function runTests() {
  try {
    testAngleMath();
    testNormalisation();
    testSmoothing();
    testCountsCleanReps();
    testCountsOnReturnToStart();
    testTempo();
    testDepthJudging();
    testLenientDepth();
    testNoiseRejection();
    testVisibilityGating();
    testAutoStop();
    testDoesNotStopBeforeStarting();
    testStartingFromTheBottom();
    testReversedMovement();
    testProgress();
    testSpecLookup();
    testSpecsAreWellFormed();
    console.log('\nAll pose rep counter tests passed! ✅');
  } catch (error) {
    console.error('\nTests failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

runTests();
