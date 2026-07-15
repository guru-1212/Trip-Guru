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

// ── shared sub-shapes ───────────────────────────────────────────────
export interface RecapBar {
  label: string;
  value: number;
  highlight?: boolean;
}
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

export interface RecapMeta {
  athleteName: string;
  scope: RecapScope;
  dateLabel: string;
  accent: string[];
}

export type RecapCardData = { id: string } & RecapMeta &
  (
    | { type: 'cover'; headline: string; chips: RecapChip[] }
    | {
        type: 'volume';
        volumeLabel: string;
        sets: number;
        sessions: number;
        bars: RecapBar[];
        barUnitLabel: string;
        goalPct: number | null;
        goalLabel: string | null;
      }
    | {
        type: 'workout';
        headline: string;
        durationLabel: string;
        sets: number;
        volumeLabel: string;
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
        unit: string;
        empty: boolean;
      }
    | { type: 'water'; totalLabel: string; goalLabel: string; pct: number; sub: string; empty: boolean }
    | {
        type: 'nutrition';
        calories: number;
        calorieTarget: number;
        caloriePct: number;
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
  /** Water logs keyed by date (day: 0–1 entries; week: up to 7). */
  water: Record<string, WaterLogDoc>;
  /** Nutrition logs keyed by date. */
  nutrition: Record<string, NutritionLogDoc>;
  /** Pre-fetched hero progress photo as a data URL (avoids html2canvas tainting). */
  photoDataUrl: string | null;
}

const HABIT_META: { key: keyof HabitDay; label: string; color: string }[] = [
  { key: 'workout', label: 'Workout', color: '#6366f1' },
  { key: 'water', label: 'Water', color: '#06b6d4' },
  { key: 'sleep', label: 'Sleep', color: '#8b5cf6' },
  { key: 'protein', label: 'Protein', color: '#22c55e' },
  { key: 'steps', label: 'Steps', color: '#f59e0b' },
];

const DEFAULT_ACCENT = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899'];

// ── small helpers ───────────────────────────────────────────────────
function dayKeysOfWeek(weekStartKey: string): string[] {
  const start = dayjs(weekStartKey);
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').format('YYYY-MM-DD'));
}

function dayVolume(workouts: WorkoutSession[], dateKey: string): number {
  return workouts.filter((w) => w.date === dateKey).reduce((s, w) => s + w.totalVolume, 0);
}

function accentFromSessions(sessions: WorkoutSession[]): string[] {
  const muscles: string[] = [];
  for (const w of sessions) {
    for (const ex of w.exercises) {
      if (!muscles.includes(ex.muscle)) muscles.push(ex.muscle);
    }
  }
  const colors = muscles.map((m) => MUSCLE_COLORS[m]).filter(Boolean) as string[];
  return colors.length ? colors.slice(0, 5) : DEFAULT_ACCENT;
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
  const rows = sessions
    .flatMap((w) => w.exercises)
    .map((ex) => {
      const best = bestDoneSet(ex.sets);
      if (!best) return null;
      const doneCount = ex.sets.filter((s) => s.done).length;
      const pr = ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs));
      return {
        name: ex.name,
        detail: `${doneCount} × · ${formatWeight(best.weight, unit)} × ${best.reps}`,
        pr,
        score: best.weight * best.reps,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return rows.map(({ name, detail, pr }) => ({ name, detail, pr }));
}

function prCountForSessions(
  sessions: WorkoutSession[],
  prs: Record<string, PersonalRecord>
): number {
  return sessions.filter((w) =>
    w.exercises.some((ex) => ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs)))
  ).length;
}

function volumeBarsForDay(workouts: WorkoutSession[], dateKey: string): RecapBar[] {
  const end = dayjs(dateKey);
  const bars: RecapBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = end.subtract(i, 'day');
    bars.push({
      label: d.format('dd'),
      value: dayVolume(workouts, d.format('YYYY-MM-DD')),
      highlight: i === 0,
    });
  }
  return bars;
}

function volumeBarsForWeek(workouts: WorkoutSession[], weekStartKey: string): RecapBar[] {
  const end = dayjs(weekStartKey);
  const bars: RecapBar[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = end.subtract(i, 'week');
    const we = ws.add(6, 'day');
    const volume = workouts
      .filter((w) => {
        const d = dayjs(w.date);
        return !d.isBefore(ws, 'day') && !d.isAfter(we, 'day');
      })
      .reduce((s, w) => s + w.totalVolume, 0);
    bars.push({ label: ws.format('M/D'), value: volume, highlight: i === 0 });
  }
  return bars;
}

function weightPoints(bodyStats: BodyStat[], asOfKey: string, unit: 'kg' | 'lbs', count: number): number[] {
  return [...bodyStats]
    .filter((s) => s.date <= asOfKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-count)
    .map((s) => Math.round(displayWeight(s.weight, unit) * 10) / 10);
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
  const athleteName = profile.name || 'Athlete';
  const dateLabel = dayjs(dateKey).format('ddd, MMM D, YYYY');
  const sessions = workouts.filter((w) => w.date === dateKey);
  const accent = accentFromSessions(sessions);
  const meta: RecapMeta = { athleteName, scope: 'day', dateLabel, accent };
  const cards: RecapCardData[] = [];

  // aggregates for cover chips
  const dayVol = sessions.reduce((s, w) => s + w.totalVolume, 0);
  const daySets = sessions.reduce((s, w) => s + w.totalSets, 0);
  const waterDoc = input.water[dateKey];
  const nutDoc = input.nutrition[dateKey];
  const habitDay = habits[dateKey];
  const habitsDone = habitDay
    ? HABIT_META.filter((h) => habitDay[h.key]).length
    : 0;

  // Cover
  const chips: RecapChip[] = [];
  if (sessions.length) chips.push({ label: 'Volume', value: formatWeight(dayVol, unit) });
  if (waterDoc) chips.push({ label: 'Water', value: formatMl(waterDoc.totalMl) });
  if (nutDoc) chips.push({ label: 'Protein', value: `${Math.round(nutDoc.totals.proteinG)} g` });
  chips.push({ label: 'Habits', value: `${habitsDone}/5` });
  cards.push({
    id: 'cover',
    ...meta,
    type: 'cover',
    headline: sessions.length ? sessions.map((s) => SPLIT_NAMES[s.splitId] ?? s.splitName).join(' + ') : 'Rest & Recover',
    chips,
  });

  // Workout details
  cards.push({
    id: 'workout',
    ...meta,
    type: 'workout',
    headline: sessions.length ? sessions.map((s) => s.splitName).join(' + ') : 'No session logged',
    durationLabel: formatDuration(sessions.reduce((s, w) => s + w.duration, 0)),
    sets: daySets,
    volumeLabel: formatWeight(dayVol, unit),
    prCount: prCountForSessions(sessions, prs),
    exercises: buildExerciseLines(sessions, prs, unit, 7),
    empty: sessions.length === 0,
  });

  // Volume + 7-day graph
  cards.push({
    id: 'volume',
    ...meta,
    type: 'volume',
    volumeLabel: formatWeight(dayVol, unit),
    sets: daySets,
    sessions: sessions.length,
    bars: volumeBarsForDay(workouts, dateKey),
    barUnitLabel: 'Last 7 days',
    goalPct: null,
    goalLabel: null,
  });

  // Weight vs target
  cards.push(buildWeightCard(meta, bodyStats, weeklyGoals.targetWeight, unit, dateKey));

  // Nutrition
  cards.push(buildNutritionCard(meta, nutDoc ? [nutDoc] : [], 1));

  // Water
  cards.push(buildWaterCardDay(meta, waterDoc));

  // Habits
  cards.push(buildHabitsCardDay(meta, habitDay, habits));

  // Progress photo
  cards.push(buildPhotoCard(input, meta, dateKey));

  return cards;
}

function buildWeekRecap(input: RecapInput): RecapCardData[] {
  const { dateKey, profile, workouts, prs, bodyStats, habits, weeklyGoals } = input;
  const unit = profile.prefs.unit;
  const athleteName = profile.name || 'Athlete';
  const weekStart = dayjs(dateKey);
  const weekEndKey = weekStart.add(6, 'day').format('YYYY-MM-DD');
  const dateLabel = getTrackingWeekRangeLabel(dateKey);
  const sessions = getWorkoutsInRange(workouts, dateKey, weekEndKey);
  const accent = accentFromSessions(sessions);
  const meta: RecapMeta = { athleteName, scope: 'week', dateLabel, accent };
  const cards: RecapCardData[] = [];

  const weekVol = sessions.reduce((s, w) => s + w.totalVolume, 0);
  const weekSets = sessions.reduce((s, w) => s + w.totalSets, 0);
  const dayKeys = dayKeysOfWeek(dateKey);
  const waterLogs = dayKeys.map((k) => input.water[k]).filter(Boolean) as WaterLogDoc[];
  const nutLogs = dayKeys.map((k) => input.nutrition[k]).filter(Boolean) as NutritionLogDoc[];

  // Cover
  const chips: RecapChip[] = [
    { label: 'Workouts', value: String(sessions.length) },
    { label: 'Volume', value: formatWeight(weekVol, unit) },
  ];
  if (waterLogs.length) {
    const daysHit = waterLogs.filter((w) => w.completed).length;
    chips.push({ label: 'Water', value: `${daysHit}/7 days` });
  }
  cards.push({
    id: 'cover',
    ...meta,
    type: 'cover',
    headline: `${sessions.length} session${sessions.length === 1 ? '' : 's'} this week`,
    chips,
  });

  // Workout details (week roll-up)
  const splitNames = Array.from(new Set(sessions.map((s) => s.splitName)));
  cards.push({
    id: 'workout',
    ...meta,
    type: 'workout',
    headline: splitNames.length ? splitNames.join(' · ') : 'No sessions this week',
    durationLabel: formatDuration(sessions.reduce((s, w) => s + w.duration, 0)),
    sets: weekSets,
    volumeLabel: formatWeight(weekVol, unit),
    prCount: prCountForSessions(sessions, prs),
    exercises: buildExerciseLines(sessions, prs, unit, 7),
    empty: sessions.length === 0,
  });

  // Volume + 8-week trend
  const volumePct = weeklyGoals.volumeTarget > 0 ? Math.min(100, Math.round((weekVol / weeklyGoals.volumeTarget) * 100)) : null;
  cards.push({
    id: 'volume',
    ...meta,
    type: 'volume',
    volumeLabel: formatWeight(weekVol, unit),
    sets: weekSets,
    sessions: sessions.length,
    bars: volumeBarsForWeek(workouts, dateKey),
    barUnitLabel: 'Last 8 weeks',
    goalPct: volumePct,
    goalLabel: volumePct !== null ? `${volumePct}% of ${formatWeight(weeklyGoals.volumeTarget, unit)} goal` : null,
  });

  // Weight (as of week end)
  cards.push(buildWeightCard(meta, bodyStats, weeklyGoals.targetWeight, unit, weekEndKey));

  // Nutrition (weekly averages)
  cards.push(buildNutritionCard(meta, nutLogs, Math.max(nutLogs.length, 1)));

  // Water (weekly)
  cards.push(buildWaterCardWeek(meta, waterLogs));

  // Habits (x/7)
  cards.push(buildHabitsCardWeek(meta, habits, dayKeys));

  // Progress photo (latest in week)
  cards.push(buildPhotoCard(input, meta, weekEndKey));

  return cards;
}

// ── per-card builders shared by day/week ────────────────────────────
function buildWeightCard(
  meta: RecapMeta,
  bodyStats: BodyStat[],
  targetKg: number | undefined,
  unit: 'kg' | 'lbs',
  asOfKey: string
): RecapCardData {
  const onOrBefore = [...bodyStats]
    .filter((s) => s.date <= asOfKey)
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = onOrBefore[0] ?? [...bodyStats].sort((a, b) => b.date.localeCompare(a.date))[0];
  const points = weightPoints(bodyStats, asOfKey, unit, 12);

  if (!latest) {
    return {
      id: 'weight',
      ...meta,
      type: 'weight',
      current: '—',
      target: targetKg ? formatWeight(targetKg, unit) : '—',
      deltaLabel: '—',
      deltaDir: 'flat',
      toGoalLabel: 'Log a weigh-in',
      points: [],
      unit,
      empty: true,
    };
  }

  const oldest = onOrBefore[onOrBefore.length - 1] ?? latest;
  const deltaDisp = Math.round((displayWeight(latest.weight, unit) - displayWeight(oldest.weight, unit)) * 10) / 10;
  const deltaDir: 'up' | 'down' | 'flat' = deltaDisp > 0 ? 'up' : deltaDisp < 0 ? 'down' : 'flat';
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
    deltaLabel: `${deltaDisp > 0 ? '+' : ''}${deltaDisp} ${unit}`,
    deltaDir,
    toGoalLabel:
      toGoal == null ? 'Set a goal' : toGoal === 0 ? 'At goal 🎯' : `${Math.abs(toGoal)} ${unit} ${toGoal > 0 ? 'above' : 'below'} goal`,
    points,
    unit,
    empty: false,
  };
}

function buildNutritionCard(meta: RecapMeta, logs: NutritionLogDoc[], divisor: number): RecapCardData {
  if (!logs.length) {
    return {
      id: 'nutrition',
      ...meta,
      type: 'nutrition',
      calories: 0,
      calorieTarget: 0,
      caloriePct: 0,
      macros: [],
      sub: 'No meals logged',
      empty: true,
    };
  }
  const div = Math.max(divisor, 1);
  const cal = Math.round(sumMacro(logs, (n) => n.calories) / div);
  const protein = Math.round(sumMacro(logs, (n) => n.proteinG) / div);
  const carbs = Math.round(sumMacro(logs, (n) => n.carbsG) / div);
  const fat = Math.round(sumMacro(logs, (n) => n.fatG) / div);
  const t = logs[logs.length - 1].targets;
  const calTarget = Math.round(t.calories);
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
    calorieTarget: calTarget,
    caloriePct: calTarget > 0 ? Math.min(100, Math.round((cal / calTarget) * 100)) : 0,
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
  if (!doc) {
    return { id: 'water', ...meta, type: 'water', totalLabel: '0 ml', goalLabel: '—', pct: 0, sub: 'No water logged', empty: true };
  }
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
  if (!logs.length) {
    return { id: 'water', ...meta, type: 'water', totalLabel: '0 ml', goalLabel: '—', pct: 0, sub: 'No water logged', empty: true };
  }
  const totalMl = logs.reduce((s, l) => s + l.totalMl, 0);
  const avg = Math.round(totalMl / 7);
  const goalAvg = Math.round(logs.reduce((s, l) => s + l.goalMl, 0) / logs.length);
  const daysHit = logs.filter((l) => l.completed).length;
  const pct = goalAvg > 0 ? Math.min(100, Math.round((avg / goalAvg) * 100)) : 0;
  return {
    id: 'water',
    ...meta,
    type: 'water',
    totalLabel: formatMl(avg),
    goalLabel: `${formatMl(goalAvg)}/day`,
    pct,
    sub: `${daysHit}/7 days hit goal`,
    empty: false,
  };
}

function buildHabitsCardDay(
  meta: RecapMeta,
  habitDay: HabitDay | undefined,
  habits: Record<string, HabitDay>
): RecapCardData {
  const rings: RecapRing[] = HABIT_META.map((h) => {
    const done = !!habitDay?.[h.key];
    const streak = getHabitStreak(habits, h.key);
    return {
      label: h.label,
      pct: done ? 100 : 0,
      sub: streak > 0 ? `${streak}d streak` : done ? 'Done' : '—',
      color: h.color,
    };
  });
  const doneCount = HABIT_META.filter((h) => habitDay?.[h.key]).length;
  return { id: 'habits', ...meta, type: 'habits', rings, sub: `${doneCount} of 5 habits done` };
}

function buildHabitsCardWeek(
  meta: RecapMeta,
  habits: Record<string, HabitDay>,
  dayKeys: string[]
): RecapCardData {
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
export function pickHeroPhoto(
  photos: ProgressPhoto[],
  scope: RecapScope,
  dateKey: string
): ProgressPhoto | null {
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

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
