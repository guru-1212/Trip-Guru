import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
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
