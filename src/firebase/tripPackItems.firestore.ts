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
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import {
  TripPackItem,
  TripPackStatus,
} from '@/types/tripPackItem';

export async function getTripPackItems(tripId: string): Promise<TripPackItem[]> {
  const q = query(
    collection(db(), 'tripPackItems'),
    where('tripId', '==', tripId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TripPackItem));
}

export async function createTripPackItem(
  item: Omit<TripPackItem, 'id' | 'createdAt' | 'packedAt'>
): Promise<string> {
  const ref = doc(collection(db(), 'tripPackItems'));
  await setDoc(ref, {
    ...item,
    packedAt: item.status === 'packed' ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createTripPackItemsBatch(
  items: Omit<TripPackItem, 'id' | 'createdAt' | 'packedAt'>[]
): Promise<string[]> {
  const batch = writeBatch(db());
  const ids: string[] = [];
  for (const item of items) {
    const ref = doc(collection(db(), 'tripPackItems'));
    ids.push(ref.id);
    batch.set(ref, {
      ...item,
      packedAt: null,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return ids;
}

export async function updateTripPackItem(
  itemId: string,
  data: Partial<
    Pick<
      TripPackItem,
      | 'title'
      | 'category'
      | 'itemType'
      | 'quantity'
      | 'note'
      | 'assignedToMemberKey'
      | 'status'
    >
  >
): Promise<void> {
  const patch: Record<string, unknown> = { ...data };
  if (data.status === 'packed') {
    patch.packedAt = serverTimestamp();
  } else if (data.status === 'todo' || data.status === 'ready') {
    patch.packedAt = null;
  }
  await updateDoc(doc(db(), 'tripPackItems', itemId), patch);
}

export async function setTripPackItemStatus(
  itemId: string,
  status: TripPackStatus
): Promise<void> {
  await updateTripPackItem(itemId, { status });
}

export async function deleteTripPackItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db(), 'tripPackItems', itemId));
}
