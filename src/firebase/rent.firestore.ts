import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { RentPayment } from '@/types/roomSettlement';

export async function getRentPayments(
  roomId: string,
  cycleId: string
): Promise<RentPayment[]> {
  const q = query(
    collection(db(), 'rentPayments'),
    where('roomId', '==', roomId),
    where('cycleId', '==', cycleId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RentPayment));
}

export async function initRentPayments(
  roomId: string,
  cycleId: string,
  entries: { memberKey: string; amount: number }[]
): Promise<void> {
  const existing = await getRentPayments(roomId, cycleId);
  if (existing.length > 0) return;

  const batch = writeBatch(db());
  for (const entry of entries) {
    const ref = doc(collection(db(), 'rentPayments'));
    batch.set(ref, {
      roomId,
      cycleId,
      memberKey: entry.memberKey,
      amount: entry.amount,
      status: 'pending',
      paidAt: null,
    });
  }
  await batch.commit();
}

export async function markRentPaid(paymentId: string): Promise<void> {
  await updateDoc(doc(db(), 'rentPayments', paymentId), {
    status: 'paid',
    paidAt: serverTimestamp(),
  });
}

export async function updateRentPayment(
  paymentId: string,
  data: Partial<RentPayment>
): Promise<void> {
  await updateDoc(doc(db(), 'rentPayments', paymentId), data);
}

export async function setRentPaymentAmount(
  roomId: string,
  cycleId: string,
  memberKey: string,
  amount: number
): Promise<void> {
  const payments = await getRentPayments(roomId, cycleId);
  const existing = payments.find((p) => p.memberKey === memberKey);
  if (existing) {
    await updateDoc(doc(db(), 'rentPayments', existing.id), { amount });
  } else {
    const ref = doc(collection(db(), 'rentPayments'));
    await setDoc(ref, {
      roomId,
      cycleId,
      memberKey,
      amount,
      status: 'pending',
      paidAt: null,
    });
  }
}
