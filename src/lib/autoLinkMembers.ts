import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';

export async function autoLinkMembersOnRegister(
  uid: string,
  email: string,
  phone: string
): Promise<number> {
  const membersRef = collection(getFirebaseDb(), 'tripMembers');
  let linked = 0;

  const queries = [];
  if (email) {
    queries.push(
      query(
        membersRef,
        where('email', '==', email.toLowerCase()),
        where('inviteStatus', '==', 'pending')
      )
    );
  }
  if (phone) {
    queries.push(
      query(
        membersRef,
        where('phone', '==', phone),
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
        inviteStatus: 'accepted',
      });
      linked++;
    }
  }

  return linked;
}
