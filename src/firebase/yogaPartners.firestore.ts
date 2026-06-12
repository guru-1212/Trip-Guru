import {
  collection,
  doc,
  deleteField,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { findUserByEmailOrPhone, getUser } from '@/firebase/users.firestore';
import type { YogaMate } from '@/types/yoga';
import type { User } from '@/types/user';

export async function inviteYogaMate(
  ownerId: string,
  invitedBy: string,
  member: { name: string; email: string }
): Promise<string | null> {
  const normalizedEmail = member.email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email is required');

  const matchedUserId = await findUserByEmailOrPhone(normalizedEmail, '');
  if (matchedUserId === ownerId) {
    throw new Error('You cannot invite yourself');
  }

  if (matchedUserId) {
    const existingPartner = await getDoc(
      doc(db(), 'yogaPartners', `${ownerId}_${matchedUserId}`)
    );
    if (existingPartner.exists()) {
      throw new Error('This user is already a yoga mate');
    }
  }

  const pendingQ = query(
    collection(db(), 'yogaPartners'),
    where('ownerId', '==', ownerId),
    where('partnerEmail', '==', normalizedEmail),
    where('inviteStatus', '==', 'pending')
  );
  const pendingSnap = await getDocs(pendingQ);
  if (!pendingSnap.empty) {
    throw new Error('An invite is already pending for this email');
  }

  let partnerName = member.name.trim();
  if (matchedUserId) {
    const user = await getUser(matchedUserId);
    if (user) partnerName = user.name;
  }

  const memberDocId = matchedUserId
    ? `${ownerId}_${matchedUserId}`
    : doc(collection(db(), 'yogaPartners')).id;

  await writeBatch(db())
    .set(doc(db(), 'yogaPartners', memberDocId), {
      ownerId,
      partnerId: matchedUserId || null,
      partnerEmail: normalizedEmail,
      partnerName,
      inviteStatus: 'pending',
      invitedBy,
    })
    .commit();

  return matchedUserId;
}

export async function getPendingYogaInvitesForUser(
  email: string
): Promise<YogaMate[]> {
  if (!email) return [];

  const normalizedEmail = email.trim().toLowerCase();
  const q = query(
    collection(db(), 'yogaPartners'),
    where('partnerEmail', '==', normalizedEmail),
    where('inviteStatus', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as YogaMate));
}

export async function acceptYogaMate(
  memberId: string,
  partnerUid: string
): Promise<void> {
  const memberRef = doc(db(), 'yogaPartners', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const ownerId = memberSnap.data().ownerId as string;
  const newMemberId = `${ownerId}_${partnerUid}`;
  const user = await getUser(partnerUid);
  
  const updatedData: Record<string, any> = {
    ...memberSnap.data(),
    partnerId: partnerUid,
    inviteStatus: 'accepted',
  };

  if (user) {
    updatedData.partnerName = user.name;
  }

  const batch = writeBatch(db());

  if (memberId !== newMemberId) {
    batch.set(doc(db(), 'yogaPartners', newMemberId), updatedData);
    batch.delete(memberRef);
  } else {
    batch.update(memberRef, updatedData);
  }

  await batch.commit();
}

export async function declineYogaMate(memberId: string): Promise<void> {
  await deleteDoc(doc(db(), 'yogaPartners', memberId));
}

export async function getYogaMatesForOwner(
  ownerId: string
): Promise<YogaMate[]> {
  const q = query(
    collection(db(), 'yogaPartners'),
    where('ownerId', '==', ownerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as YogaMate));
}

export async function removeYogaMate(
  ownerId: string,
  partnerId: string
): Promise<void> {
  await deleteDoc(doc(db(), 'yogaPartners', `${ownerId}_${partnerId}`));
}
