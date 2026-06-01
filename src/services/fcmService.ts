import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
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

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    // PWA (next-pwa) registers /sw.js and imports firebase-messaging-sw.js
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return navigator.serviceWorker.register('/sw.js');
  } catch {
    try {
      return navigator.serviceWorker.register('/firebase-messaging-sw.js');
    } catch {
      return null;
    }
  }
}

export async function requestFCMToken(uid: string): Promise<string | null> {
  const messaging = await getMessaging();
  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push disabled.');
    return null;
  }

  try {
    if (typeof Notification === 'undefined') return null;
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return null;

    const registration = await getServiceWorkerRegistration();
    if (!registration) return null;

    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      const userRef = doc(getFirebaseDb(), 'users', uid);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokens: arrayUnion(token),
        notifyEnabled: true,
      });
    }
    return token;
  } catch (error) {
    console.warn('FCM token registration failed:', error);
    return null;
  }
}

export function openNotificationTarget(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  const path = url.startsWith('/') ? url : `/${url}`;
  window.location.href = path;
}

export async function onForegroundMessage(
  callback: (payload: unknown) => void
): Promise<(() => void) | null> {
  const messaging = await getMessaging();
  if (!messaging) return null;
  return onMessage(messaging, callback);
}

/** Notify room members (callable; also backed by onRoomAuditLogCreated when functions are deployed). */
export async function notifyRoomMembersOfExpense(
  roomId: string,
  amount: number,
  category: string,
  paidByName: string,
  title?: string
): Promise<void> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'onRoomExpenseCreated');
    await fn({
      roomId,
      amount,
      category,
      paidByName,
      title: title ?? category,
    });
  } catch (error) {
    console.warn('Room expense notification failed:', error);
  }
}

export async function notifyRoomMembersOfActivity(
  roomId: string,
  title: string,
  body: string,
  path?: string
): Promise<void> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'onRoomActivityNotify');
    await fn({ roomId, title, body, path: path ?? '' });
  } catch (error) {
    console.warn('Room activity notification failed:', error);
  }
}

export async function notifyTripMembersOfExpense(
  tripId: string,
  amount: number,
  category: string,
  paidByName: string,
  title?: string
): Promise<void> {
  try {
    const fn = httpsCallable(getFirebaseFunctions(), 'onExpenseCreated');
    await fn({
      tripId,
      amount,
      category,
      paidByName,
      title: title ?? category,
    });
  } catch (error) {
    console.warn('Trip expense notification failed:', error);
  }
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
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
