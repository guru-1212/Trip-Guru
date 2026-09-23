/**
 * Optical rep counter.
 *
 * The phone lies flat on the floor, screen up, under your chest. At the bottom
 * of every rep your chest blocks the light reaching the front camera, so the
 * average brightness of a small centre region swings dark/bright once per rep.
 * Counting those swings is far more reliable than pose estimation — and it
 * enforces depth for free, because a rep that does not come down far enough
 * never blocks the light.
 *
 * Everything here is pure: brightness samples in, detector state out. The React
 * hook owns the camera; this file owns the decision, so it can be unit-tested
 * against synthetic signals with no DOM.
 */

export type RepPhase = 'up' | 'down';

/** How much to trust the current signal — drives the UI warning, not the count. */
export type SignalQuality = 'good' | 'weak' | 'lost';

export interface RepDetectorOptions {
  /** A phase must hold this long before it can flip again — debounces flicker. */
  minPhaseMs: number;
  /** Fraction of the observed range below which counts as "down". */
  downFraction: number;
  /** Fraction above which counts as "up". Gap between the two is the hysteresis. */
  upFraction: number;
  /** Below this brightness swing there is no usable signal at all. */
  minRange: number;
  /** Below this the signal works but is worth warning about. */
  weakRange: number;
  /** No reps for this long → paused (you are resting). */
  pauseMs: number;
  /** No reps for this long → the set is over. */
  stopMs: number;
  /** Envelope release per sample: how fast min/max drift back toward the signal. */
  release: number;
  /** Reps used to learn what a full-depth rep looks like for this setup. */
  calibrationReps: number;
  /** Fraction of calibrated depth below which a rep is judged shallow. */
  shallowFraction: number;
  /** Consecutive shallow reps that mean form has broken and the set is over. */
  shallowStopStreak: number;
  /**
   * When true a rep short of `shallowFraction` does not count at all. When
   * false it counts but is flagged. Strict is the default: "100 push-ups"
   * means 100 full ones.
   */
  strictDepth: boolean;
}

export const DEFAULT_REP_DETECTOR_OPTIONS: RepDetectorOptions = {
  minPhaseMs: 150,
  downFraction: 0.35,
  upFraction: 0.65,
  minRange: 15,
  weakRange: 40,
  pauseMs: 6000,
  stopMs: 12000,
  release: 0.004,
  calibrationReps: 3,
  shallowFraction: 0.7,
  shallowStopStreak: 2,
  strictDepth: true,
};

export interface RepDetectorState {
  count: number;
  phase: RepPhase;
  /** Envelope follower: instant attack, slow release. */
  min: number;
  max: number;
  seeded: boolean;
  phaseChangedAt: number;
  lastRepAt: number | null;
  startedAt: number | null;
  /** Timestamps of each counted rep, for tempo and the rep dots. */
  repTimestamps: number[];
  /**
   * Last time anything happened, counted or not. Drives pause/auto-stop, so a
   * run of rejected reps does not read as lying still.
   */
  lastActivityAt: number | null;
  quality: SignalQuality;
  paused: boolean;
  shouldStop: boolean;
  /**
   * What a full-depth rep looks like here, learned from the first few reps and
   * then held fixed. Stored as Michelson-style contrast so it survives the room
   * getting brighter or dimmer mid-set.
   */
  calibratedContrast: number | null;
  /** Darkest sample of the rep currently in progress. */
  repBottom: number;
  /**
   * Depth of every detected attempt, 1 = as deep as calibration. Null for the
   * calibration reps themselves. In strict mode this is longer than `count`,
   * because rejected attempts are recorded here but never counted.
   */
  repDepths: (number | null)[];
  /** Attempts that were too shallow to count (strict) or were flagged (lenient). */
  shallowReps: number;
  consecutiveShallow: number;
  /** Depth of the most recent attempt, for live feedback. */
  lastRepDepth: number | null;
  /** True when the most recent attempt was thrown out for being short. */
  lastRepRejected: boolean;
  /** Form has broken: enough shallow reps in a row that the set is done. */
  formBroken: boolean;
}

export function createRepDetectorState(): RepDetectorState {
  return {
    count: 0,
    phase: 'up',
    min: 0,
    max: 0,
    seeded: false,
    phaseChangedAt: 0,
    lastRepAt: null,
    startedAt: null,
    repTimestamps: [],
    lastActivityAt: null,
    quality: 'lost',
    paused: false,
    shouldStop: false,
    calibratedContrast: null,
    repBottom: 255,
    repDepths: [],
    shallowReps: 0,
    consecutiveShallow: 0,
    lastRepDepth: null,
    lastRepRejected: false,
    formBroken: false,
  };
}

function classify(range: number, opts: RepDetectorOptions): SignalQuality {
  if (range < opts.minRange) return 'lost';
  if (range < opts.weakRange) return 'weak';
  return 'good';
}

/**
 * Feeds one brightness sample (0–255) and returns the next state.
 *
 * Thresholds are computed from the envelope *before* this sample is folded in.
 * Doing it the other way round makes the detector blind: `min` tracks a falling
 * signal instantly, so the "down" threshold would move with it and never trip.
 */
export function pushSample(
  state: RepDetectorState,
  luminance: number,
  now: number,
  opts: RepDetectorOptions = DEFAULT_REP_DETECTOR_OPTIONS
): RepDetectorState {
  if (!state.seeded) {
    return {
      ...state,
      seeded: true,
      min: luminance,
      max: luminance,
      startedAt: now,
      phaseChangedAt: now,
      quality: 'lost',
    };
  }

  const range = state.max - state.min;
  const quality = classify(range, opts);

  let { count, phase, phaseChangedAt, lastRepAt, lastActivityAt } = state;
  let repTimestamps = state.repTimestamps;
  let {
    lastRepDepth,
    lastRepRejected,
    calibratedContrast,
    repBottom,
    repDepths,
    shallowReps,
    consecutiveShallow,
    formBroken,
  } = state;

  // Track how dark it actually got during the descent — this, not the adaptive
  // envelope, is what tells us whether the rep had real depth.
  if (phase === 'down') repBottom = Math.min(repBottom, luminance);

  if (quality !== 'lost') {
    const downThreshold = state.min + range * opts.downFraction;
    const upThreshold = state.min + range * opts.upFraction;

    if (phase === 'up' && luminance < downThreshold) {
      phase = 'down';
      phaseChangedAt = now;
      repBottom = luminance;
    } else if (phase === 'down' && luminance > upThreshold) {
      // The descent has to have lasted a plausible amount of time *at the moment*
      // the light returns. A passing shadow dips and clears in ~100ms; gating the
      // transition alone would merely delay it, so a too-short dip is discarded
      // outright rather than counted late.
      if (now - phaseChangedAt >= opts.minPhaseMs) {
        // An attempt completes on the way back up — at lockout, not at the bottom.
        // Contrast rather than raw difference: dividing by the top level makes
        // the measure invariant to the room getting brighter or dimmer, so only
        // real changes in how far you descend move it.
        const top = Math.max(state.max, luminance, 1);
        const contrast = (top - repBottom) / top;
        lastActivityAt = now;

        if (repDepths.length < opts.calibrationReps) {
          // The opening reps set the standard. Take the deepest rather than the
          // average: chest-to-floor is a hard physical floor, so the best of
          // them is the honest definition of full range.
          calibratedContrast = Math.max(calibratedContrast ?? 0, contrast);
          repDepths = [...repDepths, null];
          count += 1;
          lastRepAt = now;
          repTimestamps = [...repTimestamps, now];
          lastRepDepth = null;
          lastRepRejected = false;
        } else {
          const depth = calibratedContrast ? contrast / calibratedContrast : 1;
          const tooShallow = depth < opts.shallowFraction;
          repDepths = [...repDepths, depth];
          lastRepDepth = depth;
          lastRepRejected = tooShallow && opts.strictDepth;

          if (tooShallow) {
            shallowReps += 1;
            consecutiveShallow += 1;
            if (consecutiveShallow >= opts.shallowStopStreak) formBroken = true;
          } else {
            consecutiveShallow = 0;
          }

          // Strict: a short rep is not a rep. It still updates the streak above,
          // so a run of them still ends the set.
          if (!lastRepRejected) {
            count += 1;
            lastRepAt = now;
            repTimestamps = [...repTimestamps, now];
          }
        }
      }
      phase = 'up';
      phaseChangedAt = now;
      repBottom = 255;
    }
  }

  // Envelope: attack instantly toward a new extreme, release slowly back.
  const min =
    luminance < state.min ? luminance : state.min + (luminance - state.min) * opts.release;
  const max =
    luminance > state.max ? luminance : state.max + (luminance - state.max) * opts.release;

  const sinceActivity = lastActivityAt === null ? 0 : now - lastActivityAt;
  // Auto-stop only once something has actually been counted, so it cannot fire
  // while you are still getting into position.
  const paused = lastActivityAt !== null && sinceActivity >= opts.pauseMs;
  const shouldStop = lastActivityAt !== null && sinceActivity >= opts.stopMs;

  return {
    count,
    phase,
    min,
    max,
    seeded: true,
    phaseChangedAt,
    lastRepAt,
    startedAt: state.startedAt,
    repTimestamps,
    lastActivityAt,
    quality,
    paused,
    shouldStop: shouldStop || formBroken,
    calibratedContrast,
    repBottom,
    repDepths,
    shallowReps,
    consecutiveShallow,
    lastRepDepth,
    lastRepRejected,
    formBroken,
  };
}

/** Mean seconds per rep over the counted reps, or null before two reps. */
export function repTempo(state: RepDetectorState): number | null {
  const stamps = state.repTimestamps;
  if (stamps.length < 2) return null;
  const span = stamps[stamps.length - 1] - stamps[0];
  return Math.round((span / (stamps.length - 1) / 1000) * 10) / 10;
}

/**
 * Mean luminance of a centred square of an RGBA buffer.
 *
 * Only the centre is sampled: that is the patch your chest actually covers, and
 * ignoring the edges keeps gym strip lights and passers-by out of the signal.
 */
export function sampleCentreLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  regionFraction = 0.5
): number {
  const halfW = Math.max(1, Math.floor((width * regionFraction) / 2));
  const halfH = Math.max(1, Math.floor((height * regionFraction) / 2));
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  let total = 0;
  let pixels = 0;
  for (let y = cy - halfH; y < cy + halfH; y += 1) {
    if (y < 0 || y >= height) continue;
    for (let x = cx - halfW; x < cx + halfW; x += 1) {
      if (x < 0 || x >= width) continue;
      const i = (y * width + x) * 4;
      // Rec. 601 luma — matches how the eye weights the channels.
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      pixels += 1;
    }
  }
  return pixels === 0 ? 0 : total / pixels;
}
