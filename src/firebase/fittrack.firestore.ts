import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import type {
  ActiveWorkoutState,
  BodyStat,
  ChecklistData,
  CustomExercise,
  FitTrackReminderType,
  HabitDay,
  PersonalRecord,
  SplitId,
  TodayExercisePick,
  UserProfile,
  WeeklyGoals,
  WorkoutSession,
} from '@/workout/types';
import {
  getDefaultChecklistItems,
  getDefaultProfile,
  getWeekStart,
  cloudSafeVariationImages,
  normalizeProfile,
} from '@/workout/utils';
import * as localStorage from '@/workout/storage';

export interface FitTrackStateDoc {
  prs: Record<string, PersonalRecord>;
  habits: Record<string, HabitDay>;
  weeklyGoals: WeeklyGoals;
  checklist: ChecklistData;
  customVariations: Record<string, string[]>;
  variationImages: Record<string, string>;
  splitExtras: Partial<Record<SplitId, string[]>>;
  splitTodayPicks: Partial<Record<SplitId, TodayExercisePick[]>>;
  /** Per-split lock for today's exercise + variation sequence plan. */
  splitSequenceLocked: Partial<Record<SplitId, boolean>>;
  activeWorkout: ActiveWorkoutState | null;
  migratedFromLocal?: boolean;
  updatedAt?: unknown;
}

function profileDoc(uid: string) {
  return doc(db(), 'users', uid, 'fittrack', 'profile');
}

function stateDoc(uid: string) {
  return doc(db(), 'users', uid, 'fittrack', 'state');
}

function workoutsCol(uid: string) {
  return collection(db(), 'users', uid, 'fittrackWorkouts');
}

function customExercisesCol(uid: string) {
  return collection(db(), 'users', uid, 'fittrackCustomExercises');
}

function bodyStatsCol(uid: string) {
  return collection(db(), 'users', uid, 'fittrackBodyStats');
}

function remindersCol(uid: string) {
  return collection(db(), 'users', uid, 'fittrackReminders');
}

function reminderDoc(uid: string, id: string) {
  return doc(db(), 'users', uid, 'fittrackReminders', id);
}

export function defaultStateDoc(): FitTrackStateDoc {
  const today = new Date().toISOString().slice(0, 10);
  return {
    prs: {},
    habits: {},
    weeklyGoals: {
      workoutsPerWeek: 5,
      volumeTarget: 50000,
      proteinGoal: 150,
      sleepGoal: 8,
      targetWeight: 75,
      weekStart: getWeekStart(),
    },
    checklist: {
      date: today,
      dailyItems: getDefaultChecklistItems(),
      custom: [],
    },
    customVariations: {},
    variationImages: {},
    splitExtras: {},
    splitTodayPicks: {},
    splitSequenceLocked: {},
    activeWorkout: null,
  };
}

export function normalizeChecklist(stored: ChecklistData | undefined): ChecklistData {
  const today = new Date().toISOString().slice(0, 10);
  if (!stored || stored.date !== today) {
    return {
      date: today,
      dailyItems: getDefaultChecklistItems(),
      custom: stored?.custom ?? [],
    };
  }
  return stored;
}

export async function getFitTrackProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileDoc(uid));
  if (!snap.exists()) return null;
  return normalizeProfile(snap.data() as Partial<UserProfile>);
}

export async function saveFitTrackProfile(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(profileDoc(uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getFitTrackState(uid: string): Promise<FitTrackStateDoc> {
  const snap = await getDoc(stateDoc(uid));
  if (!snap.exists()) return defaultStateDoc();
  const data = snap.data() as FitTrackStateDoc;
  return {
    ...defaultStateDoc(),
    ...data,
    checklist: normalizeChecklist(data.checklist),
  };
}

export async function saveFitTrackState(uid: string, state: Partial<FitTrackStateDoc>): Promise<void> {
  await setDoc(stateDoc(uid), { ...state, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getFitTrackWorkouts(uid: string): Promise<WorkoutSession[]> {
  const q = query(workoutsCol(uid), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkoutSession, 'id'>) }));
}

export async function saveFitTrackWorkout(uid: string, workout: WorkoutSession): Promise<void> {
  await setDoc(doc(workoutsCol(uid), workout.id), { ...workout, updatedAt: serverTimestamp() });
}

export async function deleteFitTrackWorkout(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(workoutsCol(uid), id));
}

export async function deleteAllFitTrackWorkouts(uid: string): Promise<void> {
  const snap = await getDocs(workoutsCol(uid));
  const batch = writeBatch(db());
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function getFitTrackCustomExercises(uid: string): Promise<CustomExercise[]> {
  const snap = await getDocs(customExercisesCol(uid));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomExercise, 'id'>) }));
}

export async function saveFitTrackCustomExercise(uid: string, exercise: CustomExercise): Promise<void> {
  await setDoc(doc(customExercisesCol(uid), exercise.id), { ...exercise, updatedAt: serverTimestamp() });
}

export async function deleteFitTrackCustomExercise(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(customExercisesCol(uid), id));
}

export async function getFitTrackBodyStats(uid: string): Promise<BodyStat[]> {
  const q = query(bodyStatsCol(uid), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as BodyStat);
}

export async function saveFitTrackBodyStat(uid: string, stat: BodyStat): Promise<void> {
  await setDoc(doc(bodyStatsCol(uid), stat.date), { ...stat, updatedAt: serverTimestamp() });
}

export async function migrateLocalStorageToFirebase(uid: string): Promise<boolean> {
  const state = await getFitTrackState(uid);
  if (state.migratedFromLocal) return false;

  const existingWorkouts = await getFitTrackWorkouts(uid);
  const localWorkouts = localStorage.loadWorkouts();

  const hasLocalData =
    localWorkouts.length > 0 ||
    Object.keys(localStorage.loadPRs()).length > 0 ||
    localStorage.loadCustomExercises().length > 0;

  const hasCloudData = existingWorkouts.length > 0 || (await getFitTrackProfile(uid)) !== null;

  if (!hasLocalData || hasCloudData) {
    await saveFitTrackState(uid, { migratedFromLocal: true });
    return false;
  }

  const profile = localStorage.loadProfile();
  await saveFitTrackProfile(uid, profile);

  const batch = writeBatch(db());
  for (const w of localWorkouts) {
    batch.set(doc(workoutsCol(uid), w.id), w);
  }
  for (const ex of localStorage.loadCustomExercises()) {
    batch.set(doc(customExercisesCol(uid), ex.id), ex);
  }
  for (const stat of localStorage.loadBodyStats()) {
    batch.set(doc(bodyStatsCol(uid), stat.date), stat);
  }
  await batch.commit();

  await saveFitTrackState(uid, {
    prs: localStorage.loadPRs(),
    habits: localStorage.loadHabits(),
    weeklyGoals: localStorage.loadWeeklyGoals(),
    checklist: localStorage.loadChecklist(),
    customVariations: localStorage.loadCustomVariations(),
    variationImages: cloudSafeVariationImages(localStorage.loadVariationImages()),
    splitExtras: localStorage.loadSplitExtras(),
    splitTodayPicks: localStorage.loadSplitTodayPicks(),
    splitSequenceLocked: localStorage.loadSplitSequenceLocked(),
    activeWorkout: localStorage.loadActiveWorkout(),
    migratedFromLocal: true,
  });

  return true;
}

export async function importFitTrackData(
  uid: string,
  data: {
    profile?: UserProfile;
    workouts?: WorkoutSession[];
    prs?: Record<string, PersonalRecord>;
    customExercises?: CustomExercise[];
    bodyStats?: BodyStat[];
    habits?: Record<string, HabitDay>;
    weeklyGoals?: WeeklyGoals;
    checklist?: ChecklistData;
    customVariations?: Record<string, string[]>;
    variationImages?: Record<string, string>;
    splitExtras?: Partial<Record<SplitId, string[]>>;
    splitTodayPicks?: Partial<Record<SplitId, TodayExercisePick[]>>;
    splitSequenceLocked?: Partial<Record<SplitId, boolean>>;
  }
): Promise<void> {
  if (data.profile) await saveFitTrackProfile(uid, data.profile);
  if (data.workouts) {
    const batch = writeBatch(db());
    for (const w of data.workouts) {
      batch.set(doc(workoutsCol(uid), w.id), w);
    }
    await batch.commit();
  }
  if (data.customExercises) {
    const batch = writeBatch(db());
    for (const ex of data.customExercises) {
      batch.set(doc(customExercisesCol(uid), ex.id), ex);
    }
    await batch.commit();
  }
  if (data.bodyStats) {
    const batch = writeBatch(db());
    for (const stat of data.bodyStats) {
      batch.set(doc(bodyStatsCol(uid), stat.date), stat);
    }
    await batch.commit();
  }
  await saveFitTrackState(uid, {
    prs: data.prs,
    habits: data.habits,
    weeklyGoals: data.weeklyGoals,
    checklist: data.checklist,
    customVariations: data.customVariations,
    variationImages: data.variationImages ? cloudSafeVariationImages(data.variationImages) : undefined,
    splitExtras: data.splitExtras,
    splitTodayPicks: data.splitTodayPicks,
    splitSequenceLocked: data.splitSequenceLocked,
  });
}

export async function ensureFitTrackDefaults(uid: string): Promise<void> {
  const profile = await getFitTrackProfile(uid);
  if (!profile) {
    await saveFitTrackProfile(uid, getDefaultProfile());
  }
  const stateSnap = await getDoc(stateDoc(uid));
  if (!stateSnap.exists()) {
    await saveFitTrackState(uid, defaultStateDoc());
  }
}

export async function cancelPendingProteinReminders(uid: string, localDate?: string): Promise<void> {
  const constraints = [where('status', '==', 'pending'), where('type', '==', 'protein')];
  const q = localDate
    ? query(remindersCol(uid), ...constraints, where('localDate', '==', localDate))
    : query(remindersCol(uid), ...constraints);
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db());
  snap.docs.forEach((d) => {
    batch.update(d.ref, { status: 'cancelled', updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function cancelPendingRemindersByTypes(
  uid: string,
  types: FitTrackReminderType[]
): Promise<void> {
  const snap = await getDocs(
    query(remindersCol(uid), where('status', '==', 'pending'), where('type', 'in', types))
  );
  if (snap.empty) return;

  const batch = writeBatch(db());
  snap.docs.forEach((d) => {
    batch.update(d.ref, { status: 'cancelled', updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

export async function scheduleProteinReminder(
  uid: string,
  sendAt: Date,
  localDate: string,
  payload: { title: string; body: string; url: string }
): Promise<void> {
  await cancelPendingProteinReminders(uid);
  const id = `protein_${localDate}_${sendAt.getTime()}`;
  await setDoc(reminderDoc(uid, id), {
    type: 'protein',
    sendAt: Timestamp.fromDate(sendAt),
    status: 'pending',
    localDate,
    payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
