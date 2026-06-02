import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/db';
import {
  DailyChecklist,
  GymProfile,
  MeasurementLog,
  ProgressPhotoLog,
  WeightLog,
  WorkoutLog,
} from '@/types/gym';

function userDoc(uid: string, key: string) {
  return doc(db(), 'users', uid, 'gym', key);
}

function userCollection(uid: string, key: string) {
  return collection(db(), 'users', uid, key);
}

export async function getGymProfile(uid: string): Promise<GymProfile | null> {
  const snap = await getDoc(userDoc(uid, 'profile'));
  if (!snap.exists()) return null;
  return snap.data() as GymProfile;
}

export async function upsertGymProfile(uid: string, profile: Omit<GymProfile, 'uid'>): Promise<void> {
  await setDoc(
    userDoc(uid, 'profile'),
    {
      ...profile,
      uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getWorkoutLogs(uid: string): Promise<WorkoutLog[]> {
  const q = query(userCollection(uid, 'gymWorkoutLogs'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkoutLog, 'id'>) }));
}

export async function createWorkoutLog(
  uid: string,
  input: Omit<WorkoutLog, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const ref = doc(userCollection(uid, 'gymWorkoutLogs'));
  await setDoc(ref, {
    ...input,
    uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getWeightLogs(uid: string): Promise<WeightLog[]> {
  const q = query(userCollection(uid, 'gymWeightLogs'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeightLog, 'id'>) }));
}

export async function createWeightLog(uid: string, date: string, weightKg: number): Promise<string> {
  const ref = doc(userCollection(uid, 'gymWeightLogs'));
  await setDoc(ref, { uid, date, weightKg, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getMeasurementLogs(uid: string): Promise<MeasurementLog[]> {
  const q = query(userCollection(uid, 'gymMeasurements'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MeasurementLog, 'id'>) }));
}

export async function createMeasurementLog(
  uid: string,
  input: Omit<MeasurementLog, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const ref = doc(userCollection(uid, 'gymMeasurements'));
  await setDoc(ref, { ...input, uid, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getProgressPhotos(uid: string): Promise<ProgressPhotoLog[]> {
  const q = query(userCollection(uid, 'gymPhotos'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProgressPhotoLog, 'id'>) }));
}

export async function createProgressPhoto(
  uid: string,
  input: Omit<ProgressPhotoLog, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const ref = doc(userCollection(uid, 'gymPhotos'));
  await setDoc(ref, { ...input, uid, createdAt: serverTimestamp() });
  return ref.id;
}

export async function getChecklist(uid: string, dateKey: string): Promise<DailyChecklist | null> {
  const snap = await getDoc(doc(db(), 'users', uid, 'gymChecklist', dateKey));
  if (!snap.exists()) return null;
  return { dateKey, ...(snap.data() as Omit<DailyChecklist, 'dateKey'>) };
}

export async function upsertChecklist(
  uid: string,
  dateKey: string,
  data: Partial<Omit<DailyChecklist, 'dateKey' | 'updatedAt'>>
): Promise<void> {
  await setDoc(
    doc(db(), 'users', uid, 'gymChecklist', dateKey),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function toggleChecklistItem(
  uid: string,
  dateKey: string,
  key: keyof Omit<DailyChecklist, 'dateKey' | 'updatedAt'>
): Promise<void> {
  const current = await getChecklist(uid, dateKey);
  await setDoc(
    doc(db(), 'users', uid, 'gymChecklist', dateKey),
    {
      [key]: !current?.[key],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
