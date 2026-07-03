import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let publicConfigCache: Partial<FirebaseClientConfig> | null = null;
let configReady = false;

function envConfig(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

function resolvedConfig(): FirebaseClientConfig {
  const fromEnv = envConfig();
  if (fromEnv.apiKey) return fromEnv;

  const fromPublic = publicConfigCache ?? {};
  return {
    apiKey: fromPublic.apiKey ?? '',
    authDomain: fromPublic.authDomain ?? '',
    projectId: fromPublic.projectId ?? '',
    storageBucket: fromPublic.storageBucket ?? '',
    messagingSenderId: fromPublic.messagingSenderId ?? '',
    appId: fromPublic.appId ?? '',
  };
}

function assertFirebaseConfig(config: FirebaseClientConfig): void {
  if (!config.apiKey) {
    throw new Error(
      'Firebase API key is missing. Add NEXT_PUBLIC_FIREBASE_* to .env.local, run: node scripts/generate-messaging-sw.js, then rebuild (npm run build).'
    );
  }
}

/** Load /firebase-config.json when build-time env vars are missing (e.g. old production build). */
export async function ensureFirebaseConfig(): Promise<void> {
  if (configReady) return;

  const fromEnv = envConfig();
  if (fromEnv.apiKey) {
    configReady = true;
    return;
  }

  if (typeof window === 'undefined') {
    configReady = true;
    return;
  }

  try {
    const res = await fetch('/firebase-config.json', { cache: 'no-store' });
    if (res.ok) {
      publicConfigCache = (await res.json()) as Partial<FirebaseClientConfig>;
    }
  } catch {
    // fall through to assert below
  }

  assertFirebaseConfig(resolvedConfig());
  configReady = true;
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let firebaseFunctions: Functions | undefined;

function initFirebase(): FirebaseApp {
  if (app) return app;
  if (typeof window === 'undefined') {
    throw new Error('Firebase must be initialized on the client');
  }

  const firebaseConfig = resolvedConfig();
  assertFirebaseConfig(firebaseConfig);

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Offline-first: IndexedDB-backed cache queues writes while offline and
  // auto-syncs on reconnect; onSnapshot reads are served from cache offline.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Firestore already started, or IndexedDB unavailable (e.g. private mode /
    // older browser) — fall back to the default in-memory cache so the app still loads.
    db = getFirestore(app);
  }
  storage = getStorage(app);
  firebaseFunctions = getFunctions(app);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) initFirebase();
  return auth!;
}

export function getFirebaseDb(): Firestore {
  if (!db) initFirebase();
  return db!;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) initFirebase();
  return storage!;
}

export function getFirebaseFunctions(): Functions {
  if (!firebaseFunctions) initFirebase();
  return firebaseFunctions!;
}

export default app;
