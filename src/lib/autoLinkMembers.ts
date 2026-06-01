import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { normalizePhone } from '@/lib/utils';

export async function autoLinkMembersOnRegister(
  uid: string,
  email: string,
  phone: string,
  name: string
): Promise<number> {
  const membersRef = collection(getFirebaseDb(), 'tripMembers');
  let linked = 0;

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  const queries = [];
  if (normalizedEmail) {
    queries.push(
      query(
        membersRef,
        where('email', '==', normalizedEmail),
        where('inviteStatus', '==', 'pending')
      )
    );
  }
  if (normalizedPhone) {
    queries.push(
      query(
        membersRef,
        where('phone', '==', normalizedPhone),
        where('inviteStatus', '==', 'pending')
      )
    );
  }

  const seenIds = new Set<string>();

  for (const q of queries) {
    const snapshot = await getDocs(q);
    for (const memberDoc of snapshot.docs) {
      if (seenIds.has(memberDoc.id)) continue;
      seenIds.add(memberDoc.id);

      await updateDoc(doc(getFirebaseDb(), 'tripMembers', memberDoc.id), {
        userId: uid,
        name: name, // Sync real name on link
        inviteStatus: 'accepted',
      });
      linked++;
    }
  }

  return linked;
}
