import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
  User as FirebaseUser,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/firebase/config';
import { isEmail, normalizePhone } from '@/lib/utils';
import { getEmailByPhone, findUserByEmailOrPhone } from '@/firebase/users.firestore';
import { autoLinkPendingFitTrackInviteOnRegister } from '@/firebase/fittrackPartners.firestore';
import { getOrCreateAppCalendar } from '@/services/googleCalendarService';

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
    await autoLinkPendingFitTrackInviteOnRegister(result.user.uid, normalizedEmail, name);
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

/**
 * Links the current user with Google and requests Calendar scopes.
 */
export async function linkGoogleWithCalendarScope(): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.addScope('https://www.googleapis.com/auth/calendar');

  const currentUser = auth().currentUser;
  let result;

  if (currentUser) {
    const isLinked = currentUser.providerData.some(p => p.providerId === 'google.com');
    if (isLinked) {
      // If already linked, signInWithPopup will refresh the credential/token
      // without trying to link it again (which would throw an error).
      result = await signInWithPopup(auth(), provider);
    } else {
      // If not linked yet, link the accounts
      result = await linkWithPopup(currentUser, provider);
    }
  } else {
    // If not logged in, sign in with Google
    result = await signInWithPopup(auth(), provider);
  }

  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error('Failed to obtain Google access token.');
  }

  // Update user document to mark as linked
  const calendarId = await getOrCreateAppCalendar(accessToken);

  await updateDoc(doc(db(), 'users', result.user.uid), {
    googleCalendarLinked: true,
    googleCalendarId: calendarId,
  });

  return {
    user: result.user,
    accessToken,
  };
}

export { getFirebaseAuth as auth };
