/**
 * Generates public/firebase-messaging-sw.js with Firebase config from .env.local
 * Run: node scripts/generate-messaging-sw.js
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
  const title = payload.notification?.title || 'TripMate';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192x192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tripId = event.notification.data?.tripId;
  const url = tripId ? '/trips/' + tripId : '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
`;

const out = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.writeFileSync(out, content);
console.log('Wrote', out);
