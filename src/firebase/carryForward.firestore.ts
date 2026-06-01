import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { CarryForwardBalance } from '@/types/roomSettlement';

export async function getCarryForwardBalances(
  roomId: string,
  status?: CarryForwardBalance['status']
): Promise<CarryForwardBalance[]> {
  let q = query(
    collection(db(), 'carryForwardBalances'),
    where('roomId', '==', roomId)
  );
  if (status) {
    q = query(
      collection(db(), 'carryForwardBalances'),
      where('roomId', '==', roomId),
      where('status', '==', status)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CarryForwardBalance));
}

export async function upsertCarryForward(
  data: Omit<CarryForwardBalance, 'id' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const ref = data.id
    ? doc(db(), 'carryForwardBalances', data.id)
    : doc(collection(db(), 'carryForwardBalances'));
  const { id: _id, ...rest } = data;
  await setDoc(
    ref,
    {
      ...rest,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return ref.id;
}

export async function updateCarryForwardStatus(
  id: string,
  status: CarryForwardBalance['status'],
  amount?: number
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (amount !== undefined) update.amount = amount;
  await updateDoc(doc(db(), 'carryForwardBalances', id), update);
}
