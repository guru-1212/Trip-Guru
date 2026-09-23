import {
  DEFAULT_REP_DETECTOR_OPTIONS,
  createRepDetectorState,
  pushSample,
  repTempo,
  sampleCentreLuminance,
} from './repCounter';
import type { RepDetectorState } from './repCounter';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

const FPS = 30;
const FRAME_MS = 1000 / FPS;

/** Feeds a synthetic signal and returns the final state. */
function run(
  samples: { luminance: number; now: number }[],
  opts = DEFAULT_REP_DETECTOR_OPTIONS
): RepDetectorState {
  let state = createRepDetectorState();
  for (const s of samples) state = pushSample(state, s.luminance, s.now, opts);
  return state;
}

/**
 * One rep = bright (top) → dark (chest over the lens) → bright.
 * `repMs` is the full cycle; starts and ends in the up position.
 */
function repSignal(
  reps: number,
  opts: { bright?: number; dark?: number; repMs?: number; startMs?: number; holdMs?: number } = {}
) {
  const bright = opts.bright ?? 200;
  const dark = opts.dark ?? 40;
  const repMs = opts.repMs ?? 2000;
  const holdMs = opts.holdMs ?? 500;
  let t = opts.startMs ?? 0;
  const out: { luminance: number; now: number }[] = [];

  const emit = (from: number, to: number, ms: number) => {
    const steps = Math.max(1, Math.round(ms / FRAME_MS));
    for (let i = 0; i < steps; i += 1) {
      out.push({ luminance: from + ((to - from) * i) / steps, now: t });
      t += FRAME_MS;
    }
  };

  emit(bright, bright, holdMs); // settle at the top so the envelope seeds
  for (let r = 0; r < reps; r += 1) {
    emit(bright, dark, repMs / 2);
    emit(dark, bright, repMs / 2);
  }
  emit(bright, bright, holdMs);
  return { samples: out, endMs: t };
}

function testCountsCleanReps() {
  console.log('Testing rep counting (clean signal)...');

  assert(run(repSignal(1).samples).count === 1, 'Counts the very first rep');
  assert(run(repSignal(10).samples).count === 10, 'Counts ten reps exactly');
  assert(run(repSignal(43).samples).count === 43, 'Counts a full AMRAP set of 43');

  const state = run(repSignal(5).samples);
  assert(state.phase === 'up', 'Ends in the up position');
  assert(state.quality === 'good', 'A full-swing signal reads as good quality');
  assert(state.repTimestamps.length === 5, 'Records a timestamp per rep');
}

function testTempoAndDepth() {
  console.log('Testing rep tempo and depth...');

  const slow = run(repSignal(5, { repMs: 3000 }).samples);
  assert(repTempo(slow) === 3, 'Three-second reps report a 3.0s tempo');
  assert(repTempo(createRepDetectorState()) === null, 'No tempo before two reps');

  // Shallow reps do not darken the lens enough to cross the threshold — the
  // counter enforces depth rather than rewarding half reps.
  const shallow = run(repSignal(8, { bright: 200, dark: 185 }).samples);
  assert(shallow.count === 0, 'Reps too shallow to block the light are not counted');
  assert(shallow.quality === 'lost', 'A tiny swing reports as lost signal');
}

function testDepthJudging() {
  console.log('Testing depth judging...');

  const opts = DEFAULT_REP_DETECTOR_OPTIONS;

  // Consistent full-depth reps: nothing flagged.
  const clean = run(repSignal(10).samples);
  assert(clean.shallowReps === 0, 'Consistent reps are never flagged shallow');
  assert(clean.formBroken === false, 'Consistent reps do not break form');
  assert(clean.calibratedContrast !== null, 'Calibrates from the opening reps');
  assert(
    clean.repDepths.slice(0, opts.calibrationReps).every((d) => d === null),
    'Calibration reps have no depth score of their own'
  );
  assert(
    clean.repDepths.slice(opts.calibrationReps).every((d) => d !== null && d > 0.9),
    'Later full-depth reps score near 1'
  );

  // Deep to start, then collapsing to half depth — the real failure pattern.
  // The envelope adapts so these still COUNT; depth is judged separately.
  const deep = repSignal(5, { bright: 200, dark: 40 });
  const half = repSignal(4, { bright: 200, dark: 125, startMs: deep.endMs });
  const degrading = run([...deep.samples, ...half.samples]);
  // 8 of 9: an abrupt collapse from full to half depth costs one rep while the
  // envelope re-adapts. Real fatigue degrades gradually and loses nothing —
  // see the graded-fatigue case below.
  assert(degrading.count === 8, 'Shallow reps keep counting once the envelope adapts');
  assert(degrading.shallowReps >= 2, 'Half-depth reps are flagged as shallow');
  assert(degrading.formBroken === true, 'Consecutive shallow reps mean form has broken');
  assert(degrading.shouldStop === true, 'Broken form ends the set');

  // Graded fatigue — how a real AMRAP actually decays. Nothing is lost.
  let graded: { luminance: number; now: number }[] = [];
  let at = 0;
  for (let i = 0; i < 30; i += 1) {
    const fatigue = i / 29;
    const seg = repSignal(1, {
      bright: 200,
      dark: 40 + fatigue * 70,
      repMs: 900 + fatigue * 1400,
      startMs: at,
      holdMs: 0,
    });
    graded = [...graded, ...seg.samples];
    at = seg.endMs;
  }
  const fatigued = run(graded);
  assert(fatigued.count === 30, 'Gradually shallower, slower reps all still count');
  assert(fatigued.shallowReps > 0, 'The late shallow reps are still flagged');

  // One shallow rep in the middle is a wobble, not a broken set.
  const a = repSignal(5, { bright: 200, dark: 40 });
  const dip = repSignal(1, { bright: 200, dark: 130, startMs: a.endMs });
  const b = repSignal(4, { bright: 200, dark: 40, startMs: dip.endMs });
  const wobble = run([...a.samples, ...dip.samples, ...b.samples]);
  // Ten attempts, nine of them real. An isolated half rep against an
  // established deep baseline never darkens the lens enough to register, so it
  // is rejected outright rather than counted and flagged.
  assert(wobble.count === 9, 'An isolated half rep is not counted at all');
  assert(wobble.formBroken === false, 'One bad rep does not end the set');
  assert(wobble.consecutiveShallow === 0, 'The shallow streak stays clear');
}

function testNoiseRejection() {
  console.log('Testing noise rejection...');

  // Someone walking past casts a brief shadow: far too short to be a rep.
  const { samples, endMs } = repSignal(3, { repMs: 2000 });
  let t = endMs;
  for (let i = 0; i < 3; i += 1) {
    samples.push({ luminance: 60, now: t });
    t += FRAME_MS;
  }
  for (let i = 0; i < 3; i += 1) {
    samples.push({ luminance: 200, now: t });
    t += FRAME_MS;
  }
  assert(run(samples).count === 3, 'A 100ms shadow is debounced, not counted as a rep');

  // Early AMRAP reps are quick; the debounce must not eat them.
  assert(run(repSignal(12, { repMs: 800 }).samples).count === 12, 'Counts fast 0.8s reps');
  assert(run(repSignal(12, { repMs: 500 }).samples).count === 12, 'Counts very fast 0.5s reps');

  // Steady light with no movement counts nothing.
  const still = Array.from({ length: 200 }, (_, i) => ({ luminance: 180, now: i * FRAME_MS }));
  assert(run(still).count === 0, 'A static frame never counts a rep');
}

function testAutoStop() {
  console.log('Testing auto-stop...');

  const { samples, endMs } = repSignal(6, { repMs: 1500 });
  const idle = [...samples];
  let t = endMs;
  // Rack the set and lie still.
  for (let i = 0; i < FPS * 15; i += 1) {
    idle.push({ luminance: 200, now: t });
    t += FRAME_MS;
  }
  const stopped = run(idle);
  assert(stopped.count === 6, 'Idle time does not change the count');
  assert(stopped.paused === true, 'Goes paused once reps stop');
  assert(stopped.shouldStop === true, 'Auto-stops after the idle window');

  // A short breather mid-set must not end the set.
  const breather = [...samples];
  t = endMs;
  for (let i = 0; i < FPS * 3; i += 1) {
    breather.push({ luminance: 200, now: t });
    t += FRAME_MS;
  }
  const resting = run(breather);
  assert(resting.paused === false, 'A three-second pause is not treated as a rest');
  assert(resting.shouldStop === false, 'A three-second pause does not end the set');

  // Nothing counted yet → never auto-stop, you are still getting into position.
  const gettingReady = Array.from({ length: FPS * 20 }, (_, i) => ({
    luminance: 200,
    now: i * FRAME_MS,
  }));
  assert(run(gettingReady).shouldStop === false, 'Never auto-stops before the first rep');
}

function testAdaptsToLight() {
  console.log('Testing light adaptation...');

  // A dim corner of the gym: smaller swing, still countable.
  const dim = run(repSignal(10, { bright: 90, dark: 25 }).samples);
  assert(dim.count === 10, 'Counts correctly in low light with a reduced swing');

  // Ambient light drifts up mid-set (someone opens a door); the envelope
  // releases toward the new level rather than losing the signal.
  const drifting = repSignal(6, { bright: 150, dark: 40 }).samples;
  const brighter = repSignal(6, { bright: 230, dark: 110, startMs: 20000 }).samples;
  const combined = run([...drifting, ...brighter]);
  assert(combined.count === 12, 'Keeps counting after the ambient light shifts');
}

function testLuminanceSampling() {
  console.log('Testing centre luminance sampling...');

  const w = 32;
  const h = 32;
  const data = new Uint8ClampedArray(w * h * 4);
  // Bright border, dark centre — only the centre should register.
  for (let i = 0; i < w * h; i += 1) {
    const x = i % w;
    const y = Math.floor(i / w);
    const centre = x >= 8 && x < 24 && y >= 8 && y < 24;
    const v = centre ? 0 : 255;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const lum = sampleCentreLuminance(data, w, h, 0.5);
  assert(lum === 0, 'Only the centre region contributes, so the bright border is ignored');

  const white = new Uint8ClampedArray(w * h * 4).fill(255);
  assert(
    Math.round(sampleCentreLuminance(white, w, h)) === 255,
    'An all-white frame reads as full luminance'
  );
}

function runTests() {
  try {
    testCountsCleanReps();
    testTempoAndDepth();
    testDepthJudging();
    testNoiseRejection();
    testAutoStop();
    testAdaptsToLight();
    testLuminanceSampling();
    console.log('\nAll rep counter tests passed! ✅');
  } catch (error) {
    console.error('\nTests failed! ❌');
    console.error(error);
    process.exit(1);
  }
}

runTests();
