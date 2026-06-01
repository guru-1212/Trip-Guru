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
import { CreateRoomAuditLogInput, RoomAuditLog } from '@/types/roomAuditLog';

export async function createRoomAuditLog(
  entry: CreateRoomAuditLogInput
): Promise<string> {
  const ref = doc(collection(db(), 'roomAuditLogs'));
  await setDoc(ref, {
    ...entry,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getRoomAuditLogs(
  roomId: string,
  max = 100
): Promise<RoomAuditLog[]> {
  const q = query(
    collection(db(), 'roomAuditLogs'),
    where('roomId', '==', roomId),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomAuditLog));
}
