import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseDb, getFirebaseFunctions } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';

let messagingInstance: Messaging | null = null;
let cachedVapidKey: string | null | undefined;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function normalizeVapidKey(key: string | undefined | null): string | null {
  const trimmed = key?.trim() ?? '';
  return trimmed.length >= 80 ? trimmed : null;
}

/** VAPID is public; load from build env or /push-config.json (generated at build). */
export async function getVapidKey(): Promise<string | null> {
  const fromEnv = normalizeVapidKey(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
  if (fromEnv) return fromEnv;

  if (cachedVapidKey !== undefined) {
    return cachedVapidKey;
  }

  if (typeof window === 'undefined') {
    cachedVapidKey = null;
    return null;
  }

  try {
    const res = await fetch('/push-config.json', { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { vapidKey?: string };
      cachedVapidKey = normalizeVapidKey(data.vapidKey);
      return cachedVapidKey;
    }
  } catch {
    // ignore
  }

  cachedVapidKey = null;
  return null;
}

export async function isPushConfigured(): Promise<boolean> {
  return (await getVapidKey()) !== null;
}

export type PushSetupStatus = {
  configured: boolean;
  permission: NotificationPermission | 'unsupported';
  hasToken: boolean;
  messagingSupported: boolean;
};

export async function getPushSetupStatus(
  uid: string | undefined,
  userFcmToken?: string
): Promise<PushSetupStatus> {
  const configured = await isPushConfigured();
  const permission =
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  let messagingSupported = false;
  if (typeof window !== 'undefined') {
    try {
      const { isSupported } = await import('firebase/messaging');
      messagingSupported = await isSupported();
    } catch {
      messagingSupported = false;
    }
  }

  return {
    configured,
    permission,
    hasToken: Boolean(userFcmToken?.trim()),
    messagingSupported,
  };
}

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
    await navigator.serviceWorker.register('/sw.js').catch(() => null);
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch {
    try {
      return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    } catch {
      return null;
    }
  }
}

export async function requestFCMToken(uid: string): Promise<string | null> {
  const messaging = await getMessaging();
  if (!messaging) {
    console.warn('FCM: messaging not supported in this browser.');
    return null;
  }

  const vapidKey = await getVapidKey();
  if (!vapidKey) {
    console.warn(
      'FCM: VAPID key missing. Run: node scripts/generate-messaging-sw.js then rebuild, or set NEXT_PUBLIC_FIREBASE_VAPID_KEY.'
    );
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
