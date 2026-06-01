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
import { RoomSettlement } from '@/types/roomSettlement';

export async function getRoomSettlements(
  roomId: string
): Promise<RoomSettlement[]> {
  const q = query(
    collection(db(), 'roomSettlements'),
    where('roomId', '==', roomId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomSettlement));
}

export async function saveRoomSettlements(
  settlements: Omit<RoomSettlement, 'id'>[]
): Promise<void> {
  const batch = writeBatch(db());
  for (const s of settlements) {
    const ref = doc(collection(db(), 'roomSettlements'));
    batch.set(ref, {
      ...s,
      paidAt: s.paidAt ?? null,
    });
  }
  await batch.commit();
}

export async function markRoomSettlementPaid(
  settlementId: string
): Promise<void> {
  await updateDoc(doc(db(), 'roomSettlements', settlementId), {
    status: 'paid',
    paidAt: serverTimestamp(),
  });
}
