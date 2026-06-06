import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { normalizePhone } from '@/lib/utils';

export async function autoLinkMembersOnRegister(
  uid: string,
  email: string,
  phone: string,
  name: string
): Promise<number> {
  const db = getFirebaseDb();
  const collections = ['tripMembers', 'roomMembers'] as const;
  let linked = 0;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  const seenIds = new Set<string>();

  for (const coll of collections) {
    const membersRef = collection(db, coll);
    const collQueries = [];
    if (normalizedEmail) {
      collQueries.push(
        query(
          membersRef,
          where('email', '==', normalizedEmail),
          where('inviteStatus', '==', 'pending')
        )
      );
    }
    if (normalizedPhone) {
      collQueries.push(
        query(
          membersRef,
          where('phone', '==', normalizedPhone),
          where('inviteStatus', '==', 'pending')
        )
      );
    }

    for (const q of collQueries) {
      const snapshot = await getDocs(q);
      for (const memberDoc of snapshot.docs) {
        const key = `${coll}_${memberDoc.id}`;
        if (seenIds.has(key)) continue;
        seenIds.add(key);

        await updateDoc(doc(db, coll, memberDoc.id), {
          userId: uid,
          name,
          inviteStatus: 'accepted',
        });
        linked++;
      }
    }
  }

  if (normalizedEmail) {
    const fittrackQ = query(
      collection(db, 'fittrackPartners'),
      where('partnerEmail', '==', normalizedEmail),
      where('inviteStatus', '==', 'pending')
    );
    const fittrackSnap = await getDocs(fittrackQ);
    if (!fittrackSnap.empty) {
      const memberDoc = fittrackSnap.docs[0];
      const data = memberDoc.data();
      const ownerId = data.ownerId as string;
      const newMemberId = `${ownerId}_${uid}`;
      const updatedData = {
        ...data,
        partnerId: uid,
        partnerName: name,
        inviteStatus: 'accepted',
      };

      const batch = writeBatch(db);
      if (memberDoc.id !== newMemberId) {
        batch.set(doc(db, 'fittrackPartners', newMemberId), updatedData);
        batch.delete(memberDoc.ref);
      } else {
        batch.update(memberDoc.ref, updatedData);
      }
      batch.update(doc(db, 'users', uid), { fittrackLinkedOwnerId: ownerId });
      await batch.commit();
      linked++;
    }
  }

  return linked;
}
