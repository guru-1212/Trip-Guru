import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { RoomExpense } from '@/types/roomExpense';

export async function getRoomExpenses(
  roomId: string,
  cycleId?: string
): Promise<RoomExpense[]> {
  let q = query(
    collection(db(), 'roomExpenses'),
    where('roomId', '==', roomId)
  );
  if (cycleId) {
    q = query(
      collection(db(), 'roomExpenses'),
      where('roomId', '==', roomId),
      where('cycleId', '==', cycleId)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomExpense));
}

export async function createRoomExpense(
  expense: Omit<RoomExpense, 'id' | 'createdAt'>
): Promise<string> {
  const ref = doc(collection(db(), 'roomExpenses'));
  await setDoc(ref, {
    ...expense,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRoomExpense(
  expenseId: string,
  data: Partial<RoomExpense>
): Promise<void> {
  await updateDoc(doc(db(), 'roomExpenses', expenseId), data);
}

export async function deleteRoomExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db(), 'roomExpenses', expenseId));
}
