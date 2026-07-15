import dayjs from 'dayjs';
import type {
  BodyStat,
  HabitDay,
  PersonalRecord,
  ProgressPhoto,
  UserProfile,
  WeeklyGoals,
  WorkoutSession,
} from './types';
import { MUSCLE_COLORS, SPLIT_NAMES } from './constants';
import {
  displayWeight,
  formatWeight,
  getTrackingWeekRangeLabel,
  getWorkoutsInRange,
  isPR,
} from './utils';
import { getHabitStreak } from './analytics';
import { formatMl } from '@/lib/water/waterUtils';
import type { WaterLogDoc } from '@/types/water';
import type { NutrientsPerServing, NutritionLogDoc } from '@/types/nutrition';

export type RecapScope = 'day' | 'week';
export type RecapTheme = 'light' | 'dark' | 'transparent';

// ── shared sub-shapes ───────────────────────────────────────────────
export interface RecapChip {
  label: string;
  value: string;
}
export interface RecapRing {
  label: string;
  pct: number;
  sub: string;
  color: string;
}
export interface RecapMacro {
  label: string;
  value: number;
  target: number;
  pct: number;
  unit: string;
  color: string;
}
export interface RecapExLine {
  name: string;
  detail: string;
  pr?: boolean;
}
export interface RadarAxis {
  label: string;
  /** 0..1 normalized against the strongest axis. */
  value: number;
}
export interface RecapSparkPoint {
  value: number;
}

export interface RecapMeta {
  athleteName: string;
  handle: string;
  scope: RecapScope;
  dateLabel: string;
  accent: string;
}

export type RecapCardData = { id: string } & RecapMeta &
  (
    | {
        type: 'overview';
        durationLabel: string;
        volumeLabel: string;
        sets: number;
        radar: RadarAxis[];
        hasData: boolean;
      }
    | { type: 'comparison'; volumeLabel: string; objectLabel: string; emoji: string }
    | {
        type: 'workout';
        headline: string;
        durationLabel: string;
        volumeLabel: string;
        exercisesCount: number;
        sets: number;
        prCount: number;
        exercises: RecapExLine[];
        empty: boolean;
      }
    | {
        type: 'weight';
        current: string;
        target: string;
        deltaLabel: string;
        deltaDir: 'up' | 'down' | 'flat';
        toGoalLabel: string;
        points: number[];
        empty: boolean;
      }
    | { type: 'water'; totalLabel: string; goalLabel: string; pct: number; sub: string; empty: boolean }
    | {
        type: 'nutrition';
        calories: number;
        calorieTarget: number;
        macros: RecapMacro[];
        sub: string;
        empty: boolean;
      }
    | { type: 'habits'; rings: RecapRing[]; sub: string }
    | { type: 'photo'; dataUrl: string | null; caption: string; count: number }
  );

export interface RecapInput {
  scope: RecapScope;
  /** Day scope: the day key. Week scope: the Monday (week-start) key. */
  dateKey: string;
  profile: UserProfile;
  workouts: WorkoutSession[];
  prs: Record<string, PersonalRecord>;
  bodyStats: BodyStat[];
  habits: Record<string, HabitDay>;
  weeklyGoals: WeeklyGoals;
  progressPhotos: ProgressPhoto[];
  water: Record<string, WaterLogDoc>;
  nutrition: Record<string, NutritionLogDoc>;
  photoDataUrl: string | null;
}

const HABIT_META: { key: keyof HabitDay; label: string; color: string }[] = [
  { key: 'workout', label: 'Workout', color: '#6366f1' },
  { key: 'water', label: 'Water', color: '#06b6d4' },
  { key: 'sleep', label: 'Sleep', color: '#8b5cf6' },
  { key: 'protein', label: 'Protein', color: '#22c55e' },
  { key: 'steps', label: 'Steps', color: '#f59e0b' },
];

// Radar axes (Hevy-style): 6 muscle groups. Biceps + Triceps → "Arms".
const RADAR_AXES: { label: string; muscles: string[] }[] = [
  { label: 'Chest', muscles: ['Chest'] },
  { label: 'Back', muscles: ['Back'] },
  { label: 'Shoulders', muscles: ['Shoulders'] },
  { label: 'Arms', muscles: ['Biceps', 'Triceps'] },
  { label: 'Legs', muscles: ['Legs'] },
  { label: 'Core', muscles: ['Core'] },
];

const COMPARISONS: { min: number; label: string; emoji: string }[] = [
  { min: 150000, label: 'a blue whale', emoji: '🐋' },
  { min: 40000, label: 'an airplane', emoji: '✈️' },
  { min: 12000, label: 'a truck', emoji: '🚚' },
  { min: 5000, label: 'a helicopter', emoji: '🚁' },
  { min: 2500, label: 'a rhino', emoji: '🦏' },
  { min: 1200, label: 'a car', emoji: '🚗' },
  { min: 700, label: 'a grand piano', emoji: '🎹' },
  { min: 300, label: 'a horse', emoji: '🐴' },
  { min: 120, label: 'a panda', emoji: '🐼' },
  { min: 0, label: 'a bag of groceries', emoji: '🛒' },
];

// ── helpers ─────────────────────────────────────────────────────────
function deriveHandle(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return clean ? `@${clean}` : '@athlete';
}

function dayKeysOfWeek(weekStartKey: string): string[] {
  const start = dayjs(weekStartKey);
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
}

function bestDoneSet(sets: WorkoutSession['exercises'][number]['sets']) {
  const done = sets.filter((s) => s.done && s.weight > 0 && s.reps > 0);
  if (!done.length) return null;
  return done.reduce((best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best));
}

function buildExerciseLines(
  sessions: WorkoutSession[],
  prs: Record<string, PersonalRecord>,
  unit: 'kg' | 'lbs',
  limit: number
): RecapExLine[] {
  return sessions
    .flatMap((w) => w.exercises)
    .map((ex) => {
      const best = bestDoneSet(ex.sets);
      if (!best) return null;
      const doneCount = ex.sets.filter((s) => s.done).length;
      const pr = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));
      return {
        name: ex.name,
        detail: `${doneCount} sets · ${formatWeight(best.weight, unit)} × ${best.reps}`,
        pr,
        score: best.weight * best.reps,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ name, detail, pr }) => ({ name, detail, pr }));
}

function prCountForSessions(sessions: WorkoutSession[], prs: Record<string, PersonalRecord>): number {
  return sessions.filter((w) =>
    w.exercises.some((ex) => ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs)))
  ).length;
}

function muscleRadar(sessions: WorkoutSession[]): RadarAxis[] {
  const totals: Record<string, number> = {};
  for (const w of sessions) {
    for (const ex of w.exercises) {
      const vol = ex.sets.filter((s) => s.done).reduce((s, set) => s + set.weight * set.reps, 0);
      totals[ex.muscle] = (totals[ex.muscle] ?? 0) + vol;
    }
  }
  const axisValues = RADAR_AXES.map((a) => a.muscles.reduce((s, m) => s + (totals[m] ?? 0), 0));
  const max = Math.max(1, ...axisValues);
  return RADAR_AXES.map((a, i) => ({ label: a.label, value: axisValues[i] / max }));
}

function comparisonFor(volumeKg: number): { objectLabel: string; emoji: string } {
  const hit = COMPARISONS.find((c) => volumeKg >= c.min) ?? COMPARISONS[COMPARISONS.length - 1];
  return { objectLabel: hit.label, emoji: hit.emoji };
}

function totalDuration(sessions: WorkoutSession[]): number {
  return sessions.reduce((s, w) => s + w.duration, 0);
}
function totalVolume(sessions: WorkoutSession[]): number {
  return sessions.reduce((s, w) => s + w.totalVolume, 0);
}
function totalSets(sessions: WorkoutSession[]): number {
  return sessions.reduce((s, w) => s + w.totalSets, 0);
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function sumMacro(logs: NutritionLogDoc[], pick: (n: NutrientsPerServing) => number): number {
  return logs.reduce((s, l) => s + pick(l.totals), 0);
}

// ── main builder ────────────────────────────────────────────────────
export function buildRecap(input: RecapInput): RecapCardData[] {
  return input.scope === 'day' ? buildDayRecap(input) : buildWeekRecap(input);
}

function buildDayRecap(input: RecapInput): RecapCardData[] {
  const { dateKey, profile, workouts, prs, bodyStats, habits, weeklyGoals } = input;
  const unit = profile.prefs.unit;
  const sessions = workouts.filter((w) => w.date === dateKey);
  const meta: RecapMeta = {
    athleteName: profile.name || 'Athlete',
    handle: deriveHandle(profile.name || 'athlete'),
    scope: 'day',
    dateLabel: dayjs(dateKey).format('ddd, MMM D, YYYY'),
    accent: '#6366f1',
  };
  return assemble(input, meta, sessions, unit, weeklyGoals, dateKey, dateKey, bodyStats, habits, prs, [dateKey]);
}

function buildWeekRecap(input: RecapInput): RecapCardData[] {
  const { dateKey, profile, workouts, prs, bodyStats, habits, weeklyGoals } = input;
  const unit = profile.prefs.unit;
  const weekEndKey = dayjs(dateKey).add(6, 'day').format('YYYY-MM-DD');
  const sessions = getWorkoutsInRange(workouts, dateKey, weekEndKey);
  const meta: RecapMeta = {
    athleteName: profile.name || 'Athlete',
    handle: deriveHandle(profile.name || 'athlete'),
    scope: 'week',
    dateLabel: getTrackingWeekRangeLabel(dateKey),
    accent: '#6366f1',
  };
  return assemble(
    input,
    meta,
    sessions,
    unit,
    weeklyGoals,
    weekEndKey,
    dateKey,
    bodyStats,
    habits,
    prs,
    dayKeysOfWeek(dateKey)
  );
}

function assemble(
  input: RecapInput,
  meta: RecapMeta,
  sessions: WorkoutSession[],
  unit: 'kg' | 'lbs',
  weeklyGoals: WeeklyGoals,
  weightAsOfKey: string,
  photoRefKey: string,
  bodyStats: BodyStat[],
  habits: Record<string, HabitDay>,
  prs: Record<string, PersonalRecord>,
  dayKeys: string[]
): RecapCardData[] {
  const cards: RecapCardData[] = [];
  const vol = totalVolume(sessions);
  const waterLogs = dayKeys.map((k) => input.water[k]).filter(Boolean) as WaterLogDoc[];
  const nutLogs = dayKeys.map((k) => input.nutrition[k]).filter(Boolean) as NutritionLogDoc[];

  // 1) Overview (stats + muscle radar)
  cards.push({
    id: 'overview',
    ...meta,
    type: 'overview',
    durationLabel: formatDuration(totalDuration(sessions)),
    volumeLabel: formatWeight(vol, unit),
    sets: totalSets(sessions),
    radar: muscleRadar(sessions),
    hasData: sessions.length > 0,
  });

  // 2) Fun comparison (only when something was lifted)
  if (vol > 0) {
    const c = comparisonFor(vol);
    cards.push({ id: 'comparison', ...meta, type: 'comparison', volumeLabel: formatWeight(vol, unit), ...c });
  }

  // 3) Workout details
  const splitNames = Array.from(new Set(sessions.map((s) => SPLIT_NAMES[s.splitId] ?? s.splitName)));
  cards.push({
    id: 'workout',
    ...meta,
    type: 'workout',
    headline: splitNames.length ? splitNames.join(' + ') : 'Rest day',
    durationLabel: formatDuration(totalDuration(sessions)),
    volumeLabel: formatWeight(vol, unit),
    exercisesCount: sessions.reduce((s, w) => s + w.exercises.length, 0),
    sets: totalSets(sessions),
    prCount: prCountForSessions(sessions, prs),
    exercises: buildExerciseLines(sessions, prs, unit, 6),
    empty: sessions.length === 0,
  });

  // 4) Weight
  cards.push(buildWeightCard(meta, bodyStats, weeklyGoals.targetWeight, unit, weightAsOfKey));

  // 5) Nutrition
  cards.push(buildNutritionCard(meta, nutLogs));

  // 6) Water
  cards.push(meta.scope === 'day' ? buildWaterCardDay(meta, waterLogs[0]) : buildWaterCardWeek(meta, waterLogs));

  // 7) Habits
  cards.push(meta.scope === 'day' ? buildHabitsCardDay(meta, habits, dayKeys[0]) : buildHabitsCardWeek(meta, habits, dayKeys));

  // 8) Progress photo
  cards.push(buildPhotoCard(input, meta, photoRefKey));

  return cards;
}

// ── per-card builders ───────────────────────────────────────────────
function buildWeightCard(
  meta: RecapMeta,
  bodyStats: BodyStat[],
  targetKg: number | undefined,
  unit: 'kg' | 'lbs',
  asOfKey: string
): RecapCardData {
  const onOrBefore = [...bodyStats].filter((s) => s.date <= asOfKey).sort((a, b) => b.date.localeCompare(a.date));
  const latest = onOrBefore[0] ?? [...bodyStats].sort((a, b) => b.date.localeCompare(a.date))[0];
  const points = [...bodyStats]
    .filter((s) => s.date <= asOfKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((s) => Math.round(displayWeight(s.weight, unit) * 10) / 10);

  if (!latest) {
    return {
      id: 'weight',
      ...meta,
      type: 'weight',
      current: '—',
      target: targetKg ? formatWeight(targetKg, unit) : '—',
      deltaLabel: '—',
      deltaDir: 'flat',
      toGoalLabel: 'Log a weigh-in to track',
      points: [],
      empty: true,
    };
  }

  const oldest = onOrBefore[onOrBefore.length - 1] ?? latest;
  const delta = Math.round((displayWeight(latest.weight, unit) - displayWeight(oldest.weight, unit)) * 10) / 10;
  const toGoal =
    targetKg != null
      ? Math.round((displayWeight(latest.weight, unit) - displayWeight(targetKg, unit)) * 10) / 10
      : null;

  return {
    id: 'weight',
    ...meta,
    type: 'weight',
    current: formatWeight(latest.weight, unit),
    target: targetKg != null ? formatWeight(targetKg, unit) : '—',
    deltaLabel: `${delta > 0 ? '+' : ''}${delta} ${unit}`,
    deltaDir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    toGoalLabel:
      toGoal == null
        ? 'Set a goal weight'
        : toGoal === 0
          ? 'At your goal 🎯'
          : `${Math.abs(toGoal)} ${unit} ${toGoal > 0 ? 'above' : 'below'} goal`,
    points,
    empty: false,
  };
}

function buildNutritionCard(meta: RecapMeta, logs: NutritionLogDoc[]): RecapCardData {
  if (!logs.length) {
    return { id: 'nutrition', ...meta, type: 'nutrition', calories: 0, calorieTarget: 0, macros: [], sub: 'No meals logged', empty: true };
  }
  const div = meta.scope === 'week' ? logs.length : 1;
  const cal = Math.round(sumMacro(logs, (n) => n.calories) / div);
  const protein = Math.round(sumMacro(logs, (n) => n.proteinG) / div);
  const carbs = Math.round(sumMacro(logs, (n) => n.carbsG) / div);
  const fat = Math.round(sumMacro(logs, (n) => n.fatG) / div);
  const t = logs[logs.length - 1].targets;
  const mk = (label: string, value: number, target: number, color: string): RecapMacro => ({
    label,
    value,
    target: Math.round(target),
    pct: target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0,
    unit: 'g',
    color,
  });
  return {
    id: 'nutrition',
    ...meta,
    type: 'nutrition',
    calories: cal,
    calorieTarget: Math.round(t.calories),
    macros: [
      mk('Protein', protein, t.proteinG, '#22c55e'),
      mk('Carbs', carbs, t.carbsG, '#f59e0b'),
      mk('Fat', fat, t.fatG, '#f43f5e'),
    ],
    sub: meta.scope === 'week' ? `Avg / day · ${logs.length} day${logs.length === 1 ? '' : 's'} logged` : 'Today',
    empty: false,
  };
}

function buildWaterCardDay(meta: RecapMeta, doc: WaterLogDoc | undefined): RecapCardData {
  if (!doc) return { id: 'water', ...meta, type: 'water', totalLabel: '0 ml', goalLabel: '—', pct: 0, sub: 'No water logged', empty: true };
  const pct = doc.goalMl > 0 ? Math.min(100, Math.round((doc.totalMl / doc.goalMl) * 100)) : 0;
  const remaining = Math.max(0, doc.goalMl - doc.totalMl);
  return {
    id: 'water',
    ...meta,
    type: 'water',
    totalLabel: formatMl(doc.totalMl),
    goalLabel: formatMl(doc.goalMl),
    pct,
    sub: pct >= 100 ? 'Goal reached 🎉' : `${formatMl(remaining)} to go`,
    empty: false,
  };
}

function buildWaterCardWeek(meta: RecapMeta, logs: WaterLogDoc[]): RecapCardData {
  if (!logs.length) return { id: 'water', ...meta, type: 'water', totalLabel: '0 ml', goalLabel: '—', pct: 0, sub: 'No water logged', empty: true };
  const avg = Math.round(logs.reduce((s, l) => s + l.totalMl, 0) / 7);
  const goalAvg = Math.round(logs.reduce((s, l) => s + l.goalMl, 0) / logs.length);
  const daysHit = logs.filter((l) => l.completed).length;
  return {
    id: 'water',
    ...meta,
    type: 'water',
    totalLabel: formatMl(avg),
    goalLabel: `${formatMl(goalAvg)}/day`,
    pct: goalAvg > 0 ? Math.min(100, Math.round((avg / goalAvg) * 100)) : 0,
    sub: `${daysHit}/7 days hit goal`,
    empty: false,
  };
}

function buildHabitsCardDay(meta: RecapMeta, habits: Record<string, HabitDay>, dayKey: string): RecapCardData {
  const habitDay = habits[dayKey];
  const rings: RecapRing[] = HABIT_META.map((h) => {
    const done = !!habitDay?.[h.key];
    const streak = getHabitStreak(habits, h.key);
    return { label: h.label, pct: done ? 100 : 0, sub: streak > 0 ? `${streak}d streak` : done ? 'Done' : '—', color: h.color };
  });
  const doneCount = HABIT_META.filter((h) => habitDay?.[h.key]).length;
  return { id: 'habits', ...meta, type: 'habits', rings, sub: `${doneCount} of 5 habits done` };
}

function buildHabitsCardWeek(meta: RecapMeta, habits: Record<string, HabitDay>, dayKeys: string[]): RecapCardData {
  const rings: RecapRing[] = HABIT_META.map((h) => {
    const count = dayKeys.filter((k) => habits[k]?.[h.key]).length;
    return { label: h.label, pct: Math.round((count / 7) * 100), sub: `${count}/7`, color: h.color };
  });
  const totalDone = HABIT_META.reduce((s, h) => s + dayKeys.filter((k) => habits[k]?.[h.key]).length, 0);
  return { id: 'habits', ...meta, type: 'habits', rings, sub: `${totalDone} habit-days completed` };
}

function buildPhotoCard(input: RecapInput, meta: RecapMeta, refKey: string): RecapCardData {
  const inScope =
    meta.scope === 'day'
      ? input.progressPhotos.filter((p) => p.date === refKey)
      : input.progressPhotos.filter((p) => {
          const start = dayjs(input.dateKey);
          const d = dayjs(p.date);
          return !d.isBefore(start, 'day') && !d.isAfter(start.add(6, 'day'), 'day');
        });
  const latest = [...inScope].sort((a, b) => b.capturedAt - a.capturedAt)[0];
  return {
    id: 'photo',
    ...meta,
    type: 'photo',
    dataUrl: input.photoDataUrl,
    caption: latest ? dayjs(latest.date).format('MMM D, YYYY') : 'No progress photo',
    count: inScope.length,
  };
}

/** Pick the hero progress photo for a scope (latest image in range). */
export function pickHeroPhoto(photos: ProgressPhoto[], scope: RecapScope, dateKey: string): ProgressPhoto | null {
  const inScope =
    scope === 'day'
      ? photos.filter((p) => p.date === dateKey)
      : photos.filter((p) => {
          const start = dayjs(dateKey);
          const d = dayjs(p.date);
          return !d.isBefore(start, 'day') && !d.isAfter(start.add(6, 'day'), 'day');
        });
  const images = inScope.filter((p) => p.kind === 'image');
  return [...images].sort((a, b) => b.capturedAt - a.capturedAt)[0] ?? null;
}
