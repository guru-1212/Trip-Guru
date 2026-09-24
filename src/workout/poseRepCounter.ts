/**
 * Pose-based rep counter.
 *
 * The pipeline, end to end:
 *
 *   camera frame
 *     -> pose estimation (33 landmarks, done by the caller/MediaPipe)
 *     -> joint angle + shoulder-width normalisation   (this file)
 *     -> low-pass filter                              (this file)
 *     -> hysteresis state machine                     (this file)
 *     -> counter + feedback triggers                  (this file)
 *
 * Everything here is pure: landmarks in, detector state out. The React hook
 * owns the camera and the pose model; this file owns the decision, so it can
 * be unit-tested against synthetic joint tracks with no DOM and no WASM.
 *
 * Angles rather than raw distances are the primary signal because an angle is
 * already invariant to how far away you stand and how tall you are. Distances
 * are still needed for a few gates, and those are divided by shoulder width so
 * they mean the same thing for every body.
 */

/** One landmark from a 33-point pose model, in normalised 0..1 frame coords. */
export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  /** 0..1 confidence that this joint is actually visible. */
  visibility?: number;
}

/** BlazePose's 33-landmark layout - the indices this file cares about. */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Three landmark indices: outer, vertex, outer. The angle is at the vertex. */
export type JointTriple = readonly [number, number, number];

/**
 * Which end of the movement a rep is counted at.
 *
 * Always the starting position, which is what makes the count honest: you only
 * score once you have come back, so half reps never land.
 */
export type CountPhase = 'low' | 'high';

/** Where the angle currently sits. Mirrors CountPhase. */
export type AnglePhase = 'low' | 'high';

export type PoseSignalQuality = 'good' | 'weak' | 'lost';

/** Per-exercise definition of what one rep looks like. */
export interface PoseRepSpec {
  /** Matches an EXERCISE_LIBRARY id where one exists. */
  id: string;
  label: string;
  /** The joint whose angle is tracked, given for both sides. */
  joints: { left: JointTriple; right: JointTriple };
  /** At or below this angle (degrees) the movement is at its "low" extreme. */
  lowAngle: number;
  /** At or above this angle the movement is at its "high" extreme. */
  highAngle: number;
  /** The phase whose entry scores the rep - the start of the movement. */
  countAt: CountPhase;
  /** Shown while counting, so the camera gets placed somewhere useful. */
  cameraHint: string;
  /** What good depth means for this lift, in words. */
  formHint: string;
}

export interface PoseDetectorOptions {
  /** A phase must hold this long before it can flip - debounces jitter. */
  minPhaseMs: number;
  /** Fraction of the low/high span used as the hysteresis margin. */
  hysteresis: number;
  /** Mean visibility below which the signal is unusable. */
  lostVisibility: number;
  /** Mean visibility below which it works but is worth warning about. */
  weakVisibility: number;
  /** EMA smoothing factor for the angle, 0..1. Higher = more responsive. */
  smoothing: number;
  /** No reps for this long -> paused (resting). */
  pauseMs: number;
  /** No reps for this long -> the set is over. */
  stopMs: number;
  /** Reps used to learn what full range of motion looks like for this setup. */
  calibrationReps: number;
  /** Fraction of calibrated range below which a rep is judged shallow. */
  shallowFraction: number;
  /** Consecutive shallow reps that mean form has broken and the set is over. */
  shallowStopStreak: number;
  /**
   * When true a rep short of `shallowFraction` does not count at all. When
   * false it counts but is flagged. Strict is the default: "20 squats" means
   * 20 real ones.
   */
  strictDepth: boolean;
}

export const DEFAULT_POSE_DETECTOR_OPTIONS: PoseDetectorOptions = {
  minPhaseMs: 250,
  hysteresis: 0.15,
  lostVisibility: 0.4,
  weakVisibility: 0.65,
  smoothing: 0.4,
  pauseMs: 8000,
  stopMs: 15000,
  calibrationReps: 2,
  shallowFraction: 0.7,
  shallowStopStreak: 3,
  strictDepth: true,
};

export interface PoseDetectorState {
  count: number;
  phase: AnglePhase;
  /** Smoothed angle in degrees, or null before the first usable frame. */
  angle: number | null;
  /** Raw (unsmoothed) angle of the last usable frame, for the live meter. */
  rawAngle: number | null;
  seeded: boolean;
  phaseChangedAt: number;
  lastRepAt: number | null;
  startedAt: number | null;
  /** Timestamps of each counted rep, for tempo and the rep dots. */
  repTimestamps: number[];
  /**
   * Last time anything happened, counted or not, so a run of rejected reps
   * does not read as standing still.
   */
  lastActivityAt: number | null;
  quality: PoseSignalQuality;
  /** Mean visibility of the tracked joints on the last frame. */
  visibility: number;
  /** Which side is currently being tracked - the better-seen one. */
  side: 'left' | 'right' | null;
  /**
   * True once the body has travelled to the far end of the movement, which is
   * what makes the next return a rep. Starts false so a set picked up halfway
   * through - counting switched on at the bottom of a push-up - does not score
   * the ascent it never saw the descent for.
   */
  armed: boolean;
  paused: boolean;
  shouldStop: boolean;
  /** Extremes reached during the rep in progress. */
  repMin: number;
  repMax: number;
  /** Full range of motion learned from the opening reps, then held fixed. */
  calibratedRange: number | null;
  /**
   * Range of every detected attempt, 1 = as deep as calibration. Null for the
   * calibration reps themselves. In strict mode this runs longer than `count`,
   * because rejected attempts are recorded here but never counted.
   */
  repDepths: (number | null)[];
  shallowReps: number;
  consecutiveShallow: number;
  lastRepDepth: number | null;
  /** True when the most recent attempt was thrown out for being short. */
  lastRepRejected: boolean;
  /** Enough shallow reps in a row that the set is done. */
  formBroken: boolean;
}

export function createPoseDetectorState(): PoseDetectorState {
  return {
    count: 0,
    phase: 'high',
    angle: null,
    rawAngle: null,
    seeded: false,
    phaseChangedAt: 0,
    lastRepAt: null,
    startedAt: null,
    repTimestamps: [],
    lastActivityAt: null,
    quality: 'lost',
    visibility: 0,
    side: null,
    armed: false,
    paused: false,
    shouldStop: false,
    repMin: Infinity,
    repMax: -Infinity,
    calibratedRange: null,
    repDepths: [],
    shallowReps: 0,
    consecutiveShallow: 0,
    lastRepDepth: null,
    lastRepRejected: false,
    formBroken: false,
  };
}

/* ---------------------------------------------------------------------------
 * Step 2 - geometry
 * ------------------------------------------------------------------------ */

/**
 * Interior angle at `b` formed by a-b-c, in degrees (0..180).
 *
 * The cosine is clamped before acos: floating point drift can push a perfectly
 * straight limb fractionally past 1 and produce NaN, which would poison the
 * filter for the rest of the set.
 */
export function angleAt(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;

  const dot = abx * cbx + aby * cby;
  const magA = Math.hypot(abx, aby);
  const magC = Math.hypot(cbx, cby);
  if (magA === 0 || magC === 0) return 0;

  const cos = Math.min(1, Math.max(-1, dot / (magA * magC)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Shoulder-to-shoulder span, the normalisation scale. Null if unseen. */
export function shoulderWidth(frame: readonly PoseLandmark[]): number | null {
  const l = frame[LM.leftShoulder];
  const r = frame[LM.rightShoulder];
  if (!l || !r) return null;
  const width = Math.hypot(l.x - r.x, l.y - r.y);
  return width === 0 ? null : width;
}

/**
 * Distance between two landmarks divided by shoulder width.
 *
 * Shoulder width is the one span that stays roughly constant regardless of how
 * far you stand from the camera, so dividing by it turns a frame-relative
 * distance into something comparable across people and camera placements.
 */
export function normalizedDistance(
  frame: readonly PoseLandmark[],
  from: number,
  to: number
): number | null {
  const scale = shoulderWidth(frame);
  const a = frame[from];
  const b = frame[to];
  if (!a || !b || scale === null) return null;
  return Math.hypot(a.x - b.x, a.y - b.y) / scale;
}

/** Mean visibility across the three landmarks of a joint triple. */
export function tripleVisibility(
  frame: readonly PoseLandmark[],
  triple: JointTriple
): number {
  let total = 0;
  for (const i of triple) {
    const lm = frame[i];
    if (!lm) return 0;
    total += lm.visibility ?? 1;
  }
  return total / triple.length;
}

/**
 * Picks the better-seen side and measures its angle.
 *
 * Choosing per frame rather than locking a side up front is what lets one spec
 * work whether you film yourself head-on (both sides visible, either will do)
 * or from the side (one limb hides the other completely).
 */
export function measureAngle(
  frame: readonly PoseLandmark[],
  spec: PoseRepSpec
): { angle: number; visibility: number; side: 'left' | 'right' } | null {
  const leftVis = tripleVisibility(frame, spec.joints.left);
  const rightVis = tripleVisibility(frame, spec.joints.right);
  const side: 'left' | 'right' = rightVis > leftVis ? 'right' : 'left';
  const triple = spec.joints[side];
  const visibility = side === 'right' ? rightVis : leftVis;

  const a = frame[triple[0]];
  const b = frame[triple[1]];
  const c = frame[triple[2]];
  if (!a || !b || !c) return null;

  return { angle: angleAt(a, b, c), visibility, side };
}

/* ---------------------------------------------------------------------------
 * Step 3 - filtering
 * ------------------------------------------------------------------------ */

/**
 * Exponential moving average.
 *
 * Pose models jitter by a couple of degrees frame to frame even when you hold
 * still. Without this the angle crosses a threshold several times in a row at
 * the turnaround and one rep scores as three.
 */
export function smoothAngle(previous: number | null, next: number, alpha: number): number {
  if (previous === null) return next;
  return previous + (next - previous) * alpha;
}

/* ---------------------------------------------------------------------------
 * Steps 4 and 5 - state machine and counter
 * ------------------------------------------------------------------------ */

function classify(visibility: number, opts: PoseDetectorOptions): PoseSignalQuality {
  if (visibility < opts.lostVisibility) return 'lost';
  if (visibility < opts.weakVisibility) return 'weak';
  return 'good';
}

/**
 * Feeds one pose frame and returns the next state.
 *
 * The thresholds sit inside the spec's low/high band by `hysteresis`, so the
 * angle has to travel a real distance to flip the phase. A signal that merely
 * wobbles around one threshold never crosses both, which is the whole point.
 */
export function pushPoseFrame(
  state: PoseDetectorState,
  frame: readonly PoseLandmark[],
  now: number,
  spec: PoseRepSpec,
  opts: PoseDetectorOptions = DEFAULT_POSE_DETECTOR_OPTIONS
): PoseDetectorState {
  const measured = measureAngle(frame, spec);

  if (!measured) {
    return { ...state, quality: 'lost', visibility: 0, side: null };
  }

  const quality = classify(measured.visibility, opts);
  const angle = smoothAngle(state.angle, measured.angle, opts.smoothing);

  if (!state.seeded) {
    // Start in whichever phase the body is actually in, so a set begun from
    // the bottom does not score a phantom rep on the way up.
    const mid = (spec.lowAngle + spec.highAngle) / 2;
    return {
      ...state,
      seeded: true,
      angle,
      rawAngle: measured.angle,
      phase: angle >= mid ? 'high' : 'low',
      phaseChangedAt: now,
      startedAt: now,
      quality,
      visibility: measured.visibility,
      side: measured.side,
      repMin: angle,
      repMax: angle,
    };
  }

  let count = state.count;
  let phase = state.phase;
  let phaseChangedAt = state.phaseChangedAt;
  let lastRepAt = state.lastRepAt;
  let lastActivityAt = state.lastActivityAt;
  let repTimestamps = state.repTimestamps;
  let repMin = state.repMin;
  let repMax = state.repMax;
  let calibratedRange = state.calibratedRange;
  let repDepths = state.repDepths;
  let shallowReps = state.shallowReps;
  let consecutiveShallow = state.consecutiveShallow;
  let lastRepDepth = state.lastRepDepth;
  let lastRepRejected = state.lastRepRejected;
  let formBroken = state.formBroken;
  let armed = state.armed;

  // Track the excursion of the rep in progress. This, not the thresholds, is
  // what says whether the rep had real range.
  repMin = Math.min(repMin, angle);
  repMax = Math.max(repMax, angle);

  if (quality !== 'lost') {
    const span = spec.highAngle - spec.lowAngle;
    const margin = span * opts.hysteresis;
    const enterLow = spec.lowAngle + margin;
    const enterHigh = spec.highAngle - margin;

    let crossing: AnglePhase | null = null;
    if (phase === 'high' && angle <= enterLow) crossing = 'low';
    else if (phase === 'low' && angle >= enterHigh) crossing = 'high';

    if (crossing) {
      // The phase has to have held for a plausible stretch *at the moment* it
      // flips. Gating only the transition would merely delay it, so a flicker
      // through the whole range would still score a rep a beat later; instead
      // the crossing is applied and the rep behind it thrown away.
      const held = now - phaseChangedAt >= opts.minPhaseMs;

      if (held && crossing !== spec.countAt) {
        // Reached the far end under control. Not a rep yet, but it arms the
        // next return - and it is motion, so a slow descent cannot trip the
        // pause timer.
        armed = true;
        lastActivityAt = now;
      }

      if (held && crossing === spec.countAt && armed) {
        // The attempt is judged on the range it actually covered, measured
        // from the far extreme back to here.
        const range = repMax - repMin;
        lastActivityAt = now;
        armed = false;

        if (repDepths.length < opts.calibrationReps) {
          // The opening reps set the standard. Take the largest rather than
          // the mean: full range is a physical limit, so the best of them is
          // the honest definition of it.
          calibratedRange = Math.max(calibratedRange ?? 0, range);
          repDepths = [...repDepths, null];
          count += 1;
          lastRepAt = now;
          repTimestamps = [...repTimestamps, now];
          lastRepDepth = null;
          lastRepRejected = false;
        } else {
          const depth = calibratedRange ? range / calibratedRange : 1;
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

          // Strict: a short rep is not a rep. It still feeds the streak above,
          // so a run of them still ends the set.
          if (!lastRepRejected) {
            count += 1;
            lastRepAt = now;
            repTimestamps = [...repTimestamps, now];
          }
        }
      }

      // Arriving back at the start begins a new rep whether or not the last
      // one scored, so the excursion window restarts here either way.
      if (crossing === spec.countAt) {
        repMin = angle;
        repMax = angle;
      }

      phase = crossing;
      phaseChangedAt = now;
    }
  }

  const sinceActivity = lastActivityAt === null ? 0 : now - lastActivityAt;
  // Auto-stop only once something has actually happened, so it cannot fire
  // while you are still walking into frame.
  const paused = lastActivityAt !== null && sinceActivity >= opts.pauseMs;
  const shouldStop = lastActivityAt !== null && sinceActivity >= opts.stopMs;

  return {
    count,
    phase,
    angle,
    rawAngle: measured.angle,
    seeded: true,
    phaseChangedAt,
    lastRepAt,
    startedAt: state.startedAt,
    repTimestamps,
    lastActivityAt,
    quality,
    visibility: measured.visibility,
    side: measured.side,
    armed,
    paused,
    shouldStop: shouldStop || formBroken,
    repMin,
    repMax,
    calibratedRange,
    repDepths,
    shallowReps,
    consecutiveShallow,
    lastRepDepth,
    lastRepRejected,
    formBroken,
  };
}

/** Mean seconds per rep over the counted reps, or null before two reps. */
export function poseRepTempo(state: PoseDetectorState): number | null {
  const stamps = state.repTimestamps;
  if (stamps.length < 2) return null;
  const span = stamps[stamps.length - 1] - stamps[0];
  return Math.round((span / (stamps.length - 1) / 1000) * 10) / 10;
}

/**
 * How far through the current rep you are, 0..1, for the live progress ring.
 *
 * Measured against the spec's band rather than the calibrated range so it
 * still reads sensibly during the calibration reps.
 */
export function repProgress(state: PoseDetectorState, spec: PoseRepSpec): number {
  if (state.angle === null) return 0;
  const span = spec.highAngle - spec.lowAngle;
  if (span <= 0) return 0;
  const t = (state.angle - spec.lowAngle) / span;
  const clamped = Math.min(1, Math.max(0, t));
  // Progress should read "how far from the start", whichever end that is.
  return spec.countAt === 'high' ? 1 - clamped : clamped;
}
