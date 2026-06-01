import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/db';
import { normalizePhone } from '@/lib/utils';
import { User } from '@/types/user';

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as User;
}

export async function updateUser(
  uid: string,
  data: Partial<User>
): Promise<void> {
  const batch = writeBatch(db());
  const userRef = doc(db(), 'users', uid);

  batch.update(userRef, data);

  if (data.name || data.phone) {
    const update: Record<string, string> = {};
    if (data.name) update.name = data.name;
    if (data.phone) update.phone = normalizePhone(data.phone);

    const tripQ = query(
      collection(db(), 'tripMembers'),
      where('userId', '==', uid)
    );
    const tripSnap = await getDocs(tripQ);
    tripSnap.docs.forEach((d) => batch.update(d.ref, update));

    const roomQ = query(
      collection(db(), 'roomMembers'),
      where('userId', '==', uid)
    );
    const roomSnap = await getDocs(roomQ);
    roomSnap.docs.forEach((d) => batch.update(d.ref, update));
  }

  await batch.commit();
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
    const q = query(
      collection(db(), 'users'),
      where('phone', '==', normalizedPhone)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  }
  return null;
}
