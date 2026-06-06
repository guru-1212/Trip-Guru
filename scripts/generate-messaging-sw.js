/**
 * Generates public/firebase-messaging-sw.js with Firebase config from .env.local
 * Run: node scripts/generate-messaging-sw.js
 * Imported by next-pwa service worker via next.config.js importScripts
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function loadEnv() {
  const root = path.join(__dirname, '..');
  return {
    ...loadEnvFile(path.join(root, '.env')),
    ...loadEnvFile(path.join(root, '.env.local')),
  };
}

function escJsString(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

const env = loadEnv();

const firebaseKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missing = firebaseKeys.filter((k) => !env[k]);
if (missing.length > 0) {
  console.warn(
    'Warning: missing in .env.local — background push will not work:',
    missing.join(', ')
  );
}

const content = `/* Auto-generated — do not edit. Run: node scripts/generate-messaging-sw.js */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '${escJsString(env.NEXT_PUBLIC_FIREBASE_API_KEY)}',
  authDomain: '${escJsString(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)}',
  projectId: '${escJsString(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)}',
  storageBucket: '${escJsString(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)}',
  messagingSenderId: '${escJsString(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)}',
  appId: '${escJsString(env.NEXT_PUBLIC_FIREBASE_APP_ID)}',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'TripMate';
  const body = payload.notification?.body || payload.data?.body || '';
  const data = payload.data || {};
  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: data.type || 'tripmate',
    data,
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = data.url || '/dashboard';
  if (!data.url && data.roomId) {
    url = '/rooms/' + data.roomId;
    if (data.path) url += data.path;
  } else if (!data.url && data.tripId) {
    url = '/trips/' + data.tripId + (data.path || '/expenses');
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
`;

const out = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.writeFileSync(out, content);
console.log('Wrote', out);

const vapid = (env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '').trim();
const pushConfigPath = path.join(__dirname, '..', 'public', 'push-config.json');
fs.writeFileSync(
  pushConfigPath,
  JSON.stringify(
    {
      vapidKey: vapid,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    },
    null,
    2
  )
);
console.log('Wrote', pushConfigPath);

const firebaseConfigPath = path.join(__dirname, '..', 'public', 'firebase-config.json');
fs.writeFileSync(
  firebaseConfigPath,
  JSON.stringify(
    {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    },
    null,
    2
  )
);
console.log('Wrote', firebaseConfigPath);

if (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.log('Firebase project:', env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}
if (!vapid) {
  console.warn(
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing — add Web Push key from Firebase Console > Cloud Messaging'
  );
} else if (vapid.length < 80) {
  console.warn(
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY looks too short (' +
      vapid.length +
      ' chars). Copy the full key pair from Firebase Console.'
  );
}
