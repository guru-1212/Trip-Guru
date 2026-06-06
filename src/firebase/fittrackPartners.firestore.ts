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
import type { FitTrackPartner } from '@/types/fittrackPartner';
import type { User } from '@/types/user';

export function getFitTrackOwnerId(uid: string, user?: User | null): string {
  return user?.fittrackLinkedOwnerId ?? uid;
}

export async function resolveFitTrackOwnerId(uid: string): Promise<string> {
  const user = await getUser(uid);
  return getFitTrackOwnerId(uid, user);
}

export async function inviteFitTrackPartner(
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
    const matchedUser = await getUser(matchedUserId);
    if (matchedUser?.fittrackLinkedOwnerId && matchedUser.fittrackLinkedOwnerId !== ownerId) {
      throw new Error('This user is already linked to another training partner group');
    }
    const existingPartner = await getDoc(
      doc(db(), 'fittrackPartners', `${ownerId}_${matchedUserId}`)
    );
    if (existingPartner.exists()) {
      throw new Error('This user is already a training partner');
    }
  }

  const pendingQ = query(
    collection(db(), 'fittrackPartners'),
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
    : doc(collection(db(), 'fittrackPartners')).id;

  await writeBatch(db())
    .set(doc(db(), 'fittrackPartners', memberDocId), {
      ownerId,
      partnerId: matchedUserId,
      partnerEmail: normalizedEmail,
      partnerName,
      inviteStatus: 'pending',
      invitedBy,
    })
    .commit();

  return matchedUserId;
}

export async function getPendingFitTrackInvitesForUser(
  email: string
): Promise<FitTrackPartner[]> {
  if (!email) return [];

  const normalizedEmail = email.trim().toLowerCase();
  const q = query(
    collection(db(), 'fittrackPartners'),
    where('partnerEmail', '==', normalizedEmail),
    where('inviteStatus', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FitTrackPartner));
}

export async function acceptFitTrackPartner(
  memberId: string,
  partnerUid: string
): Promise<void> {
  const memberRef = doc(db(), 'fittrackPartners', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const ownerId = memberSnap.data().ownerId as string;
  const partnerUser = await getUser(partnerUid);

  if (partnerUser?.fittrackLinkedOwnerId && partnerUser.fittrackLinkedOwnerId !== ownerId) {
    throw new Error('You are already linked to another training partner group');
  }

  const newMemberId = `${ownerId}_${partnerUid}`;
  const user = await getUser(partnerUid);
  const updatedData: Record<string, unknown> = {
    ...memberSnap.data(),
    partnerId: partnerUid,
    inviteStatus: 'accepted',
  };

  if (user) {
    updatedData.partnerName = user.name;
  }

  const batch = writeBatch(db());

  if (memberId !== newMemberId) {
    batch.set(doc(db(), 'fittrackPartners', newMemberId), updatedData);
    batch.delete(memberRef);
  } else {
    batch.update(memberRef, updatedData);
  }

  batch.update(doc(db(), 'users', partnerUid), {
    fittrackLinkedOwnerId: ownerId,
  });

  await batch.commit();
}

export async function declineFitTrackPartner(memberId: string): Promise<void> {
  await deleteDoc(doc(db(), 'fittrackPartners', memberId));
}

export async function getFitTrackPartnersForOwner(
  ownerId: string
): Promise<FitTrackPartner[]> {
  const q = query(
    collection(db(), 'fittrackPartners'),
    where('ownerId', '==', ownerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FitTrackPartner));
}

export async function getAcceptedFitTrackPartners(
  ownerId: string
): Promise<FitTrackPartner[]> {
  const partners = await getFitTrackPartnersForOwner(ownerId);
  return partners.filter((p) => p.inviteStatus === 'accepted');
}

export async function removeFitTrackPartner(
  ownerId: string,
  partnerId: string
): Promise<void> {
  const memberRef = doc(db(), 'fittrackPartners', `${ownerId}_${partnerId}`);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const batch = writeBatch(db());
  batch.delete(memberRef);
  batch.update(doc(db(), 'users', partnerId), {
    fittrackLinkedOwnerId: deleteField(),
  });
  await batch.commit();
}

export async function cancelPendingFitTrackInvite(memberId: string): Promise<void> {
  const memberRef = doc(db(), 'fittrackPartners', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;
  if (memberSnap.data().inviteStatus !== 'pending') return;
  await deleteDoc(memberRef);
}
