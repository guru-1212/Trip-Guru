/**
 * What one rep looks like, per exercise.
 *
 * Each spec names a joint, the two angles that bracket the movement, and which
 * end of it scores. The scoring end is always the *start* of the rep, so the
 * count only goes up once you have come back to where you began - that is what
 * stops half reps landing.
 *
 * Only movements with a joint angle that genuinely swings are listed. Isometric
 * holds (plank, hollow hold), rotations (Russian twists) and small-excursion
 * lifts (shrugs, wrist curls) have no honest angle signal, so they are left out
 * on purpose and the UI falls back to typing the number in. A wrong count is
 * worse than no count.
 */

import { LM } from './poseRepCounter';
import type { JointTriple, PoseRepSpec } from './poseRepCounter';

/** Elbow flexion: shoulder - elbow - wrist. */
const ELBOW: { left: JointTriple; right: JointTriple } = {
  left: [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
  right: [LM.rightShoulder, LM.rightElbow, LM.rightWrist],
};

/** Knee flexion: hip - knee - ankle. */
const KNEE: { left: JointTriple; right: JointTriple } = {
  left: [LM.leftHip, LM.leftKnee, LM.leftAnkle],
  right: [LM.rightHip, LM.rightKnee, LM.rightAnkle],
};

/** Hip hinge: shoulder - hip - knee. */
const HIP: { left: JointTriple; right: JointTriple } = {
  left: [LM.leftShoulder, LM.leftHip, LM.leftKnee],
  right: [LM.rightShoulder, LM.rightHip, LM.rightKnee],
};

/** Shoulder abduction/flexion: hip - shoulder - elbow. */
const SHOULDER: { left: JointTriple; right: JointTriple } = {
  left: [LM.leftHip, LM.leftShoulder, LM.leftElbow],
  right: [LM.rightHip, LM.rightShoulder, LM.rightElbow],
};

const SIDE_ON = 'Prop the phone at hip height, a couple of steps away, side on.';
const FRONT_ON = 'Prop the phone at chest height, a couple of steps away, facing you.';
const FLOOR_SIDE = 'Prop the phone on the floor a couple of steps away, side on.';

export const POSE_REP_SPECS: PoseRepSpec[] = [
  /* ---- Chest / pressing ------------------------------------------------ */
  {
    id: 'push-ups',
    label: 'Push-ups',
    joints: ELBOW,
    lowAngle: 95,
    highAngle: 155,
    countAt: 'high',
    cameraHint: FLOOR_SIDE,
    formHint: 'Chest to the floor, then full lockout.',
  },
  {
    id: 'bench-press',
    label: 'Bench Press',
    joints: ELBOW,
    lowAngle: 95,
    highAngle: 160,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Bar to the chest, then lock out.',
  },
  {
    id: 'chest-press-machine',
    label: 'Chest Press Machine',
    joints: ELBOW,
    lowAngle: 90,
    highAngle: 155,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Full stretch at the bottom, press to lockout.',
  },
  {
    id: 'incline-press',
    label: 'Incline Press',
    joints: ELBOW,
    lowAngle: 95,
    highAngle: 158,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Lower to the upper chest, then press up.',
  },
  {
    id: 'tricep-dips',
    label: 'Tricep Dips',
    joints: ELBOW,
    lowAngle: 95,
    highAngle: 160,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Elbows to ninety, then straighten fully.',
  },

  /* ---- Overhead pressing ----------------------------------------------- */
  {
    id: 'overhead-press',
    label: 'Overhead Press',
    joints: ELBOW,
    lowAngle: 85,
    highAngle: 165,
    countAt: 'low',
    cameraHint: FRONT_ON,
    formHint: 'Press to a full lockout, then back to the shoulders.',
  },
  {
    id: 'landmine-press',
    label: 'Landmine Press',
    joints: ELBOW,
    lowAngle: 80,
    highAngle: 160,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Press away fully, then return to the shoulder.',
  },

  /* ---- Triceps ---------------------------------------------------------- */
  {
    id: 'tricep-pushdown',
    label: 'Tricep Pushdown',
    joints: ELBOW,
    lowAngle: 70,
    highAngle: 160,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Lock the elbows out, then back to ninety.',
  },
  {
    id: 'overhead-tricep-extension',
    label: 'Overhead Tricep Extension',
    joints: ELBOW,
    lowAngle: 65,
    highAngle: 160,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Full stretch behind the head, then straighten.',
  },
  {
    id: 'skull-crushers',
    label: 'Skull Crushers',
    joints: ELBOW,
    lowAngle: 65,
    highAngle: 158,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Lower to the forehead, then lock out.',
  },

  /* ---- Back / pulling --------------------------------------------------- */
  {
    id: 'pull-ups',
    label: 'Pull-ups',
    joints: ELBOW,
    lowAngle: 65,
    highAngle: 160,
    countAt: 'high',
    cameraHint: 'Prop the phone a few steps away so your whole hang is in frame.',
    formHint: 'Chin over the bar, then a dead hang.',
  },
  {
    id: 'lat-pulldown',
    label: 'Lat Pulldown',
    joints: ELBOW,
    lowAngle: 65,
    highAngle: 160,
    countAt: 'high',
    cameraHint: FRONT_ON,
    formHint: 'Bar to the chest, then a full stretch up.',
  },
  {
    id: 'rows',
    label: 'Rows',
    joints: ELBOW,
    lowAngle: 70,
    highAngle: 155,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Pull to the ribs, then let the arms straighten.',
  },
  {
    id: 'face-pulls',
    label: 'Face Pulls',
    joints: ELBOW,
    lowAngle: 65,
    highAngle: 150,
    countAt: 'high',
    cameraHint: FRONT_ON,
    formHint: 'Pull to the face, then straighten the arms.',
  },
  {
    id: 'straight-arm-pulldown',
    label: 'Straight-Arm Pulldown',
    joints: SHOULDER,
    lowAngle: 25,
    highAngle: 130,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Arms overhead to the thighs, keeping them straight.',
  },
  {
    id: 'upright-row',
    label: 'Upright Row',
    joints: ELBOW,
    lowAngle: 75,
    highAngle: 155,
    countAt: 'high',
    cameraHint: FRONT_ON,
    formHint: 'Elbows to shoulder height, then straighten.',
  },

  /* ---- Biceps ----------------------------------------------------------- */
  {
    id: 'barbell-curl',
    label: 'Barbell Curl',
    joints: ELBOW,
    lowAngle: 55,
    highAngle: 150,
    countAt: 'high',
    cameraHint: FRONT_ON,
    formHint: 'Curl all the way up, then straighten the arm fully.',
  },
  {
    id: 'hammer-curl',
    label: 'Hammer Curl',
    joints: ELBOW,
    lowAngle: 55,
    highAngle: 150,
    countAt: 'high',
    cameraHint: FRONT_ON,
    formHint: 'Curl all the way up, then straighten the arm fully.',
  },
  {
    id: 'concentration-curl',
    label: 'Concentration Curl',
    joints: ELBOW,
    lowAngle: 50,
    highAngle: 150,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Squeeze at the top, then a full stretch at the bottom.',
  },
  {
    id: 'spider-curl',
    label: 'Spider Curl',
    joints: ELBOW,
    lowAngle: 50,
    highAngle: 150,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Squeeze at the top, then a full stretch at the bottom.',
  },
  {
    id: 'preacher-curl',
    label: 'Preacher Curl',
    joints: ELBOW,
    lowAngle: 50,
    highAngle: 150,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Squeeze at the top, then a full stretch at the bottom.',
  },
  {
    id: 'reverse-curl',
    label: 'Reverse Curl',
    joints: ELBOW,
    lowAngle: 55,
    highAngle: 150,
    countAt: 'high',
    cameraHint: FRONT_ON,
    formHint: 'Curl all the way up, then straighten the arm fully.',
  },

  /* ---- Shoulders -------------------------------------------------------- */
  {
    id: 'lateral-raises',
    label: 'Lateral Raises',
    joints: SHOULDER,
    lowAngle: 22,
    highAngle: 80,
    countAt: 'low',
    cameraHint: FRONT_ON,
    formHint: 'Up to shoulder height, then all the way down.',
  },
  {
    id: 'front-raises',
    label: 'Front Raises',
    joints: SHOULDER,
    lowAngle: 22,
    highAngle: 80,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Up to shoulder height, then all the way down.',
  },
  {
    id: 'rear-delt',
    label: 'Rear Delt Fly',
    joints: SHOULDER,
    lowAngle: 25,
    highAngle: 78,
    countAt: 'low',
    cameraHint: 'Prop the phone behind you at chest height.',
    formHint: 'Out to shoulder height, then all the way down.',
  },
  {
    id: 'dumbbell-pullover',
    label: 'Dumbbell Pullover',
    joints: SHOULDER,
    lowAngle: 80,
    highAngle: 155,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Stretch back over the head, then pull to over the chest.',
  },

  /* ---- Legs ------------------------------------------------------------- */
  {
    id: 'squat',
    label: 'Squat',
    joints: KNEE,
    lowAngle: 100,
    highAngle: 165,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Hips to at least parallel, then stand all the way up.',
  },
  {
    id: 'lunges',
    label: 'Lunges',
    joints: KNEE,
    lowAngle: 100,
    highAngle: 165,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Back knee toward the floor, then stand tall.',
  },
  {
    id: 'bulgarian-split-squat',
    label: 'Bulgarian Split Squat',
    joints: KNEE,
    lowAngle: 100,
    highAngle: 162,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Front thigh to parallel, then drive all the way up.',
  },
  {
    id: 'leg-press',
    label: 'Leg Press',
    joints: KNEE,
    lowAngle: 95,
    highAngle: 160,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Knees to ninety, then press out without locking hard.',
  },
  {
    id: 'leg-extension',
    label: 'Leg Extension',
    joints: KNEE,
    lowAngle: 95,
    highAngle: 165,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Straighten fully, then lower under control.',
  },
  {
    id: 'leg-curl',
    label: 'Leg Curl',
    joints: KNEE,
    lowAngle: 75,
    highAngle: 160,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Curl the heel in fully, then straighten.',
  },

  /* ---- Hinge ------------------------------------------------------------ */
  {
    id: 'deadlift',
    label: 'Deadlift',
    joints: HIP,
    lowAngle: 100,
    highAngle: 168,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Stand to a full hip lockout every rep.',
  },
  {
    id: 'romanian-deadlift',
    label: 'Romanian Deadlift',
    joints: HIP,
    lowAngle: 105,
    highAngle: 168,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Hinge until you feel the stretch, then lock the hips out.',
  },
  {
    id: 'good-morning',
    label: 'Good Morning',
    joints: HIP,
    lowAngle: 105,
    highAngle: 168,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Hinge to roughly parallel, then stand tall.',
  },
  {
    id: 'back-extension',
    label: 'Back Extension',
    joints: HIP,
    lowAngle: 110,
    highAngle: 168,
    countAt: 'high',
    cameraHint: SIDE_ON,
    formHint: 'Down under control, then up to a straight line.',
  },
  {
    id: 'hip-thrust',
    label: 'Hip Thrust',
    joints: HIP,
    lowAngle: 95,
    highAngle: 165,
    countAt: 'low',
    cameraHint: SIDE_ON,
    formHint: 'Squeeze to a full lockout at the top.',
  },

  /* ---- Core ------------------------------------------------------------- */
  {
    id: 'crunches',
    label: 'Crunches',
    joints: HIP,
    lowAngle: 112,
    highAngle: 148,
    countAt: 'high',
    cameraHint: FLOOR_SIDE,
    formHint: 'Shoulder blades off the floor, then back down.',
  },
  {
    id: 'leg-raises',
    label: 'Leg Raises',
    joints: HIP,
    lowAngle: 100,
    highAngle: 158,
    countAt: 'high',
    cameraHint: FLOOR_SIDE,
    formHint: 'Legs to vertical, then lower without touching down.',
  },
  {
    id: 'hanging-leg-raises',
    label: 'Hanging Leg Raises',
    joints: HIP,
    lowAngle: 100,
    highAngle: 160,
    countAt: 'high',
    cameraHint: 'Prop the phone a few steps away so your whole hang is in frame.',
    formHint: 'Knees or toes up high, then a full hang.',
  },
];

const BY_ID = new Map(POSE_REP_SPECS.map((spec) => [spec.id, spec]));

/**
 * Normalises a name for loose matching: lowercase, no punctuation, no spaces.
 * "Push-Ups" and "push ups" both become "pushups".
 */
function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

/** Kept as a list rather than a Map so it can be scanned for near matches. */
const BY_SLUG: { key: string; spec: PoseRepSpec }[] = POSE_REP_SPECS.map((spec) => ({
  key: slug(spec.label),
  spec,
}));

/**
 * Finds the spec for an exercise, by library id first and then by name.
 *
 * The name fallback is what makes custom exercises work: someone who adds
 * "Incline Push Ups" gets the push-up spec rather than nothing, because the
 * joint and the angles are the same movement either way.
 */
export function specForExercise(
  exerciseId: string | undefined,
  name?: string
): PoseRepSpec | null {
  if (exerciseId) {
    const direct = BY_ID.get(exerciseId);
    if (direct) return direct;
  }

  if (!name) return null;
  const key = slug(name);
  if (!key) return null;

  const exact = BY_SLUG.find((entry) => entry.key === key);
  if (exact) return exact.spec;

  // Longest containment wins, so "Incline Bench Press" prefers "Bench Press"
  // over a shorter accidental substring.
  let best: PoseRepSpec | null = null;
  let bestLength = 0;
  for (const { key: specKey, spec } of BY_SLUG) {
    if ((key.includes(specKey) || specKey.includes(key)) && specKey.length > bestLength) {
      best = spec;
      bestLength = specKey.length;
    }
  }
  return best;
}

/** True when the camera counter can be offered for this exercise. */
export function canCountWithPose(exerciseId: string | undefined, name?: string): boolean {
  return specForExercise(exerciseId, name) !== null;
}
