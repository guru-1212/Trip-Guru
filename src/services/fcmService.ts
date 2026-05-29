import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseDb, getFirebaseFunctions } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';

let messagingInstance: Messaging | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function getMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    if (!messagingInstance) {
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch {
    return null;
  }
}

export async function requestFCMToken(uid: string): Promise<string | null> {
  const messaging = await getMessaging();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  try {
    if (typeof Notification === 'undefined') return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      ),
    });

    if (token) {
      await updateDoc(doc(getFirebaseDb(), 'users', uid), { fcmToken: token });
    }
    return token;
  } catch (error) {
    console.warn('FCM token registration failed:', error);
    return null;
  }
}

export async function onForegroundMessage(
  callback: (payload: unknown) => void
): Promise<(() => void) | null> {
  const messaging = await getMessaging();
  if (!messaging) return null;
  return onMessage(messaging, callback);
}

export async function sendTripInviteNotification(
  targetUserId: string,
  tripId: string,
  tripName: string
): Promise<{ sent: boolean }> {
  try {
    const fn = httpsCallable<
      { targetUserId: string; tripId: string; tripName: string },
      { sent: boolean }
    >(getFirebaseFunctions(), 'sendTripInvite');

    const result = await fn({ targetUserId, tripId, tripName });
    return { sent: result.data.sent };
  } catch (error) {
    console.warn('Trip invite notification failed (deploy Cloud Functions):', error);
    return { sent: false };
  }
}

export async function notifyTripMembersOfExpense(
  tripId: string,
  amount: number,
  category: string,
  paidByName: string
): Promise<void> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'onExpenseCreated');
    await fn({ tripId, amount, category, paidByName });
  } catch {
    // Non-blocking; functions may not be deployed yet
  }
}
