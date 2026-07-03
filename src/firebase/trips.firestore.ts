import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { normalizePhone } from '@/lib/utils';
import { Trip } from '@/types/trip';
import { TripMember } from '@/types/member';
import { Expense } from '@/types/expense';
import { Settlement } from '@/types/settlement';
import { Memory } from '@/types/memory';
import { User } from '@/types/user';
import { calculateEqualSplit } from '@/lib/splitCalculator';
import { findUserByEmailOrPhone, getUser } from '@/firebase/users.firestore';

export async function getTrip(tripId: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db(), 'trips', tripId));
  if (!snap.exists()) return null;
  return { tripId: snap.id, ...snap.data() } as Trip;
}

export async function getTripsForUser(userId: string): Promise<Trip[]> {
  const membersQ = query(
    collection(db(), 'tripMembers'),
    where('userId', '==', userId),
    where('inviteStatus', '==', 'accepted')
  );
  const membersSnap = await getDocs(membersQ);
  const tripIds = Array.from(
    new Set(membersSnap.docs.map((d) => d.data().tripId as string))
  );

  const fetched = await Promise.all(tripIds.map((tripId) => getTrip(tripId)));
  return fetched.filter((t): t is Trip => t !== null);
}

export async function getTripMembers(tripId: string): Promise<TripMember[]> {
  const q = query(collection(db(), 'tripMembers'), where('tripId', '==', tripId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TripMember));
}

export async function getExpenses(tripId: string): Promise<Expense[]> {
  const q = query(collection(db(), 'expenses'), where('tripId', '==', tripId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

export async function getSettlements(tripId: string): Promise<Settlement[]> {
  const q = query(
    collection(db(), 'settlements'),
    where('tripId', '==', tripId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Settlement));
}

export async function getMemories(tripId: string): Promise<Memory[]> {
  const q = query(collection(db(), 'memories'), where('tripId', '==', tripId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory));
}

export interface CreateTripInput {
  tripName: string;
  tripType: Trip['tripType'];
  classification: 'real' | 'test';
  destination: string;
  startDate: Date;
  endDate: Date;
  expectedBudget: number;
  currency: string;
  createdBy: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  members: { name: string; email: string; phone: string }[];
  googleCalendarEventId?: string;
}

export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const tripRef = doc(collection(db(), 'trips'));
  const tripId = tripRef.id;
  const batch = writeBatch(db());

  const tripData: Omit<Trip, 'tripId' | 'createdAt'> = {
    tripName: input.tripName,
    tripType: input.tripType,
    createdBy: input.createdBy,
    destination: input.destination,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    status: 'planned',
    expectedBudget: input.expectedBudget,
    currency: input.currency,
    membersCount: input.members.length + 1,
    classification: input.classification,
    googleCalendarEventId: input.googleCalendarEventId,
  };

  batch.set(tripRef, {
    ...tripData,
    tripId,
    createdAt: serverTimestamp(),
  });

  const ownerMemberId = `${tripId}_${input.createdBy}`;
  batch.set(doc(db(), 'tripMembers', ownerMemberId), {
    tripId,
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
      ? `${tripId}_${matchedUserId}`
      : doc(collection(db(), 'tripMembers')).id;

    batch.set(doc(db(), 'tripMembers', memberDocId), {
      tripId,
      userId: matchedUserId,
      name: member.name,
      email: normalizedEmail,
      phone: normalizedPhone,
      role: 'editor',
      inviteStatus: 'pending',
    });
  }

  await batch.commit();

  return {
    ...tripData,
    tripId,
    createdAt: Timestamp.now(),
  };
}

export async function createExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const ref = doc(collection(db(), 'expenses'));
  await setDoc(ref, {
    ...expense,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateExpense(
  expenseId: string,
  data: Partial<Expense>
): Promise<void> {
  await updateDoc(doc(db(), 'expenses', expenseId), data);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await deleteDoc(doc(db(), 'expenses', expenseId));
}

export async function removeTripMember(memberId: string): Promise<void> {
  const memberRef = doc(db(), 'tripMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const { tripId, userId } = memberSnap.data();
  const memberKey = userId ?? memberId;

  const expenses = await getExpenses(tripId);
  const batch = writeBatch(db());

  for (const exp of expenses) {
    if (exp.splitType === 'equal' && exp.splitBetween) {
      const uids = exp.splitBetween.map((s) => s.uid);
      if (uids.includes(memberKey)) {
        const remainingUids = uids.filter((uid) => uid !== memberKey);
        if (remainingUids.length > 0) {
          const newSplit = calculateEqualSplit(exp.amount, remainingUids);
          batch.update(doc(db(), 'expenses', exp.id), {
            splitBetween: newSplit,
          });
        }
      }
    }
  }

  batch.update(doc(db(), 'trips', tripId), {
    membersCount: increment(-1),
  });
  batch.delete(memberRef);
  await batch.commit();
}

export async function saveSettlements(
  settlements: Settlement[],
  savedBy?: string
): Promise<void> {
  const batch = writeBatch(db());
  for (const s of settlements) {
    const ref = doc(collection(db(), 'settlements'));
    batch.set(ref, {
      tripId: s.tripId,
      fromUid: s.fromUid,
      toUid: s.toUid,
      amount: s.amount,
      status: s.status,
      paidAt: s.paidAt,
      ...(savedBy ? { savedBy } : {}),
    });
  }
  await batch.commit();
}

export async function markSettlementPaid(
  settlementId: string,
  paidBy?: string
): Promise<void> {
  await updateDoc(doc(db(), 'settlements', settlementId), {
    status: 'paid',
    paidAt: serverTimestamp(),
    ...(paidBy ? { paidBy } : {}),
  });
}

export async function createMemory(
  memory: Omit<Memory, 'id' | 'createdAt'>
): Promise<string> {
  const ref = doc(collection(db(), 'memories'));
  await setDoc(ref, {
    ...memory,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await deleteDoc(doc(db(), 'memories', memoryId));
}

export async function updateTripStatus(
  tripId: string,
  status: Trip['status']
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), { status });
}

export async function syncTripData(tripId: string): Promise<void> {
  const members = await getTripMembers(tripId);
  const trip = await getTrip(tripId);
  if (!trip) return;

  if (trip.membersCount !== members.length) {
    await updateDoc(doc(db(), 'trips', tripId), {
      membersCount: members.length,
    });
  }
}

export async function getPendingInvitesForUser(
  email: string,
  phone: string
): Promise<TripMember[]> {
  const results: TripMember[] = [];
  const seen = new Set<string>();

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const q = query(
      collection(db(), 'tripMembers'),
      where('email', '==', normalizedEmail),
      where('inviteStatus', '==', 'pending')
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        results.push({ id: d.id, ...d.data() } as TripMember);
      }
    });
  }

  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const q = query(
      collection(db(), 'tripMembers'),
      where('phone', '==', normalizedPhone),
      where('inviteStatus', '==', 'pending')
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        results.push({ id: d.id, ...d.data() } as TripMember);
      }
    });
  }

  return results;
}

export async function acceptTripInvite(
  memberId: string,
  userId: string
): Promise<void> {
  const memberRef = doc(db(), 'tripMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const tripId = memberSnap.data().tripId as string;
  const newMemberId = `${tripId}_${userId}`;

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
    batch.set(doc(db(), 'tripMembers', newMemberId), updatedData);
    batch.delete(memberRef);
    await batch.commit();
  } else {
    await updateDoc(memberRef, updatedData);
  }
}

export async function declineTripInvite(memberId: string): Promise<void> {
  const memberRef = doc(db(), 'tripMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const batch = writeBatch(db());
  batch.update(doc(db(), 'trips', memberSnap.data().tripId), {
    membersCount: increment(-1),
  });
  batch.delete(memberRef);
  await batch.commit();
}

export async function recalculateEqualExpenses(
  tripId: string,
  newMemberKey: string
): Promise<void> {
  const expenses = await getExpenses(tripId);
  const equalExpenses = expenses.filter((e) => e.splitType === 'equal');

  const batch = writeBatch(db());
  let count = 0;

  for (const exp of equalExpenses) {
    const existingUids = exp.splitBetween?.map((s) => s.uid) || [];
    if (!existingUids.includes(newMemberKey)) {
      const updatedUids = [...existingUids, newMemberKey];
      const newSplit = calculateEqualSplit(exp.amount, updatedUids);
      batch.update(doc(db(), 'expenses', exp.id), {
        splitBetween: newSplit,
      });
      count++;
    }
  }

  if (count > 0) await batch.commit();
}

export async function addMemberToTrip(
  tripId: string,
  member: { name: string; email: string; phone: string },
  recalculatePast: boolean
): Promise<string | null> {
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
    ? `${tripId}_${matchedUserId}`
    : doc(collection(db(), 'tripMembers')).id;

  const batch = writeBatch(db());

  batch.set(doc(db(), 'tripMembers', memberDocId), {
    tripId,
    userId: matchedUserId,
    name: memberName,
    email: normalizedEmail,
    phone: normalizedPhone,
    role: 'editor',
    inviteStatus: matchedUserId ? 'accepted' : 'pending',
  });

  batch.update(doc(db(), 'trips', tripId), {
    membersCount: increment(1),
  });

  await batch.commit();

  const memberKey = matchedUserId ?? memberDocId;
  if (recalculatePast) {
    await recalculateEqualExpenses(tripId, memberKey);
  }

  return matchedUserId;
}

export async function updateTripCategory(
  tripId: string,
  category: string
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), { category });
}

export async function updateTrip(
  tripId: string,
  data: Partial<Trip>
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), data);
}

export async function updateTripExpectedBudget(
  tripId: string,
  expectedBudget: number
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), { expectedBudget });
}

export async function updateTripClassification(
  tripId: string,
  classification: 'real' | 'test'
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), { classification });
}

export async function addCustomExpenseCategory(
  tripId: string,
  category: string
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), {
    customExpenseCategories: arrayUnion(category),
  });
}

export async function removeCustomExpenseCategory(
  tripId: string,
  category: string
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), {
    customExpenseCategories: arrayRemove(category),
  });
}

export async function syncMemberProfile(
  tripId: string,
  userId: string,
  profile: Partial<User>
): Promise<void> {
  const memberId = `${tripId}_${userId}`;
  const memberRef = doc(db(), 'tripMembers', memberId);
  const snap = await getDoc(memberRef);

  if (snap.exists()) {
    const data = snap.data();
    if (
      (profile.name && data.name !== profile.name) ||
      (profile.phone && data.phone !== normalizePhone(profile.phone))
    ) {
      await updateDoc(memberRef, {
        name: profile.name,
        phone: profile.phone ? normalizePhone(profile.phone) : data.phone,
      });
    }
  }
}
