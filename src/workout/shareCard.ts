import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import type {
  PersonalRecord,
  SplitId,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
} from './types';
import { EXERCISE_LIBRARY } from './exerciseLibrary';
import {
  calcStreak,
  calcWorkoutVolume,
  countCompletedSets,
  estimateOneRepMax,
  formatWeight,
  isPR,
} from './utils';

export const BIG_THREE_LIFT_IDS = ['squat', 'bench-press', 'deadlift'] as const;
export type BigThreeLiftId = (typeof BIG_THREE_LIFT_IDS)[number];

export type PRShareLift = {
  exerciseId: string;
  name: string;
  estimated1RM: number;
  estimated1RMLabel: string;
  actualSet: string;
  date: string;
  dateLabel: string;
  variation: string;
};

export type PRShareCardData = {
  athleteName: string;
  mode: 'single' | 'wall';
  lifts: PRShareLift[];
  unit: UserProfile['prefs']['unit'];
};

/** Duration for share card: hours, minutes, seconds (e.g. "1h 23m 45s"). */
export function formatShareCardDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export type ShareCardHighlight =
  | { type: 'pr'; name: string; detail: string }
  | { type: 'lift'; name: string; detail: string };

export type WorkoutShareCardData = {
  athleteName: string;
  date: string;
  dateLabel: string;
  splitId: SplitId;
  splitName: string;
  durationSeconds: number;
  durationLabel: string;
  totalSets: number;
  totalVolume: number;
  volumeLabel: string;
  prCount: number;
  highlights: ShareCardHighlight[];
  exercises: { name: string; detail: string }[];
  streak: number;
  muscleColors: string[];
};

type ShareInput = {
  splitId: SplitId;
  splitName: string;
  date: string;
  durationSeconds: number;
  exercises: WorkoutExercise[];
  profile: UserProfile;
  workouts: WorkoutSession[];
  prs: Record<string, PersonalRecord>;
};

function getBestDoneSet(exercise: WorkoutExercise): WorkoutExercise['sets'][0] | null {
  const done = exercise.sets.filter((s) => s.done && s.weight > 0 && s.reps > 0);
  if (!done.length) return null;
  return done.reduce((best, s) =>
    s.weight * s.reps > best.weight * best.reps ? s : best
  );
}

function buildHighlights(
  exercises: WorkoutExercise[],
  prs: Record<string, PersonalRecord>,
  unit: UserProfile['prefs']['unit']
): ShareCardHighlight[] {
  const prHighlights: ShareCardHighlight[] = [];

  for (const ex of exercises) {
    const best = ex.sets
      .filter((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
      .sort((a, b) => b.weight - a.weight)[0];
    if (best) {
      prHighlights.push({
        type: 'pr',
        name: ex.name,
        detail: `${formatWeight(best.weight, unit)} × ${best.reps}`,
      });
    }
  }

  if (prHighlights.length > 0) {
    return prHighlights.slice(0, 3);
  }

  const lifts = exercises
    .map((ex) => {
      const best = getBestDoneSet(ex);
      if (!best) return null;
      return {
        type: 'lift' as const,
        name: ex.name,
        detail: `${formatWeight(best.weight, unit)} × ${best.reps}`,
        score: best.weight * best.reps,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ name, detail, type }) => ({ type, name, detail }));

  return lifts;
}

function buildExerciseLines(
  exercises: WorkoutExercise[],
  unit: UserProfile['prefs']['unit']
): { name: string; detail: string }[] {
  return exercises
    .map((ex) => {
      const best = getBestDoneSet(ex);
      if (!best) return null;
      const doneCount = ex.sets.filter((s) => s.done).length;
      return {
        name: ex.name,
        detail: `${doneCount} sets · ${formatWeight(best.weight, unit)} × ${best.reps}`,
        score: best.weight * best.reps,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ name, detail }) => ({ name, detail }));
}

export function buildShareCardData(input: ShareInput): WorkoutShareCardData {
  const { profile, workouts, prs, exercises } = input;
  const unit = profile.prefs.unit;
  const prCount = exercises.filter((ex) =>
    ex.sets.some((s) => s.done && isPR(ex.exerciseId, s.weight, prs))
  ).length;

  const muscleColors =
    input.splitId === 'rest'
      ? ['#64748b']
      : input.splitId === 'legs'
        ? ['#F97316', '#FB923C']
        : input.splitId === 'ct'
          ? ['#1D9E75', '#A855F7']
          : input.splitId === 'bb'
            ? ['#378ADD', '#EC4899']
            : input.splitId === 'sh'
              ? ['#BA7517', '#F59E0B']
              : ['#1D9E75', '#378ADD', '#A855F7', '#EC4899'];

  return {
    athleteName: profile.name || 'Athlete',
    date: input.date,
    dateLabel: dayjs(input.date).format('MMM D, YYYY'),
    splitId: input.splitId,
    splitName: input.splitName,
    durationSeconds: input.durationSeconds,
    durationLabel: formatShareCardDuration(input.durationSeconds),
    totalSets: countCompletedSets(exercises),
    totalVolume: calcWorkoutVolume(exercises),
    volumeLabel: formatWeight(calcWorkoutVolume(exercises), unit),
    prCount,
    highlights: buildHighlights(exercises, prs, unit),
    exercises: buildExerciseLines(exercises, unit),
    streak: calcStreak(workouts),
    muscleColors,
  };
}

export function buildShareCardDataFromSession(
  session: WorkoutSession,
  profile: UserProfile,
  workouts: WorkoutSession[],
  prs: Record<string, PersonalRecord>
): WorkoutShareCardData {
  return buildShareCardData({
    splitId: session.splitId,
    splitName: session.splitName,
    date: session.date,
    durationSeconds: session.duration,
    exercises: session.exercises,
    profile,
    workouts,
    prs,
  });
}

export async function captureShareCardAsPng(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 1,
    useCORS: true,
    backgroundColor: '#0f172a',
    width: 1080,
    height: 1920,
    windowWidth: 1080,
    windowHeight: 1920,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create image'));
      },
      'image/png',
      1
    );
  });
}

export function downloadShareCard(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadShareCard(
  blob: Blob,
  filename: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Workout Story',
        text: 'My workout today',
      });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw err;
      }
    }
  }

  downloadShareCard(blob, filename);
  return 'downloaded';
}

export function shareCardFilename(splitName: string, date: string): string {
  const safeSplit = splitName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `fittrack-${safeSplit}-${date}.png`;
}

export async function exportWorkoutShareCard(
  element: HTMLElement,
  data: WorkoutShareCardData
): Promise<'shared' | 'downloaded'> {
  const blob = await captureShareCardAsPng(element);
  return shareOrDownloadShareCard(blob, shareCardFilename(data.splitName, data.date));
}

export function waitForShareCardPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function buildPRShareLift(
  exerciseId: string,
  name: string,
  pr: PersonalRecord,
  unit: UserProfile['prefs']['unit']
): PRShareLift {
  const estimated1RM = estimateOneRepMax(pr.weight, pr.reps);
  return {
    exerciseId,
    name,
    estimated1RM,
    estimated1RMLabel: formatWeight(estimated1RM, unit),
    actualSet: `${formatWeight(pr.weight, unit)} × ${pr.reps}`,
    date: pr.date,
    dateLabel: dayjs(pr.date).format('MMM D, YYYY'),
    variation: pr.variation,
  };
}

export function buildPRShareCardData(input: {
  athleteName: string;
  prs: Record<string, PersonalRecord>;
  unit: UserProfile['prefs']['unit'];
  mode: 'single' | 'wall';
  exerciseId?: string;
  customExercises?: { id: string; name: string }[];
}): PRShareCardData | null {
  const { athleteName, prs, unit, mode, exerciseId, customExercises = [] } = input;

  const resolveName = (id: string) =>
    EXERCISE_LIBRARY.find((e) => e.id === id)?.name ??
    customExercises.find((e) => e.id === id)?.name ??
    id;

  if (mode === 'single' && exerciseId) {
    const pr = prs[exerciseId];
    if (!pr) return null;
    return {
      athleteName: athleteName || 'Athlete',
      mode: 'single',
      unit,
      lifts: [buildPRShareLift(exerciseId, resolveName(exerciseId), pr, unit)],
    };
  }

  const lifts = BIG_THREE_LIFT_IDS.flatMap((id) => {
    const pr = prs[id];
    if (!pr) return [];
    return [buildPRShareLift(id, resolveName(id), pr, unit)];
  });

  if (lifts.length === 0) return null;

  return {
    athleteName: athleteName || 'Athlete',
    mode: 'wall',
    unit,
    lifts,
  };
}

export function prShareCardFilename(liftName: string, date: string): string {
  const safeName = liftName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `fittrack-${safeName}-pr-${date}.png`;
}

export async function exportPRShareCard(
  element: HTMLElement,
  data: PRShareCardData
): Promise<'shared' | 'downloaded'> {
  const blob = await captureShareCardAsPng(element);
  const filename =
    data.mode === 'single' && data.lifts[0]
      ? prShareCardFilename(data.lifts[0].name, data.lifts[0].date)
      : prShareCardFilename('wall-of-fame', dayjs().format('YYYY-MM-DD'));
  return shareOrDownloadShareCard(blob, filename);
}
