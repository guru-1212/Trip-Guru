/* Auto-generated — do not edit. Run: node scripts/generate-messaging-sw.js */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBjSas18bsO6_S67Su23oUN7Nt7hN2BKec',
  authDomain: 'trip-planner-gurunath-h.firebaseapp.com',
  projectId: 'trip-planner-gurunath-h',
  storageBucket: 'trip-planner-gurunath-h.firebasestorage.app',
  messagingSenderId: '790808381962',
  appId: '1:790808381962:web:ccc07395fcda28720dadf3',
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
