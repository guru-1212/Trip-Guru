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
import { RoomBringItem, RoomBringStatus } from '@/types/roomBringItem';

export async function getRoomBringItems(
  roomId: string,
  cycleId?: string
): Promise<RoomBringItem[]> {
  let q = query(
    collection(db(), 'roomBringItems'),
    where('roomId', '==', roomId)
  );
  if (cycleId) {
    q = query(
      collection(db(), 'roomBringItems'),
      where('roomId', '==', roomId),
      where('cycleId', '==', cycleId)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomBringItem));
}

export async function createRoomBringItem(
  item: Omit<RoomBringItem, 'id' | 'createdAt' | 'broughtAt'>
): Promise<string> {
  const ref = doc(collection(db(), 'roomBringItems'));
  await setDoc(ref, {
    ...item,
    broughtAt: item.status === 'brought' ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRoomBringItem(
  itemId: string,
  data: Partial<
    Pick<
      RoomBringItem,
      | 'title'
      | 'category'
      | 'estimatedAmount'
      | 'quantity'
      | 'note'
      | 'assignedToMemberKey'
      | 'status'
    >
  >
): Promise<void> {
  const patch: Record<string, unknown> = { ...data };
  if (data.status === 'brought') {
    patch.broughtAt = serverTimestamp();
  } else if (data.status === 'planned') {
    patch.broughtAt = null;
  }
  await updateDoc(doc(db(), 'roomBringItems', itemId), patch);
}

export async function setRoomBringItemStatus(
  itemId: string,
  status: RoomBringStatus
): Promise<void> {
  await updateRoomBringItem(itemId, { status });
}

export async function deleteRoomBringItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db(), 'roomBringItems', itemId));
}
