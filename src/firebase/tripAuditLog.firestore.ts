import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { CreateTripAuditLogInput, TripAuditLog } from '@/types/tripAuditLog';

export async function createTripAuditLog(
  entry: CreateTripAuditLogInput
): Promise<string> {
  const ref = doc(collection(db(), 'tripAuditLogs'));
  await setDoc(ref, {
    ...entry,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTripAuditLogs(
  tripId: string,
  max = 100
): Promise<TripAuditLog[]> {
  const q = query(
    collection(db(), 'tripAuditLogs'),
    where('tripId', '==', tripId),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TripAuditLog));
}
