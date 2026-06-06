import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import type {
  PersonalRecord,
  SplitId,
  UserProfile,
  WorkoutExercise,
  WorkoutSession,
} from './types';
import {
  calcStreak,
  calcWorkoutVolume,
  countCompletedSets,
  formatDuration,
  formatWeight,
  isPR,
} from './utils';

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
    durationLabel: formatDuration(input.durationSeconds),
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
        title: 'FitTrack Workout',
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
