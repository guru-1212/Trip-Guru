import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { MuscleGroup, WorkoutExercise, WorkoutSession } from './types';
import { getExerciseTargets } from './muscleCoverage';

dayjs.extend(relativeTime);

/**
 * The 11 muscle groups the recovery map tracks. Kept in sync with
 * MUSCLE_ORDER in components/fittrack/MuscleRecoveryMap.tsx.
 */
export const RECOVERY_MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abs',
  'Forearms',
] as const;

export type RecoveryMuscle = (typeof RECOVERY_MUSCLES)[number];

export type RecoveryStatus = 'fatigued' | 'recovering' | 'recovered';

/**
 * Full-recovery window per muscle in hours, based on standard sports-science
 * norms (large groups need the most rest, small groups the least):
 *   Legs (Quads/Hamstrings/Glutes) 72h · Back/Chest ~60h · Shoulders 48h ·
 *   Arms (Biceps/Triceps)/Calves/Forearms ~36h · Abs 24h.
 */
export const RECOVERY_HOURS: Record<RecoveryMuscle, number> = {
  Chest: 60,
  Back: 60,
  Shoulders: 48,
  Biceps: 36,
  Triceps: 36,
  Quads: 72,
  Hamstrings: 72,
  Glutes: 72,
  Calves: 36,
  Abs: 24,
  Forearms: 36,
};

/** Fine anatomy region id (muscleAnatomy.json) → recovery muscle. */
const REGION_TO_RECOVERY: Record<string, RecoveryMuscle> = {
  'chest-upper': 'Chest',
  'chest-mid': 'Chest',
  'chest-lower': 'Chest',
  'front-delts': 'Shoulders',
  'side-delts': 'Shoulders',
  'rear-delts': 'Shoulders',
  traps: 'Back',
  lats: 'Back',
  'mid-back': 'Back',
  'lower-back': 'Back',
  biceps: 'Biceps',
  forearms: 'Forearms',
  'triceps-long': 'Triceps',
  'triceps-lateral': 'Triceps',
  'abs-upper': 'Abs',
  'abs-lower': 'Abs',
  obliques: 'Abs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Glutes',
  calves: 'Calves',
};

/** Coarse muscle group → recovery muscles, used when an exercise has no fine mapping. */
const GROUP_TO_RECOVERY: Record<MuscleGroup, RecoveryMuscle[]> = {
  Chest: ['Chest'],
  Back: ['Back'],
  Shoulders: ['Shoulders'],
  Triceps: ['Triceps'],
  Biceps: ['Biceps', 'Forearms'],
  Legs: ['Quads', 'Hamstrings', 'Glutes', 'Calves'],
  Core: ['Abs'],
};

export interface MuscleRecovery {
  name: RecoveryMuscle;
  status: RecoveryStatus;
  /** Percent recovered, 0–100. */
  recoveryPct: number;
  /** Hours remaining until fully recovered (0 once ready). */
  etaHours: number;
  /** Epoch ms when the muscle reaches 100% recovery (in the past once ready). */
  readyAt: number;
  /** Human-relative last-trained label, e.g. "2 days ago". */
  lastTrained?: string;
}

/** Recovery muscles a single logged exercise trains (primary + secondary). */
function musclesTrainedByExercise(ex: WorkoutExercise): RecoveryMuscle[] {
  const out = new Set<RecoveryMuscle>();
  const targets = getExerciseTargets(ex.exerciseId);
  for (const region of [...targets.primary, ...targets.secondary]) {
    const muscle = REGION_TO_RECOVERY[region];
    if (muscle) out.add(muscle);
  }
  // Custom / unmapped exercises fall back to their coarse muscle group.
  if (out.size === 0) {
    for (const muscle of GROUP_TO_RECOVERY[ex.muscle] ?? []) out.add(muscle);
  }
  return Array.from(out);
}

/** Epoch ms the session finished — real finish time, else end of the logged day. */
function sessionFinishMs(session: WorkoutSession): number {
  if (typeof session.completedAt === 'number') return session.completedAt;
  return dayjs(session.date).endOf('day').valueOf();
}

/**
 * Genuine per-muscle recovery: for each muscle, find the most recent session
 * that trained it and compute how far it has recovered over that muscle's
 * window. Muscles never trained read as fully recovered ("Ready").
 */
export function computeMuscleRecovery(
  workouts: WorkoutSession[]
): Record<string, MuscleRecovery> {
  const nowMs = dayjs().valueOf();

  // Precompute, once per session (newest first), the set of muscles it trained.
  const sessions = [...workouts]
    .map((w) => {
      const muscles = new Set<RecoveryMuscle>();
      for (const ex of w.exercises) {
        for (const m of musclesTrainedByExercise(ex)) muscles.add(m);
      }
      return { finish: sessionFinishMs(w), muscles };
    })
    .sort((a, b) => b.finish - a.finish);

  const result: Record<string, MuscleRecovery> = {};

  for (const muscle of RECOVERY_MUSCLES) {
    const last = sessions.find((s) => s.muscles.has(muscle));

    if (!last) {
      result[muscle] = {
        name: muscle,
        status: 'recovered',
        recoveryPct: 100,
        etaHours: 0,
        readyAt: nowMs,
      };
      continue;
    }

    const window = RECOVERY_HOURS[muscle];
    const hoursSince = Math.max(0, (nowMs - last.finish) / 3_600_000);
    const recoveryPct = Math.max(0, Math.min(100, (hoursSince / window) * 100));
    const etaHours = Math.max(0, window - hoursSince);
    const status: RecoveryStatus =
      recoveryPct >= 100 ? 'recovered' : recoveryPct >= 50 ? 'recovering' : 'fatigued';

    result[muscle] = {
      name: muscle,
      status,
      recoveryPct: Math.round(recoveryPct),
      etaHours,
      readyAt: last.finish + window * 3_600_000,
      lastTrained: dayjs(last.finish).fromNow(),
    };
  }

  return result;
}

/** "Ready" / "ready in ~5h" / "ready in ~2d 4h" label from remaining hours. */
export function formatRecoveryEta(hours: number): string {
  if (hours <= 0) return 'Ready';
  if (hours < 1) return 'ready in <1h';
  if (hours < 24) return `ready in ~${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `ready in ~${days}d ${rem}h` : `ready in ~${days}d`;
}

/**
 * Friendly absolute recovery time, e.g. "Ready now" / "Today, 3:24 PM" /
 * "Tomorrow, 3:24 PM" / "Wed, Jul 16 · 3:24 PM".
 */
export function formatRecoveryReadyAt(readyAt: number): string {
  const d = dayjs(readyAt);
  const now = dayjs();
  if (!d.isAfter(now)) return 'Ready now';
  const time = d.format('h:mm A');
  if (d.isSame(now, 'day')) return `Today, ${time}`;
  if (d.isSame(now.add(1, 'day'), 'day')) return `Tomorrow, ${time}`;
  return d.format('ddd, MMM D · h:mm A');
}

/** Compact absolute recovery time for tight rows: "Ready" / "Jul 16 · 3:24 PM". */
export function formatRecoveryReadyAtShort(readyAt: number): string {
  const d = dayjs(readyAt);
  if (!d.isAfter(dayjs())) return 'Ready';
  return d.format('MMM D · h:mm A');
}
