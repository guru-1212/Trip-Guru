/**
 * Generates public/firebase-messaging-sw.js with Firebase config from .env.local
 * Run: node scripts/generate-messaging-sw.js
 * Imported by next-pwa service worker via next.config.js importScripts
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  if (!fs.existsSync(envPath)) {
    console.warn('No .env.local found — using placeholder config in SW');
    return env;
  }
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    });
  return env;
}

const env = loadEnv();

const content = `/* Auto-generated — do not edit. Run: node scripts/generate-messaging-sw.js */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '${env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}',
  authDomain: '${env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}',
  projectId: '${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}',
  storageBucket: '${env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}',
  messagingSenderId: '${env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}',
  appId: '${env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}',
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
