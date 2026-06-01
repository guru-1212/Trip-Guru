import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { Cycle } from '@/types/cycle';

export async function getCyclesForRoom(roomId: string): Promise<Cycle[]> {
  const q = query(collection(db(), 'cycles'), where('roomId', '==', roomId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cycle));
}

export async function getActiveCycle(roomId: string): Promise<Cycle | null> {
  const q = query(
    collection(db(), 'cycles'),
    where('roomId', '==', roomId),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Cycle;
}

export async function createCycleForMonth(
  roomId: string,
  month: number,
  year: number
): Promise<string> {
  const ref = doc(collection(db(), 'cycles'));
  await setDoc(ref, {
    roomId,
    month,
    year,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function closeCycle(cycleId: string): Promise<void> {
  await updateDoc(doc(db(), 'cycles', cycleId), { status: 'closed' });
}

export async function ensureActiveCycle(roomId: string): Promise<Cycle> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const active = await getActiveCycle(roomId);
  if (active && active.month === month && active.year === year) {
    return active;
  }

  const batch = writeBatch(db());
  if (active) {
    batch.update(doc(db(), 'cycles', active.id), { status: 'closed' });
  }

  const allCycles = await getCyclesForRoom(roomId);
  const existing = allCycles.find((c) => c.month === month && c.year === year);
  if (existing) {
    if (existing.status !== 'active') {
      await updateDoc(doc(db(), 'cycles', existing.id), { status: 'active' });
    }
    return { ...existing, status: 'active' };
  }

  const ref = doc(collection(db(), 'cycles'));
  batch.set(ref, {
    roomId,
    month,
    year,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  await batch.commit();

  return {
    id: ref.id,
    roomId,
    month,
    year,
    status: 'active',
    createdAt: Timestamp.now(),
  };
}

export function formatCycleLabel(cycle: Cycle): string {
  const date = new Date(cycle.year, cycle.month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}
