import dayjs from 'dayjs';
import { BODY_FRONT, BODY_BACK, FRONT_VIEWBOX, BACK_VIEWBOX } from './bodyPaths';
import { getExerciseTargets } from './muscleCoverage';
import { getWorkoutsInRange } from './utils';
import type { CustomExercise, MuscleGroup, WorkoutSession } from './types';

export type BodyView = 'front' | 'back';

// Artwork region (bodyPaths slug) → our sub-muscle ids. Mirrors MuscleBodyMap.
const REGION_SUBMUSCLES: Record<string, string[]> = {
  chest: ['chest-upper', 'chest-mid', 'chest-lower'],
  abs: ['abs-upper', 'abs-lower'],
  obliques: ['obliques'],
  biceps: ['biceps'],
  triceps: ['triceps-long', 'triceps-lateral'],
  trapezius: ['traps'],
  adductors: ['adductors'],
  quadriceps: ['quads'],
  tibialis: ['calves'],
  calves: ['calves'],
  forearm: ['forearms'],
  'upper-back': ['lats', 'mid-back'],
  'lower-back': ['lower-back'],
  gluteal: ['glutes'],
  hamstring: ['hamstrings'],
};

const NEUTRAL = new Set(['head', 'hair', 'neck', 'hands', 'ankles', 'feet', 'knees']);
const NEUTRAL_FILL = '#e5e7eb';
const HAIR_FILL = '#cbd2da';
const IDLE_FILL = '#d3d8de';
const STROKE = '#9aa2ad';

const GROUP_ORDER: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];

function regionSubs(slug: string, view: BodyView): string[] {
  if (slug === 'deltoids') return view === 'front' ? ['front-delts', 'side-delts'] : ['rear-delts', 'side-delts'];
  return REGION_SUBMUSCLES[slug] ?? [];
}

/** Weighted set-involvement score per sub-muscle across the given sessions. */
function subMuscleScores(sessions: WorkoutSession[], customExercises: CustomExercise[]): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const w of sessions) {
    for (const ex of w.exercises) {
      const done = ex.sets.filter((s) => s.done).length;
      if (!done) continue;
      const t = getExerciseTargets(ex.exerciseId, customExercises);
      t.primary.forEach((m) => (scores[m] = (scores[m] ?? 0) + done));
      t.secondary.forEach((m) => (scores[m] = (scores[m] ?? 0) + done * 0.4));
    }
  }
  return scores;
}

export interface BodyDistribution {
  frontIntensity: Record<string, number>;
  backIntensity: Record<string, number>;
  total: number;
  groups: { group: MuscleGroup; sets: number }[];
  /** Mon..Sun — true when a workout was logged that day. */
  daysWorked: boolean[];
  sessionCount: number;
}

export function computeBodyDistribution(
  weekStartKey: string,
  workouts: WorkoutSession[],
  customExercises: CustomExercise[]
): BodyDistribution {
  const weekEndKey = dayjs(weekStartKey).add(6, 'day').format('YYYY-MM-DD');
  const sessions = getWorkoutsInRange(workouts, weekStartKey, weekEndKey);
  const scores = subMuscleScores(sessions, customExercises);

  const rawFront: Record<string, number> = {};
  const rawBack: Record<string, number> = {};
  let globalMax = 0;
  for (const [regions, raw, view] of [
    [BODY_FRONT, rawFront, 'front'],
    [BODY_BACK, rawBack, 'back'],
  ] as const) {
    for (const region of regions) {
      if (NEUTRAL.has(region.slug)) continue;
      const subs = regionSubs(region.slug, view);
      const score = subs.length ? Math.max(...subs.map((m) => scores[m] ?? 0)) : 0;
      raw[region.slug] = score;
      if (score > globalMax) globalMax = score;
    }
  }
  const norm = (r: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(r)) out[k] = globalMax > 0 ? v / globalMax : 0;
    return out;
  };

  // Set counts by coarse group (each exercise's done-sets counted once).
  const byGroup: Record<string, number> = {};
  let total = 0;
  const worked = [false, false, false, false, false, false, false];
  for (const w of sessions) {
    const idx = dayjs(w.date).diff(dayjs(weekStartKey), 'day');
    if (idx >= 0 && idx < 7) worked[idx] = true;
    for (const ex of w.exercises) {
      const done = ex.sets.filter((s) => s.done).length;
      byGroup[ex.muscle] = (byGroup[ex.muscle] ?? 0) + done;
      total += done;
    }
  }

  return {
    frontIntensity: norm(rawFront),
    backIntensity: norm(rawBack),
    total,
    groups: GROUP_ORDER.map((g) => ({ group: g, sets: byGroup[g] ?? 0 })),
    daysWorked: worked,
    sessionCount: sessions.length,
  };
}

// ── SVG rendering (used both on-screen and inside the html2canvas share card) ──
function lerpHex(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function fillForIntensity(intensity: number): string {
  if (intensity <= 0) return IDLE_FILL;
  const t = Math.max(0.2, Math.min(1, intensity));
  return lerpHex('#bfdbfe', '#1d4ed8', t);
}

/** Serialize a body view to an SVG string with muscles shaded by intensity. */
export function buildBodySvg(view: BodyView, intensity: Record<string, number>): string {
  const regions = view === 'front' ? BODY_FRONT : BODY_BACK;
  const viewBox = view === 'front' ? FRONT_VIEWBOX : BACK_VIEWBOX;
  const [, , vbW, vbH] = viewBox.split(' ');
  const body = regions
    .map((region) => {
      const fill = NEUTRAL.has(region.slug)
        ? region.slug === 'hair'
          ? HAIR_FILL
          : NEUTRAL_FILL
        : fillForIntensity(intensity[region.slug] ?? 0);
      return region.paths
        .map((d) => `<path d="${d}" fill="${fill}" stroke="${STROKE}" stroke-width="2"/>`)
        .join('');
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW}" height="${vbH}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}

export function bodySvgDataUrl(view: BodyView, intensity: Record<string, number>): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildBodySvg(view, intensity))}`;
}
