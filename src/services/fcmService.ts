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

let warmPushPromise: Promise<void> | null = null;

/** Preload VAPID, messaging, and SW so the permission tap only waits on getToken. */
export function warmPushInfrastructure(): void {
  if (typeof window === 'undefined') return;
  if (!warmPushPromise) {
    warmPushPromise = (async () => {
      await getVapidKey();
      await getMessaging();
      await getServiceWorkerRegistration();
    })().catch((err) => {
      console.warn('FCM warm-up failed:', err);
      warmPushPromise = null;
    });
  }
}

async function awaitWarmPush(): Promise<void> {
  warmPushInfrastructure();
  if (warmPushPromise) await warmPushPromise;
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

/** Remove stale Workbox sw.js left from older deploys (breaks FCM on Vercel). */
async function unregisterWorkboxServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        const scriptUrl =
          registration.active?.scriptURL ??
          registration.installing?.scriptURL ??
          registration.waiting?.scriptURL ??
          '';
        const isWorkboxSw =
          scriptUrl.includes('/sw.js') &&
          !scriptUrl.includes('firebase-messaging-sw');
        if (isWorkboxSw) {
          await registration.unregister();
        }
      })
    );
  } catch (error) {
    console.warn('FCM: could not unregister old service workers:', error);
  }
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  await unregisterWorkboxServiceWorkers();

  // Always prefer firebase-messaging-sw.js — Workbox sw.js precache fails on Vercel.
  const scripts = ['/firebase-messaging-sw.js', '/sw.js'];

  for (const script of scripts) {
    try {
      const registration = await navigator.serviceWorker.register(script);
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.warn(`FCM: service worker registration failed for ${script}:`, error);
    }
  }

  return null;
}

export type FCMTokenResult = {
  token: string | null;
  error?:
    | 'not_supported'
    | 'vapid_missing'
    | 'permission_denied'
    | 'service_worker_failed'
    | 'get_token_failed'
    | 'save_failed';
  message: string;
};

function formatFcmError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export type NotificationPermissionResult = {
  granted: boolean;
  permission: NotificationPermission | 'unsupported';
  message: string;
  /** True when the browser will not show the Allow/Block prompt (already denied). */
  blocked: boolean;
};

function permissionDismissedMessage(): string {
  return 'Tap Allow when your browser asks to enable notifications.';
}

function permissionBlockedMessage(): string {
  return 'Notifications are blocked for this site. Allow them in browser settings, then tap Try again.';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Must be the FIRST await inside a click/tap handler (or started from onPointerDown on mobile).
 * Mobile Chrome rejects Notification.requestPermission() after other async work (user gesture expires).
 */
export async function requestNotificationPermissionOnGesture(): Promise<NotificationPermissionResult> {
  if (typeof Notification === 'undefined') {
    return {
      granted: false,
      permission: 'unsupported',
      message: 'Notifications are not available in this browser.',
      blocked: false,
    };
  }

  const current = Notification.permission;
  if (current === 'granted') {
    return { granted: true, permission: 'granted', message: '', blocked: false };
  }

  const wasBlocked = current === 'denied';
  const permission = wasBlocked ? 'denied' : await Notification.requestPermission();
  if (permission === 'granted') {
    return { granted: true, permission: 'granted', message: '', blocked: false };
  }

  const blocked = wasBlocked || permission === 'denied';
  return {
    granted: false,
    permission,
    message: blocked ? permissionBlockedMessage() : permissionDismissedMessage(),
    blocked,
  };
}

/** Fires when the user changes notification permission in browser settings. */
export function watchNotificationPermission(
  onChange: (permission: NotificationPermission) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return () => {};
  }

  let status: PermissionStatus | null = null;
  const handler = () => {
    if (!status) return;
    const state = status.state;
    onChange(state === 'prompt' ? 'default' : (state as NotificationPermission));
  };

  navigator.permissions
    .query({ name: 'notifications' })
    .then((result) => {
      status = result;
      result.addEventListener('change', handler);
    })
    .catch(() => {});

  return () => {
    status?.removeEventListener('change', handler);
  };
}

export async function requestFCMToken(uid: string): Promise<FCMTokenResult> {
  if (typeof Notification === 'undefined') {
    return {
      token: null,
      error: 'not_supported',
      message: 'Notifications are not available in this environment.',
    };
  }

  if (Notification.permission !== 'granted') {
    const blocked = Notification.permission === 'denied';
    return {
      token: null,
      error: 'permission_denied',
      message: blocked ? permissionBlockedMessage() : permissionDismissedMessage(),
    };
  }

  await awaitWarmPush();

  const messaging = await getMessaging();
  if (!messaging) {
    const message =
      'Push notifications are not supported in this browser. On iPhone, add the app to your Home Screen first (iOS 16.4+).';
    console.warn('FCM:', message);
    return { token: null, error: 'not_supported', message };
  }

  const vapidKey = await getVapidKey();
  if (!vapidKey) {
    const message =
      'VAPID key is missing. Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to .env.local, run: node scripts/generate-messaging-sw.js, then restart the dev server.';
    console.warn('FCM:', message);
    return { token: null, error: 'vapid_missing', message };
  }

  try {

    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      const message =
        process.env.NODE_ENV === 'development'
          ? 'Service worker failed to register. Try: DevTools → Application → Service Workers → Unregister all, then hard refresh (Ctrl+Shift+R).'
          : 'Service worker failed to register. Try clearing site data and reloading the app.';
      return { token: null, error: 'service_worker_failed', message };
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return {
        token: null,
        error: 'get_token_failed',
        message:
          'Firebase did not return a device token. Unregister service workers in DevTools, hard refresh, and try again.',
      };
    }

    try {
      const userRef = doc(getFirebaseDb(), 'users', uid);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokens: arrayUnion(token),
        notifyEnabled: true,
      });
    } catch (saveError) {
      console.warn('FCM: failed to save token to Firestore:', saveError);
      return {
        token: null,
        error: 'save_failed',
        message: `Token was created but could not be saved: ${formatFcmError(saveError)}`,
      };
    }

    return { token, message: 'Push notifications registered successfully.' };
  } catch (error) {
    const detail = formatFcmError(error);
    console.warn('FCM token registration failed:', error);
    return {
      token: null,
      error: 'get_token_failed',
      message: `Could not register for push: ${detail}`,
    };
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

export async function sendFitTrackInviteNotification(
  targetUserId: string,
  ownerName: string
): Promise<{ sent: boolean }> {
  try {
    const fn = httpsCallable<
      { targetUserId: string; ownerName: string },
      { sent: boolean }
    >(getFirebaseFunctions(), 'sendFitTrackInvite');

    const result = await fn({ targetUserId, ownerName });
    return { sent: result.data.sent };
  } catch (error) {
    console.warn('FitTrack invite notification failed (deploy Cloud Functions):', error);
    return { sent: false };
  }
}

export async function sendRoomInviteNotification(
  targetUserId: string,
  roomId: string,
  roomName: string
): Promise<{ sent: boolean }> {
  try {
    const fn = httpsCallable<
      { targetUserId: string; roomId: string; roomName: string },
      { sent: boolean }
    >(getFirebaseFunctions(), 'sendRoomInvite');

    const result = await fn({ targetUserId, roomId, roomName });
    return { sent: result.data.sent };
  } catch (error) {
    console.warn('Room invite notification failed (deploy Cloud Functions):', error);
    return { sent: false };
  }
}
