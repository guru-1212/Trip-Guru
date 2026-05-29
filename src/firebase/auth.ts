import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/firebase/config';
import { autoLinkMembersOnRegister } from '@/lib/autoLinkMembers';
import { isEmail, normalizePhone } from '@/lib/utils';
import { getEmailByPhone, findUserByEmailOrPhone } from '@/firebase/firestore';

const auth = () => getFirebaseAuth();
const db = () => getFirebaseDb();

export async function signInWithEmailOrPhone(
  identifier: string,
  password: string
): Promise<FirebaseUser> {
  const trimmed = identifier.trim();
  let email: string;

  if (isEmail(trimmed)) {
    email = trimmed.toLowerCase();
  } else {
    const phoneEmail = await getEmailByPhone(trimmed);
    if (!phoneEmail) {
      throw new Error('No account found with this mobile number.');
    }
    email = phoneEmail.toLowerCase();
  }

  const result = await signInWithEmailAndPassword(auth(), email, password);
  return result.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  phone: string
): Promise<FirebaseUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone.length < 10) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }

  const result = await createUserWithEmailAndPassword(
    auth(),
    normalizedEmail,
    password
  );

  const existingPhoneUser = await findUserByEmailOrPhone('', normalizedPhone);
  if (existingPhoneUser && existingPhoneUser !== result.user.uid) {
    await deleteUser(result.user);
    throw new Error('An account with this mobile number already exists.');
  }

  try {
    await updateProfile(result.user, { displayName: name });
    await createUserDocument(result.user, name, normalizedPhone);
    await autoLinkMembersOnRegister(result.user.uid, normalizedEmail, normalizedPhone);
    return result.user;
  } catch (error) {
    try {
      await deleteUser(result.user);
    } catch {
      // Auth user may already be deleted
    }
    throw error;
  }
}

async function createUserDocument(
  user: FirebaseUser,
  name: string,
  phone: string
): Promise<void> {
  await setDoc(doc(db(), 'users', user.uid), {
    uid: user.uid,
    name,
    email: (user.email ?? '').toLowerCase(),
    phone,
    photoURL: user.photoURL ?? '',
    fcmToken: '',
    notifyEnabled: true,
    createdAt: serverTimestamp(),
  });
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth());
}

export { getFirebaseAuth as auth };
