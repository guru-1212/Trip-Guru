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
import { RoomComputedSettlement } from '@/lib/settlementAlgorithm';

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

function settlementKey(
  fromMemberKey: string,
  toMemberKey: string,
  cycleId?: string
) {
  return `${cycleId ?? 'none'}:${fromMemberKey}:${toMemberKey}`;
}

/** Upsert computed settlements for a cycle; preserves awaiting_confirmation and paid. */
export async function syncRoomSettlements(
  roomId: string,
  cycleId: string | undefined,
  computed: RoomComputedSettlement[]
): Promise<RoomSettlement[]> {
  const existing = await getRoomSettlements(roomId);
  const batch = writeBatch(db());
  let writes = 0;
  const touchedKeys = new Set<string>();

  for (const c of computed) {
    const key = settlementKey(c.fromMemberKey, c.toMemberKey, cycleId);
    touchedKeys.add(key);

    const match = existing.find(
      (e) =>
        settlementKey(e.fromMemberKey, e.toMemberKey, e.cycleId) === key
    );

    if (match) {
      if (match.status === 'pending') {
        batch.update(doc(db(), 'roomSettlements', match.id), {
          amount: c.amount,
        });
        writes++;
      } else if (match.status === 'paid' && c.amount > 0.01) {
        batch.update(doc(db(), 'roomSettlements', match.id), {
          amount: c.amount,
          status: 'pending',
          paidAt: null,
          claimedAt: null,
          confirmedAt: null,
        });
        writes++;
      }
    } else {
      const ref = doc(collection(db(), 'roomSettlements'));
      const data: Omit<RoomSettlement, 'id'> = {
        roomId,
        cycleId,
        fromMemberKey: c.fromMemberKey,
        toMemberKey: c.toMemberKey,
        amount: c.amount,
        status: 'pending',
        source: 'computed',
        paidAt: null,
        claimedAt: null,
        confirmedAt: null,
      };
      batch.set(ref, data);
      writes++;
    }
  }

  if (writes > 0) {
    await batch.commit();
  }
  return getRoomSettlements(roomId);
}

/** @deprecated Use syncRoomSettlements */
export async function saveRoomSettlements(
  settlements: Omit<RoomSettlement, 'id'>[]
): Promise<void> {
  const batch = writeBatch(db());
  for (const s of settlements) {
    const ref = doc(collection(db(), 'roomSettlements'));
    batch.set(ref, {
      ...s,
      paidAt: s.paidAt ?? null,
      claimedAt: s.claimedAt ?? null,
      confirmedAt: s.confirmedAt ?? null,
    });
  }
  await batch.commit();
}

/** Debtor marks that they paid the creditor. */
export async function claimRoomSettlementPayment(
  settlementId: string
): Promise<void> {
  await updateDoc(doc(db(), 'roomSettlements', settlementId), {
    status: 'awaiting_confirmation',
    claimedAt: serverTimestamp(),
  });
}

/** Creditor confirms they received payment. */
export async function confirmRoomSettlementPayment(
  settlementId: string
): Promise<void> {
  await updateDoc(doc(db(), 'roomSettlements', settlementId), {
    status: 'paid',
    paidAt: serverTimestamp(),
    confirmedAt: serverTimestamp(),
  });
}
