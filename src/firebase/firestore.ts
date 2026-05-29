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
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { normalizePhone } from '@/lib/utils';
import { Trip } from '@/types/trip';
import { TripMember } from '@/types/member';
import { Expense } from '@/types/expense';
import { Settlement } from '@/types/settlement';
import { Memory } from '@/types/memory';
import { User } from '@/types/user';
import { calculateEqualSplit } from '@/lib/splitCalculator';

const db = () => getFirebaseDb();

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export async function updateUser(
  uid: string,
  data: Partial<User>
): Promise<void> {
  await updateDoc(doc(db(), 'users', uid), data);
}

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

  const trips: Trip[] = [];
  for (const tripId of tripIds) {
    const trip = await getTrip(tripId);
    if (trip) trips.push(trip);
  }
  return trips;
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

export async function getEmailByPhone(phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return null;

  const q = query(collection(db(), 'users'), where('phone', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return (snap.docs[0].data().email as string) || null;
}

export async function findUserByEmailOrPhone(
  email: string,
  phone: string
): Promise<string | null> {
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const q = query(
      collection(db(), 'users'),
      where('email', '==', normalizedEmail)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  }
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const q = query(collection(db(), 'users'), where('phone', '==', normalizedPhone));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  }
  return null;
}

export interface CreateTripInput {
  tripName: string;
  tripType: Trip['tripType'];
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
}

export async function createTrip(input: CreateTripInput): Promise<string> {
  const tripRef = doc(collection(db(), 'trips'));
  const tripId = tripRef.id;
  const batch = writeBatch(db());

  batch.set(tripRef, {
    tripId,
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
    createdAt: serverTimestamp(),
    classification: 'real',
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
    const memberUserId = matchedUserId;
    const memberDocId = memberUserId
      ? `${tripId}_${memberUserId}`
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
  return tripId;
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

  // 1. Redistribute Equal Split expenses
  for (const exp of expenses) {
    if (exp.splitType === 'equal') {
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

  // 2. Decrement trip member count
  const tripRef = doc(db(), 'trips', tripId);
  batch.update(tripRef, {
    membersCount: increment(-1),
  });

  // 3. Delete member
  batch.delete(memberRef);

  await batch.commit();
}

export async function saveSettlements(
  settlements: Settlement[]
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
    });
  }
  await batch.commit();
}

export async function markSettlementPaid(settlementId: string): Promise<void> {
  await updateDoc(doc(db(), 'settlements', settlementId), {
    status: 'paid',
    paidAt: serverTimestamp(),
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

  if (memberId !== newMemberId) {
    const batch = writeBatch(db());
    batch.set(doc(db(), 'tripMembers', newMemberId), {
      ...memberSnap.data(),
      userId,
      inviteStatus: 'accepted',
    });
    batch.delete(memberRef);
    await batch.commit();
  } else {
    await updateDoc(memberRef, {
      userId,
      inviteStatus: 'accepted',
    });
  }
}

export async function declineTripInvite(memberId: string): Promise<void> {
  const memberRef = doc(db(), 'tripMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;

  const batch = writeBatch(db());
  const tripRef = doc(db(), 'trips', memberSnap.data().tripId);

  batch.update(tripRef, {
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
    const existingUids = exp.splitBetween.map((s) => s.uid);
    if (!existingUids.includes(newMemberKey)) {
      const updatedUids = [...existingUids, newMemberKey];
      const newSplit = calculateEqualSplit(exp.amount, updatedUids);

      batch.update(doc(db(), 'expenses', exp.id), {
        splitBetween: newSplit,
      });
      count++;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

export async function addMemberToTrip(
  tripId: string,
  member: { name: string; email: string; phone: string },
  recalculatePast: boolean
): Promise<string | null> {
  const normalizedEmail = member.email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(member.phone);

  const matchedUserId = await findUserByEmailOrPhone(normalizedEmail, normalizedPhone);
  const memberDocId = matchedUserId
    ? `${tripId}_${matchedUserId}`
    : doc(collection(db(), 'tripMembers')).id;

  const batch = writeBatch(db());

  batch.set(doc(db(), 'tripMembers', memberDocId), {
    tripId,
    userId: matchedUserId,
    name: member.name,
    email: normalizedEmail,
    phone: normalizedPhone,
    role: 'editor',
    inviteStatus: 'pending',
  });

  const tripRef = doc(db(), 'trips', tripId);
  batch.update(tripRef, {
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

export async function updateTripClassification(
  tripId: string,
  classification: 'real' | 'test'
): Promise<void> {
  await updateDoc(doc(db(), 'trips', tripId), { classification });
}
