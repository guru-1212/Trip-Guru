import type { MobilityExercise, MobilityType, SplitId } from './types';

export const MOBILITY_LIBRARY: MobilityExercise[] = [
  // ── CHEST + TRICEPS warm-ups ──
  {
    id: 'arm-circles',
    name: 'Arm Circles',
    type: 'warmup',
    targetMuscles: ['Shoulders', 'Chest'],
    splitIds: ['ct', 'ctbb', 'sh', 'coresh'],
    variations: ['Small Forward', 'Large Forward', 'Small Backward', 'Large Backward'],
    repsLabel: '10 each direction',
    tips: ['Keep core braced', 'Gradually increase circle size', 'Move through full range without pain'],
  },
  {
    id: 'band-pull-aparts',
    name: 'Band Pull-Aparts',
    type: 'warmup',
    targetMuscles: ['Back', 'Shoulders'],
    splitIds: ['ct', 'ctbb', 'bb', 'sh'],
    variations: ['Light Band', 'Medium Band', 'Overhand Grip', 'Underhand Grip'],
    repsLabel: '15 reps',
    tips: ['Squeeze shoulder blades at end range', 'Keep elbows slightly bent', 'Control the return'],
  },
  {
    id: 'push-up-plus',
    name: 'Push-up Plus',
    type: 'warmup',
    targetMuscles: ['Chest', 'Shoulders'],
    splitIds: ['ct', 'ctbb'],
    variations: ['Knees', 'Standard', 'Incline Wall'],
    repsLabel: '10 reps',
    tips: ['Protract shoulder blades at top', 'Full scapular movement', 'Keep body in straight line'],
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic Rotation',
    type: 'warmup',
    targetMuscles: ['Back', 'Core'],
    splitIds: ['ct', 'ctbb', 'bb'],
    variations: ['Quadruped', 'Standing', 'Seated'],
    repsLabel: '8 each side',
    tips: ['Rotate through upper back only', 'Follow hand with eyes', 'Exhale on rotation'],
  },
  {
    id: 'tricep-pump',
    name: 'Tricep Activation',
    type: 'warmup',
    targetMuscles: ['Triceps'],
    splitIds: ['ct', 'ctbb'],
    variations: ['Overhead Reach', 'Band Pushdown', 'Bodyweight Dip Hold'],
    repsLabel: '12 reps',
    tips: ['Light resistance only', 'Full extension at bottom', 'Feel triceps engage before pressing'],
  },
  {
    id: 'chest-opener-dynamic',
    name: 'Dynamic Chest Opener',
    type: 'warmup',
    targetMuscles: ['Chest'],
    splitIds: ['ct', 'ctbb'],
    variations: ['Standing Swings', 'Wall Slide', 'Band Chest Fly'],
    repsLabel: '10 reps',
    tips: ['Open chest without arching lower back', 'Smooth controlled motion', 'Increase range gradually'],
  },

  // ── BACK + BICEPS warm-ups ──
  {
    id: 'cat-cow',
    name: 'Cat-Cow',
    type: 'warmup',
    targetMuscles: ['Back', 'Core'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Standard', 'Slow Tempo', 'Extended Hold'],
    repsLabel: '10 cycles',
    tips: ['Move segment by segment', 'Inhale on cow, exhale on cat', 'Feel each vertebra move'],
  },
  {
    id: 'scapular-pulls',
    name: 'Scapular Pulls',
    type: 'warmup',
    targetMuscles: ['Back'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Hanging', 'Band Assisted', 'Incline Row Hold'],
    repsLabel: '12 reps',
    tips: ['Depress and retract scapula', 'No elbow bend', 'Pause 1 sec at bottom'],
  },
  {
    id: 'band-rows-warmup',
    name: 'Band Rows',
    type: 'warmup',
    targetMuscles: ['Back', 'Biceps'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Seated', 'Standing', 'Single Arm'],
    repsLabel: '15 reps',
    tips: ['Pull elbows to hips', 'Squeeze lats at peak', 'Light band tension only'],
  },
  {
    id: 'dead-hang',
    name: 'Dead Hang',
    type: 'warmup',
    targetMuscles: ['Back', 'Biceps'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Passive', 'Active Shoulders', 'Mixed Grip'],
    durationSeconds: 20,
    repsLabel: '20 sec',
    tips: ['Relax into hang', 'Engage shoulders if active variation', 'Step down controlled'],
  },
  {
    id: 'bicep-curls-warmup',
    name: 'Bicep Activation',
    type: 'warmup',
    targetMuscles: ['Biceps'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Band Curls', 'Light Dumbbell', 'Hammer Grip'],
    repsLabel: '12 reps',
    tips: ['Full supination on concentric', 'No swinging', 'Prime biceps before heavy curls'],
  },

  // ── SHOULDERS warm-ups ──
  {
    id: 'ytw-raises',
    name: 'Y-T-W Raises',
    type: 'warmup',
    targetMuscles: ['Shoulders', 'Back'],
    splitIds: ['sh', 'coresh'],
    variations: ['Prone', 'Incline Bench', 'Standing Band'],
    repsLabel: '8 each position',
    tips: ['Thumbs up on Y raises', 'Pause at top', 'Light weight or bodyweight only'],
  },
  {
    id: 'band-external-rotation',
    name: 'Band External Rotation',
    type: 'warmup',
    targetMuscles: ['Shoulders'],
    splitIds: ['sh', 'coresh', 'ct', 'bb', 'ctbb'],
    variations: ['Elbow at Side', '90° Abduction', 'Low Anchor'],
    repsLabel: '12 each arm',
    tips: ['Keep elbow fixed', 'Rotate from shoulder', 'Control eccentric'],
  },
  {
    id: 'arm-swings',
    name: 'Arm Swings',
    type: 'warmup',
    targetMuscles: ['Shoulders'],
    splitIds: ['sh', 'coresh'],
    variations: ['Cross Body', 'Front to Back', 'Alternating'],
    repsLabel: '15 each',
    tips: ['Gradually increase range', 'Stay relaxed', 'Sync with breathing'],
  },
  {
    id: 'shoulder-circles',
    name: 'Shoulder Circles',
    type: 'warmup',
    targetMuscles: ['Shoulders'],
    splitIds: ['sh', 'coresh'],
    variations: ['Forward', 'Backward', 'Shrugs + Circles'],
    repsLabel: '10 each',
    tips: ['Big smooth circles', 'No neck tension', 'Warm deltoids before pressing'],
  },

  // ── LEGS warm-ups ──
  {
    id: 'leg-swings',
    name: 'Leg Swings',
    type: 'warmup',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Front to Back', 'Side to Side', 'Diagonal'],
    repsLabel: '12 each leg',
    tips: ['Hold support for balance', 'Swing through comfortable range', 'Increase height gradually'],
  },
  {
    id: 'bodyweight-squats-warmup',
    name: 'Bodyweight Squats',
    type: 'warmup',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Standard', 'Pause at Bottom', 'Calf Raise at Top'],
    repsLabel: '15 reps',
    tips: ['Knees track over toes', 'Chest up', 'Prime hip and knee joints'],
  },
  {
    id: 'hip-circles',
    name: 'Hip Circles',
    type: 'warmup',
    targetMuscles: ['Legs', 'Core'],
    splitIds: ['legs'],
    variations: ['Standing', 'Quadruped', 'Large Range'],
    repsLabel: '10 each direction',
    tips: ['Isolate hip movement', 'Keep upper body stable', 'Both directions'],
  },
  {
    id: 'ankle-rolls',
    name: 'Ankle Rolls',
    type: 'warmup',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Clockwise', 'Counter-clockwise', 'Knee Flexed'],
    repsLabel: '10 each ankle',
    tips: ['Full circle range', 'Prepare ankles for squats and lunges', 'Both feet equally'],
  },
  {
    id: 'walking-lunges-warmup',
    name: 'Walking Lunges',
    type: 'warmup',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Forward', 'Reverse', 'Lateral'],
    repsLabel: '8 each leg',
    tips: ['Short steps for warm-up', 'Torso upright', 'Feel hip flexor stretch at bottom'],
  },
  {
    id: 'glute-bridges-warmup',
    name: 'Glute Bridges',
    type: 'warmup',
    targetMuscles: ['Legs', 'Core'],
    splitIds: ['legs'],
    variations: ['Two Leg', 'Single Leg', 'Marching'],
    repsLabel: '12 reps',
    tips: ['Squeeze glutes at top', 'Don\'t hyperextend lower back', 'Activate before heavy squats'],
  },

  // ── CORE warm-ups ──
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    type: 'warmup',
    targetMuscles: ['Core'],
    splitIds: ['core', 'coresh'],
    variations: ['Alternating', 'Same Side', 'Band Resisted'],
    repsLabel: '10 each side',
    tips: ['Press lower back to floor', 'Opposite arm and leg', 'Slow controlled movement'],
  },
  {
    id: 'bird-dog',
    name: 'Bird Dog',
    type: 'warmup',
    targetMuscles: ['Core', 'Back'],
    splitIds: ['core', 'coresh'],
    variations: ['Standard', 'Hold 3 sec', 'With Reach'],
    repsLabel: '8 each side',
    tips: ['Neutral spine throughout', 'Reach long through fingertips', 'Avoid hip rotation'],
  },
  {
    id: 'plank-hold-warmup',
    name: 'Plank Hold',
    type: 'warmup',
    targetMuscles: ['Core'],
    splitIds: ['core', 'coresh'],
    variations: ['High Plank', 'Forearm Plank', 'Shoulder Taps'],
    durationSeconds: 30,
    repsLabel: '30 sec',
    tips: ['Brace like taking a punch', 'Glutes engaged', 'Breathe steadily'],
  },
  {
    id: 'hip-flexor-march',
    name: 'Hip Flexor March',
    type: 'warmup',
    targetMuscles: ['Core', 'Legs'],
    splitIds: ['core', 'coresh'],
    variations: ['Standing', 'Supine', 'Slow Tempo'],
    repsLabel: '12 each leg',
    tips: ['Drive knee to chest', 'Stand tall', 'Activate deep core'],
  },

  // ── CHEST + TRICEPS stretches ──
  {
    id: 'doorway-chest-stretch',
    name: 'Doorway Chest Stretch',
    type: 'stretch',
    targetMuscles: ['Chest'],
    splitIds: ['ct', 'ctbb'],
    variations: ['High Angle', 'Mid Angle', 'Low Angle'],
    durationSeconds: 30,
    repsLabel: '30 sec each',
    tips: ['Elbow at 90° on frame', 'Step forward gently', 'Don\'t force range'],
  },
  {
    id: 'tricep-overhead-stretch',
    name: 'Overhead Tricep Stretch',
    type: 'stretch',
    targetMuscles: ['Triceps'],
    splitIds: ['ct', 'ctbb'],
    variations: ['One Arm', 'Both Arms', 'With Towel Assist'],
    durationSeconds: 30,
    repsLabel: '30 sec each arm',
    tips: ['Reach hand down upper back', 'Gently pull elbow with other hand', 'Keep ribs down'],
  },
  {
    id: 'cross-body-shoulder-stretch',
    name: 'Cross-Body Shoulder Stretch',
    type: 'stretch',
    targetMuscles: ['Shoulders'],
    splitIds: ['ct', 'ctbb', 'sh', 'coresh'],
    variations: ['Standing', 'Seated', 'With Trap Release'],
    durationSeconds: 30,
    repsLabel: '30 sec each arm',
    tips: ['Pull arm across chest', 'Keep shoulder down', 'Breathe into stretch'],
  },
  {
    id: 'pec-minor-stretch',
    name: 'Pec Minor Stretch',
    type: 'stretch',
    targetMuscles: ['Chest', 'Shoulders'],
    splitIds: ['ct', 'ctbb'],
    variations: ['Wall Corner', 'Floor Angels', 'Foam Roller'],
    durationSeconds: 30,
    repsLabel: '30 sec',
    tips: ['Arm elevated on wall', 'Lean forward slightly', 'Feel stretch near armpit'],
  },

  // ── BACK + BICEPS stretches ──
  {
    id: 'lat-stretch',
    name: 'Lat Stretch',
    type: 'stretch',
    targetMuscles: ['Back'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Kneeling Reach', 'Hanging', 'Side Bend'],
    durationSeconds: 30,
    repsLabel: '30 sec each side',
    tips: ['Reach long to opposite side', 'Feel stretch along lats', 'Relax into position'],
  },
  {
    id: 'bicep-wall-stretch',
    name: 'Bicep Wall Stretch',
    type: 'stretch',
    targetMuscles: ['Biceps'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Palm Forward', 'Palm Back', 'High vs Low Hand'],
    durationSeconds: 30,
    repsLabel: '30 sec each arm',
    tips: ['Fingers point down or back on wall', 'Rotate body away gently', 'Straight arm'],
  },
  {
    id: 'childs-pose',
    name: "Child's Pose",
    type: 'stretch',
    targetMuscles: ['Back', 'Core'],
    splitIds: ['bb', 'ctbb', 'core', 'coresh'],
    variations: ['Wide Knees', 'Arms Extended', 'Side Reach'],
    durationSeconds: 45,
    repsLabel: '45 sec',
    tips: ['Sit hips back to heels', 'Relax shoulders', 'Breathe deeply into back'],
  },
  {
    id: 'forearm-stretch',
    name: 'Forearm Stretch',
    type: 'stretch',
    targetMuscles: ['Biceps'],
    splitIds: ['bb', 'ctbb'],
    variations: ['Flexor Stretch', 'Extensor Stretch', 'Prayer Position'],
    durationSeconds: 25,
    repsLabel: '25 sec each',
    tips: ['Straight elbow', 'Gentle pressure on fingers', 'Good after pulling work'],
  },

  // ── SHOULDERS stretches ──
  {
    id: 'levator-stretch',
    name: 'Levator Scapulae Stretch',
    type: 'stretch',
    targetMuscles: ['Shoulders'],
    splitIds: ['sh', 'coresh'],
    variations: ['Seated', 'Standing', 'With Chin Tuck'],
    durationSeconds: 30,
    repsLabel: '30 sec each side',
    tips: ['Turn head 45° to armpit', 'Gently pull head down', 'Opposite shoulder stays down'],
  },
  {
    id: 'trap-stretch',
    name: 'Upper Trap Stretch',
    type: 'stretch',
    targetMuscles: ['Shoulders'],
    splitIds: ['sh', 'coresh'],
    variations: ['Ear to Shoulder', 'Behind Back', 'With Weight Assist'],
    durationSeconds: 30,
    repsLabel: '30 sec each side',
    tips: ['Tilt ear toward shoulder', 'Don\'t hike shoulder up', 'Hold steady'],
  },
  {
    id: 'sleeper-stretch',
    name: 'Sleeper Stretch',
    type: 'stretch',
    targetMuscles: ['Shoulders'],
    splitIds: ['sh', 'coresh'],
    variations: ['Floor', 'On Bench', 'Gentle Pressure'],
    durationSeconds: 30,
    repsLabel: '30 sec each arm',
    tips: ['Lie on side', 'Push hand toward floor', 'Keep shoulder blade pinned'],
  },

  // ── LEGS stretches ──
  {
    id: 'quad-stretch',
    name: 'Standing Quad Stretch',
    type: 'stretch',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Standing', 'Side Lying', 'With Wall Support'],
    durationSeconds: 30,
    repsLabel: '30 sec each leg',
    tips: ['Knees together', 'Tuck pelvis under', 'Hold ankle not foot'],
  },
  {
    id: 'hamstring-stretch',
    name: 'Hamstring Stretch',
    type: 'stretch',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Seated Reach', 'Standing Hinge', 'Lying Strap'],
    durationSeconds: 30,
    repsLabel: '30 sec each leg',
    tips: ['Hinge from hips', 'Flat back', 'Don\'t bounce'],
  },
  {
    id: 'pigeon-stretch',
    name: 'Pigeon Stretch',
    type: 'stretch',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Standard', 'Reclined', 'Elevated Front Leg'],
    durationSeconds: 45,
    repsLabel: '45 sec each side',
    tips: ['Shin parallel if possible', 'Square hips', 'Fold forward for deeper stretch'],
  },
  {
    id: 'calf-wall-stretch',
    name: 'Calf Wall Stretch',
    type: 'stretch',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Straight Leg', 'Bent Knee', 'Step Back Deep'],
    durationSeconds: 30,
    repsLabel: '30 sec each leg',
    tips: ['Heel down on floor', 'Lean into wall', 'Bent knee hits soleus'],
  },
  {
    id: 'hip-flexor-lunge-stretch',
    name: 'Hip Flexor Lunge Stretch',
    type: 'stretch',
    targetMuscles: ['Legs', 'Core'],
    splitIds: ['legs', 'core', 'coresh'],
    variations: ['Half Kneeling', 'With Overhead Reach', 'Bench Supported'],
    durationSeconds: 30,
    repsLabel: '30 sec each side',
    tips: ['Tuck pelvis', 'Squeeze glute on back leg', 'Don\'t arch lower back'],
  },
  {
    id: 'figure-four-stretch',
    name: 'Figure-Four Stretch',
    type: 'stretch',
    targetMuscles: ['Legs'],
    splitIds: ['legs'],
    variations: ['Supine', 'Seated', 'Standing'],
    durationSeconds: 30,
    repsLabel: '30 sec each side',
    tips: ['Ankle on opposite knee', 'Pull thigh toward chest', 'Glute and piriformis release'],
  },

  // ── CORE stretches ──
  {
    id: 'cobra-stretch',
    name: 'Cobra Stretch',
    type: 'stretch',
    targetMuscles: ['Core', 'Back'],
    splitIds: ['core', 'coresh'],
    variations: ['Low Cobra', 'Full Cobra', 'Active Press'],
    durationSeconds: 30,
    repsLabel: '30 sec',
    tips: ['Hips stay on floor', 'Open chest gently', 'No pain in lower back'],
  },
  {
    id: 'seated-spinal-twist',
    name: 'Seated Spinal Twist',
    type: 'stretch',
    targetMuscles: ['Core', 'Back'],
    splitIds: ['core', 'coresh'],
    variations: ['Standard', 'Cross Leg', 'With Reach'],
    durationSeconds: 30,
    repsLabel: '30 sec each side',
    tips: ['Sit tall before rotating', 'Use arm on knee for leverage', 'Exhale deeper into twist'],
  },
  {
    id: 'side-bend-stretch',
    name: 'Standing Side Bend',
    type: 'stretch',
    targetMuscles: ['Core'],
    splitIds: ['core', 'coresh'],
    variations: ['Overhead Reach', 'Hand on Hip', 'Kneeling'],
    durationSeconds: 25,
    repsLabel: '25 sec each side',
    tips: ['Reach up and over', 'Don\'t lean forward', 'Feel oblique stretch'],
  },
];

function dedupeById(exercises: MobilityExercise[]): MobilityExercise[] {
  const seen = new Set<string>();
  return exercises.filter((ex) => {
    if (seen.has(ex.id)) return false;
    seen.add(ex.id);
    return true;
  });
}

export function getMobilityForSplit(splitId: SplitId, type: MobilityType): MobilityExercise[] {
  if (splitId === 'rest') return [];
  return MOBILITY_LIBRARY.filter((ex) => ex.type === type && ex.splitIds.includes(splitId));
}

export function getWarmupForSplit(splitId: SplitId): MobilityExercise[] {
  return getMobilityForSplit(splitId, 'warmup');
}

export function getStretchForSplit(splitId: SplitId): MobilityExercise[] {
  return getMobilityForSplit(splitId, 'stretch');
}

export function getMobilityById(id: string): MobilityExercise | undefined {
  return MOBILITY_LIBRARY.find((ex) => ex.id === id);
}

export function getAllMobilityExercises(type?: MobilityType): MobilityExercise[] {
  const list = type ? MOBILITY_LIBRARY.filter((ex) => ex.type === type) : MOBILITY_LIBRARY;
  return dedupeById(list);
}

export function groupMobilityByMuscle(
  exercises: MobilityExercise[]
): { muscle: string; exercises: MobilityExercise[] }[] {
  const groups = new Map<string, MobilityExercise[]>();
  for (const ex of exercises) {
    const muscle = ex.targetMuscles[0] ?? 'Other';
    const list = groups.get(muscle) ?? [];
    list.push(ex);
    groups.set(muscle, list);
  }
  const order = ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core', 'Other'];
  return order
    .filter((m) => groups.has(m))
    .map((muscle) => ({ muscle, exercises: groups.get(muscle)! }));
}

/**
 * Combined splits without their own mobility tags merge their components'
 * routines without duplicates (coresh has explicit tags in the library).
 */
const MERGED_MOBILITY_SPLITS: Partial<Record<SplitId, SplitId[]>> = {
  ctbb: ['ct', 'bb'],
  legsh: ['legs', 'sh'],
};

export function getWarmupForSplitMerged(splitId: SplitId): MobilityExercise[] {
  const components = MERGED_MOBILITY_SPLITS[splitId];
  if (components) {
    return dedupeById(components.flatMap((c) => getWarmupForSplit(c)));
  }
  return getWarmupForSplit(splitId);
}

export function getStretchForSplitMerged(splitId: SplitId): MobilityExercise[] {
  const components = MERGED_MOBILITY_SPLITS[splitId];
  if (components) {
    return dedupeById(components.flatMap((c) => getStretchForSplit(c)));
  }
  return getStretchForSplit(splitId);
}
