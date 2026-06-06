import dayjs from 'dayjs';
import type { HabitDay, UserProfile, WeeklyGoals, WorkoutSession } from './types';
import {
  filterWorkoutsInTrackingWeek,
  getMuscleFromSplit,
  getTrackingWeekStart,
} from './utils';
import { MUSCLE_COLORS } from './constants';

export type TimeRange = 'week' | 'month' | '3months' | 'year';

export function getRangeDates(range: TimeRange): { start: string; end: string; prevStart: string; prevEnd: string } {
  const end = dayjs();
  let start: dayjs.Dayjs;
  switch (range) {
    case 'week':
      start = end.subtract(7, 'day');
      break;
    case 'month':
      start = end.subtract(30, 'day');
      break;
    case '3months':
      start = end.subtract(90, 'day');
      break;
    case 'year':
      start = end.subtract(365, 'day');
      break;
  }
  const duration = end.diff(start, 'day');
  const prevEnd = start.subtract(1, 'day');
  const prevStart = prevEnd.subtract(duration, 'day');
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
    prevStart: prevStart.format('YYYY-MM-DD'),
    prevEnd: prevEnd.format('YYYY-MM-DD'),
  };
}

export function filterByRange(workouts: WorkoutSession[], start: string, end: string): WorkoutSession[] {
  return workouts.filter((w) => {
    const d = dayjs(w.date);
    return !d.isBefore(dayjs(start)) && !d.isAfter(dayjs(end));
  });
}

export function calcTrainingOverview(
  workouts: WorkoutSession[],
  range: TimeRange
): {
  totalWorkouts: number;
  restDays: number;
  trainingHours: number;
  avgDuration: number;
  trends: { workouts: number; hours: number; duration: number; rest: number };
} {
  const { start, end, prevStart, prevEnd } = getRangeDates(range);
  const current = filterByRange(workouts, start, end);
  const previous = filterByRange(workouts, prevStart, prevEnd);
  const days = dayjs(end).diff(dayjs(start), 'day') + 1;
  const workoutDates = new Set(current.map((w) => w.date));
  const totalDuration = current.reduce((s, w) => s + w.duration, 0);

  const prevDuration = previous.reduce((s, w) => s + w.duration, 0);

  return {
    totalWorkouts: current.length,
    restDays: days - workoutDates.size,
    trainingHours: Math.round(totalDuration / 3600 * 10) / 10,
    avgDuration: current.length ? Math.round(totalDuration / current.length / 60) : 0,
    trends: {
      workouts: current.length - previous.length,
      hours: Math.round((totalDuration - prevDuration) / 3600 * 10) / 10,
      duration:
        (current.length ? totalDuration / current.length : 0) -
        (previous.length ? prevDuration / previous.length : 0),
      rest: (days - workoutDates.size) - (dayjs(prevEnd).diff(dayjs(prevStart), 'day') + 1 - new Set(previous.map((w) => w.date)).size),
    },
  };
}

export function getStackedVolumeByMuscle(workouts: WorkoutSession[], weeks = 8) {
  const muscles = ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'];
  const result: Record<string, number | string>[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = getTrackingWeekStart().subtract(i, 'week');
    const weekEnd = weekStart.add(6, 'day').endOf('day');
    const entry: Record<string, number | string> = { week: weekStart.format('MMM D') };
    for (const m of muscles) entry[m] = 0;

    for (const w of workouts) {
      const d = dayjs(w.date);
      if (d.isBefore(weekStart) || d.isAfter(weekEnd)) continue;
      for (const ex of w.exercises) {
        const vol = ex.sets.filter((s) => s.done).reduce((s, set) => s + set.weight * set.reps, 0);
        entry[ex.muscle] = (entry[ex.muscle] as number) + vol;
      }
    }
    result.push(entry);
  }
  return { data: result, muscles, colors: MUSCLE_COLORS };
}

export function getVolumeSplitDonut(workouts: WorkoutSession[], start: string, end: string) {
  const filtered = filterByRange(workouts, start, end);
  const totals: Record<string, number> = {};
  for (const w of filtered) {
    for (const ex of w.exercises) {
      const vol = ex.sets.filter((s) => s.done).reduce((s, set) => s + set.weight * set.reps, 0);
      totals[ex.muscle] = (totals[ex.muscle] ?? 0) + vol;
    }
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals).map(([name, value]) => ({
    name,
    value: Math.round((value / total) * 100),
    volume: value,
    fill: MUSCLE_COLORS[name] ?? '#888',
  }));
}

export function getAvgWeightPerSession(workouts: WorkoutSession[], start: string, end: string) {
  return filterByRange(workouts, start, end)
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
    .map((w) => {
      const sets = w.exercises.flatMap((e) => e.sets.filter((s) => s.done && s.weight > 0));
      const avg = sets.length ? sets.reduce((s, set) => s + set.weight, 0) / sets.length : 0;
      return { date: dayjs(w.date).format('MMM D'), avgWeight: Math.round(avg * 10) / 10 };
    });
}

export function getRepRangeDistribution(workouts: WorkoutSession[], start: string, end: string) {
  const ranges = { '1-5': 0, '6-12': 0, '13+': 0 };
  for (const w of filterByRange(workouts, start, end)) {
    for (const ex of w.exercises) {
      for (const s of ex.sets.filter((set) => set.done)) {
        if (s.reps <= 5) ranges['1-5']++;
        else if (s.reps <= 12) ranges['6-12']++;
        else ranges['13+']++;
      }
    }
  }
  return Object.entries(ranges).map(([range, count]) => ({ range, count }));
}

export const TRACKED_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'] as const;

/** Sessions per muscle group in the current tracking week (Sun–Sat). */
export function getWeeklyMuscleTrainingCounts(workouts: WorkoutSession[]): { muscle: string; count: number }[] {
  const weekWorkouts = filterWorkoutsInTrackingWeek(workouts);

  return TRACKED_MUSCLES.map((muscle) => ({
    muscle,
    count: weekWorkouts.filter((w) =>
      w.exercises.some((e) => e.muscle === muscle && e.sets.some((s) => s.done))
    ).length,
  }));
}

export function getMuscleTrainingGaps(workouts: WorkoutSession[]): { muscle: string; avgDays: number }[] {
  const muscles = ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'];
  return muscles.map((muscle) => {
    const dates = workouts
      .filter((w) => w.exercises.some((e) => e.muscle === muscle))
      .map((w) => dayjs(w.date))
      .sort((a, b) => a.valueOf() - b.valueOf());
    if (dates.length < 2) return { muscle, avgDays: 0 };
    let totalGap = 0;
    for (let i = 1; i < dates.length; i++) {
      totalGap += dates[i].diff(dates[i - 1], 'day');
    }
    return { muscle, avgDays: Math.round(totalGap / (dates.length - 1)) };
  });
}

export function detectOvertraining(workouts: WorkoutSession[]): string[] {
  const alerts: string[] = [];
  const muscles = ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'];
  const last3 = [0, 1, 2].map((i) => dayjs().subtract(i, 'day').format('YYYY-MM-DD'));

  for (const muscle of muscles) {
    const trainedDays = last3.filter((date) =>
      workouts.some((w) => w.date === date && w.exercises.some((e) => e.muscle === muscle))
    );
    if (trainedDays.length >= 3) {
      alerts.push(`${muscle} trained 3 consecutive days — consider rest`);
    }
  }
  return alerts;
}

export function calcConsistencyScore(
  workouts: WorkoutSession[],
  goals: WeeklyGoals,
  profile: UserProfile,
  habits: Record<string, HabitDay>
): { score: number; breakdown: { label: string; value: number; max: number }[] } {
  const weekWorkouts = filterWorkoutsInTrackingWeek(workouts);
  const weekStart = getTrackingWeekStart();
  const freqScore = Math.min(100, (weekWorkouts.length / goals.workoutsPerWeek) * 100);

  const weekVolumes = weekWorkouts.map((w) => w.totalVolume);
  const avgVol = weekVolumes.length ? weekVolumes.reduce((a, b) => a + b, 0) / weekVolumes.length : 0;
  const volVariance =
    weekVolumes.length > 1
      ? weekVolumes.reduce((s, v) => s + Math.abs(v - avgVol), 0) / weekVolumes.length
      : 0;
  const volScore = avgVol > 0 ? Math.max(0, 100 - (volVariance / avgVol) * 50) : 50;

  const scheduleDays = Object.entries(profile.weekSchedule).filter(([, v]) => v !== 'rest').length;
  const restDaysExpected = 7 - scheduleDays;
  const actualRestDays = 7 - weekWorkouts.length;
  const restScore = restDaysExpected > 0
    ? Math.min(100, Math.max(0, 100 - Math.abs(actualRestDays - restDaysExpected) * 20))
    : 80;

  const habitDays = Object.keys(habits).filter((d) => dayjs(d).isAfter(weekStart.subtract(1, 'day')));
  const habitScore = habitDays.length
    ? (habitDays.reduce((s, d) => {
        const h = habits[d];
        const done = [h.workout, h.water, h.sleep, h.protein, h.steps].filter(Boolean).length;
        return s + (done / 5) * 100;
      }, 0) / habitDays.length)
    : 50;

  const breakdown = [
    { label: 'Workout Frequency', value: Math.round(freqScore), max: 100 },
    { label: 'Volume Consistency', value: Math.round(volScore), max: 100 },
    { label: 'Rest Day Adherence', value: Math.round(restScore), max: 100 },
    { label: 'Habit Completion', value: Math.round(habitScore), max: 100 },
  ];

  const score = Math.round(breakdown.reduce((s, b) => s + b.value, 0) / breakdown.length);
  return { score, breakdown };
}

export function getWeekProgress(workouts: WorkoutSession[], goals: WeeklyGoals) {
  const weekWorkouts = filterWorkoutsInTrackingWeek(workouts);
  const volume = weekWorkouts.reduce((s, w) => s + w.totalVolume, 0);
  return {
    workouts: weekWorkouts.length,
    volume,
    workoutPct: Math.min(100, (weekWorkouts.length / goals.workoutsPerWeek) * 100),
    volumePct: Math.min(100, (volume / goals.volumeTarget) * 100),
  };
}

export function getHabitStreak(habits: Record<string, HabitDay>, key: keyof HabitDay): number {
  let streak = 0;
  let d = dayjs();
  while (true) {
    const dateKey = d.format('YYYY-MM-DD');
    if (!habits[dateKey]?.[key]) break;
    streak++;
    d = d.subtract(1, 'day');
  }
  return streak;
}

export function getFavouriteSplit(workouts: WorkoutSession[]): string {
  const counts: Record<string, number> = {};
  for (const w of workouts) counts[w.splitName] = (counts[w.splitName] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'None';
}

export function getFavouriteExercise(workouts: WorkoutSession[]): string {
  const counts: Record<string, number> = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      counts[ex.name] = (counts[ex.name] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'None';
}

export function getMuscleVolumeTrend(
  workouts: WorkoutSession[],
  range: '30d' | '3m' | '6m' | 'all',
  muscle?: string
) {
  let start: dayjs.Dayjs;
  switch (range) {
    case '30d': start = dayjs().subtract(30, 'day'); break;
    case '3m': start = dayjs().subtract(90, 'day'); break;
    case '6m': start = dayjs().subtract(180, 'day'); break;
    case 'all': start = dayjs('2000-01-01'); break;
  }

  const weekly: Record<string, { volume: number; avgWeight: number; maxWeight: number; reps: number; sets: number }> = {};

  for (const w of workouts.filter((wd) => dayjs(wd.date).isAfter(start))) {
    const week = getTrackingWeekStart(w.date).format('MMM D');
    if (!weekly[week]) weekly[week] = { volume: 0, avgWeight: 0, maxWeight: 0, reps: 0, sets: 0 };
    for (const ex of w.exercises) {
      if (muscle && ex.muscle !== muscle) continue;
      for (const s of ex.sets.filter((set) => set.done)) {
        weekly[week].volume += s.weight * s.reps;
        weekly[week].reps += s.reps;
        weekly[week].sets++;
        weekly[week].maxWeight = Math.max(weekly[week].maxWeight, s.weight);
      }
    }
  }

  return Object.entries(weekly).map(([week, data]) => ({
    week,
    volume: data.volume,
    avgWeight: data.sets ? Math.round(data.volume / data.reps * 10) / 10 : 0,
    maxWeight: data.maxWeight,
    reps: data.reps,
  }));
}

export function getExerciseHistory(workouts: WorkoutSession[], exerciseId: string) {
  return workouts
    .filter((w) => w.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseId === exerciseId)!;
      const doneSets = ex.sets.filter((s) => s.done && s.weight > 0);
      const best = doneSets.sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
      return {
        date: w.date,
        variation: ex.variation,
        sets: doneSets.length,
        bestSet: best ? `${best.weight}kg × ${best.reps}` : '-',
        weight: best?.weight ?? 0,
      };
    });
}

export function getExerciseSessionChart(workouts: WorkoutSession[], exerciseId: string, sessions = 6) {
  const history = getExerciseHistory(workouts, exerciseId).slice(-sessions);
  return history.map((h) => ({
    date: dayjs(h.date).format('MMM D'),
    weight: h.weight,
  }));
}
