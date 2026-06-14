import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import {
  YogaPose,
  YogaFlow,
  YogaSessionLog,
  MeditationLog,
  PosturePhotoLog,
} from '@/types/yoga';

/**
 * Global Collections for Library
 */

export async function getYogaPoses(): Promise<YogaPose[]> {
  const snap = await getDocs(query(collection(db(), 'yogaPoses'), orderBy('name', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<YogaPose, 'id'>) }));
}

export async function createYogaPose(pose: Omit<YogaPose, 'id'>): Promise<string> {
  const ref = doc(collection(db(), 'yogaPoses'));
  await setDoc(ref, pose);
  return ref.id;
}

export async function updateYogaPose(id: string, updates: Partial<YogaPose>): Promise<void> {
  await setDoc(doc(db(), 'yogaPoses', id), updates, { merge: true });
}

export async function getYogaFlows(): Promise<YogaFlow[]> {
  const snap = await getDocs(query(collection(db(), 'yogaFlows'), orderBy('name', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<YogaFlow, 'id'>) }));
}

export async function getYogaFlow(id: string): Promise<YogaFlow | null> {
  const snap = await getDoc(doc(db(), 'yogaFlows', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<YogaFlow, 'id'>) };
}

export async function createYogaFlow(flow: Omit<YogaFlow, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(collection(db(), 'yogaFlows'));
  await setDoc(ref, {
    ...flow,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateYogaFlow(id: string, updates: Partial<YogaFlow>): Promise<void> {
  await setDoc(doc(db(), 'yogaFlows', id), updates, { merge: true });
}

/**
 * User-specific Collections for Tracking
 */

function userYogaCollection(uid: string, key: string) {
  return collection(db(), 'users', uid, key);
}

export async function getYogaSessionLogs(uid: string): Promise<YogaSessionLog[]> {
  const q = query(userYogaCollection(uid, 'yogaSessionLogs'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<YogaSessionLog, 'id'>) }));
}

export async function createYogaSessionLog(
  uid: string,
  input: Omit<YogaSessionLog, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const ref = doc(userYogaCollection(uid, 'yogaSessionLogs'));
  await setDoc(ref, {
    ...input,
    uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getMeditationLogs(uid: string): Promise<MeditationLog[]> {
  const q = query(userYogaCollection(uid, 'meditationLogs'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MeditationLog, 'id'>) }));
}

export async function createMeditationLog(
  uid: string,
  input: Omit<MeditationLog, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const ref = doc(userYogaCollection(uid, 'meditationLogs'));
  await setDoc(ref, {
    ...input,
    uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getPosturePhotoLogs(uid: string): Promise<PosturePhotoLog[]> {
  const q = query(userYogaCollection(uid, 'yogaPosturePhotos'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PosturePhotoLog, 'id'>) }));
}

export async function createPosturePhotoLog(
  uid: string,
  input: Omit<PosturePhotoLog, 'id' | 'uid' | 'createdAt'>
): Promise<string> {
  const ref = doc(userYogaCollection(uid, 'yogaPosturePhotos'));
  await setDoc(ref, {
    ...input,
    uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
