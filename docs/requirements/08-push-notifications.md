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

Trigger: `onTripAuditLogCreated` on `tripAuditLogs` writes.

Covers any action that writes a trip audit log: packing items (add / update / pack / remove / batch), trip plan (save / reset), expenses (create / update / delete — actual only), members (add / remove).

Recipients: accepted `tripMembers` except `actorUid`. Respects `users.notifyEnabled`.

Also:

- `settlements` create (save to history) — notifies trip members except saver
- `settlements` update to `paid` — notifies trip members except who marked paid
- `sendTripInvite` callable — direct push when a matched user is added

## Gym / FitTrack notifications

- `users/{uid}/fittrackWorkouts/{id}` create — workout saved (personal push) + schedules protein reminder (20 min later)
- `users/{uid}/gymWorkoutLogs/{id}` create — legacy gym log (personal push)
- `users/{uid}/fittrack/profile` write — reschedules pre-gym reminders for next 7 training days
- `dispatchFitTrackReminders` scheduled function (every 5 min) — sends due queued reminders
- Rest timer uses local/service-worker notification when the app is open or backgrounded

### Gym reminder types (FCM `data.type`)

| Type | When | Deep link |
|------|------|-----------|
| `gym.reminder.pre_meal` | 2 hours before gym time (training days) | `/fittrack/checklist` |
| `gym.reminder.get_ready` | 1 hour before gym time (training days) | `/fittrack/workout` |
| `gym.reminder.protein` | 20 minutes after Finish Workout | `/fittrack/checklist` |
| `gym.workout_saved` | Workout saved to history | `/fittrack/dashboard` |

Requires: gym time + reminders enabled in **FitTrack Profile**, push enabled in **App Profile**.

## Room invites

- `sendRoomInvite` callable — direct push when a matched user is added to a room
- Other room activity still flows through `roomAuditLogs` → `onRoomAuditLogCreated`

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
