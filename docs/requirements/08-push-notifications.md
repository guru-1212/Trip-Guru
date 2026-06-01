# Push notifications (FCM)

## Behavior

- **Background / PWA closed**: Firebase Cloud Messaging via service worker (`firebase-messaging-sw.js` imported into `sw.js`).
- **Foreground**: `FCMProvider` shows a system notification; click opens the target page.
- **Server**: Cloud Functions Firestore triggers — not dependent on the client staying open.

## Room notifications

Trigger: `onRoomAuditLogCreated` on `roomAuditLogs` writes.

Covers any action that writes an audit log: expenses (create/update/delete), settlements, bring list, rent, members, cycle close.

Recipients: accepted `roomMembers` except `actorUid`. Respects `users.notifyEnabled`.

## Trip notifications

Triggers on `expenses` create / update / delete (actual expenses only).

## Client setup

1. `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local`
2. Run `node scripts/generate-messaging-sw.js` after env changes
3. User enables notifications in **Profile** (registers token on `users` doc: `fcmToken`, `fcmTokens`)

## Deploy

```bash
firebase deploy --only functions
```

Redeploy hosting/PWA after `generate-messaging-sw.js` so `sw.js` includes FCM handlers.

## Do not

- Rely only on client `httpsCallable` for room expense alerts (triggers are authoritative).
- Send duplicate client + server notifications for the same event.
