import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import type { TargetAttempt } from '@/workout/targets';

/**
 * Target attempts live in their own collection rather than on the state doc:
 * a year of twice-weekly sessions is ~100 records and would make the state doc
 * a hot document. Targets themselves stay on the state doc — see FitTrackStateDoc.
 *
 * Queries here are single-field, so no composite index is required.
 */
function targetAttemptsCol(uid: string) {
  return collection(db(), 'users', uid, 'fittrackTargetAttempts');
}

export async function getFitTrackTargetAttempts(uid: string): Promise<TargetAttempt[]> {
  const q = query(targetAttemptsCol(uid), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TargetAttempt, 'id'>) }));
}

export async function saveFitTrackTargetAttempt(
  uid: string,
  attempt: TargetAttempt
): Promise<void> {
  await setDoc(doc(targetAttemptsCol(uid), attempt.id), {
    ...attempt,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Merge-patch used while a session is in progress, so each logged set is durable
 * without rewriting the whole record.
 */
export async function patchFitTrackTargetAttempt(
  uid: string,
  id: string,
  patch: Partial<TargetAttempt>
): Promise<void> {
  await setDoc(
    doc(targetAttemptsCol(uid), id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteFitTrackTargetAttempt(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(targetAttemptsCol(uid), id));
}

/** Removes every attempt for a target — used when the target itself is deleted. */
export async function deleteFitTrackTargetAttempts(uid: string, targetId: string): Promise<void> {
  const snap = await getDocs(query(targetAttemptsCol(uid), where('targetId', '==', targetId)));
  if (snap.empty) return;
  const batch = writeBatch(db());
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
