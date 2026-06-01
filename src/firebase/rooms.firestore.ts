import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { normalizePhone } from '@/lib/utils';
import { Room } from '@/types/room';
import { RoomMember } from '@/types/roomMember';
import { findUserByEmailOrPhone, getUser } from '@/firebase/users.firestore';
import { createCycleForMonth } from '@/firebase/cycles.firestore';

export async function getRoom(roomId: string): Promise<Room | null> {
  const snap = await getDoc(doc(db(), 'rooms', roomId));
  if (!snap.exists()) return null;
  return { roomId: snap.id, ...snap.data() } as Room;
}

export async function getRoomsForUser(userId: string): Promise<Room[]> {
  const membersQ = query(
    collection(db(), 'roomMembers'),
    where('userId', '==', userId),
    where('inviteStatus', '==', 'accepted')
  );
  const membersSnap = await getDocs(membersQ);
  const roomIds = Array.from(
    new Set(membersSnap.docs.map((d) => d.data().roomId as string))
  );

  const rooms: Room[] = [];
  for (const roomId of roomIds) {
    const room = await getRoom(roomId);
    if (room) rooms.push(room);
  }
  return rooms;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const q = query(
    collection(db(), 'roomMembers'),
    where('roomId', '==', roomId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoomMember));
}

export interface CreateRoomInput {
  name: string;
  currency: string;
  createdBy: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  members: { name: string; email: string; phone: string }[];
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const roomRef = doc(collection(db(), 'rooms'));
  const roomId = roomRef.id;
  const batch = writeBatch(db());

  const roomData: Omit<Room, 'roomId' | 'createdAt'> = {
    name: input.name,
    createdBy: input.createdBy,
    currency: input.currency,
    status: 'active',
    membersCount: input.members.length + 1,
  };

  batch.set(roomRef, {
    ...roomData,
    roomId,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db(), 'roomMembers', `${roomId}_${input.createdBy}`), {
    roomId,
    userId: input.createdBy,
    name: input.ownerName,
    email: input.ownerEmail.trim().toLowerCase(),
    phone: normalizePhone(input.ownerPhone),
    role: 'owner',
    inviteStatus: 'accepted',
  });

  for (const member of input.members) {
    const normalizedEmail = member.email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(member.phone);
    const matchedUserId = await findUserByEmailOrPhone(
      normalizedEmail,
      normalizedPhone
    );
    const memberDocId = matchedUserId
      ? `${roomId}_${matchedUserId}`
      : doc(collection(db(), 'roomMembers')).id;

    batch.set(doc(db(), 'roomMembers', memberDocId), {
      roomId,
      userId: matchedUserId,
      name: member.name,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: 'editor',
      inviteStatus: 'pending',
    });
  }

  await batch.commit();

  const now = new Date();
  await createCycleForMonth(roomId, now.getMonth() + 1, now.getFullYear());

  return {
    ...roomData,
    roomId,
    createdAt: Timestamp.now(),
  };
}

export async function getPendingRoomInvitesForUser(
  email: string,
  phone: string
): Promise<RoomMember[]> {
  const results: RoomMember[] = [];
  const seen = new Set<string>();

  if (email) {
    const q = query(
      collection(db(), 'roomMembers'),
      where('email', '==', email.trim().toLowerCase()),
      where('inviteStatus', '==', 'pending')
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        results.push({ id: d.id, ...d.data() } as RoomMember);
      }
    });
  }

  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const q = query(
      collection(db(), 'roomMembers'),
      where('phone', '==', normalizedPhone),
      where('inviteStatus', '==', 'pending')
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        results.push({ id: d.id, ...d.data() } as RoomMember);
      }
    });
  }

  return results;
}

export async function acceptRoomInvite(
  memberId: string,
  userId: string
): Promise<void> {
  const memberRef = doc(db(), 'roomMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const roomId = memberSnap.data().roomId as string;
  const newMemberId = `${roomId}_${userId}`;
  const user = await getUser(userId);
  const updatedData: Record<string, unknown> = {
    ...memberSnap.data(),
    userId,
    inviteStatus: 'accepted',
  };
  if (user) {
    updatedData.name = user.name;
    updatedData.phone = user.phone;
  }

  if (memberId !== newMemberId) {
    const batch = writeBatch(db());
    batch.set(doc(db(), 'roomMembers', newMemberId), updatedData);
    batch.delete(memberRef);
    await batch.commit();
  } else {
    await updateDoc(memberRef, updatedData);
  }
}

export async function declineRoomInvite(memberId: string): Promise<void> {
  const memberRef = doc(db(), 'roomMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const batch = writeBatch(db());
  batch.update(doc(db(), 'rooms', memberSnap.data().roomId), {
    membersCount: increment(-1),
  });
  batch.delete(memberRef);
  await batch.commit();
}

export async function addMemberToRoom(
  roomId: string,
  member: { name: string; email: string; phone: string }
): Promise<string> {
  const normalizedEmail = member.email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(member.phone);
  const matchedUserId = await findUserByEmailOrPhone(
    normalizedEmail,
    normalizedPhone
  );

  let memberName = member.name;
  if (matchedUserId) {
    const user = await getUser(matchedUserId);
    if (user) memberName = user.name;
  }

  const memberDocId = matchedUserId
    ? `${roomId}_${matchedUserId}`
    : doc(collection(db(), 'roomMembers')).id;

  const batch = writeBatch(db());
  batch.set(doc(db(), 'roomMembers', memberDocId), {
    roomId,
    userId: matchedUserId,
    name: memberName,
    email: normalizedEmail,
    phone: normalizedPhone,
    role: 'editor',
    inviteStatus: matchedUserId ? 'accepted' : 'pending',
  });
  batch.update(doc(db(), 'rooms', roomId), { membersCount: increment(1) });
  await batch.commit();
  return memberDocId;
}

export async function removeRoomMember(memberId: string): Promise<void> {
  const memberRef = doc(db(), 'roomMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const batch = writeBatch(db());
  batch.update(doc(db(), 'rooms', memberSnap.data().roomId), {
    membersCount: increment(-1),
  });
  batch.delete(memberRef);
  await batch.commit();
}
