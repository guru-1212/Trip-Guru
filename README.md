# FitTrack

Gym workout, water and nutrition tracker built with Next.js 14, Firebase, and Tailwind CSS. Installable as a PWA with push reminders.

## Features

- Firebase Auth (email/password; sign in with email or mobile)
- Weekly training split with rotation-aware "today" (Push / Pull / Legs presets, classic splits, custom days)
- Pre-session exercise picker with muscle-coverage body map, recommended exercises, and any-muscle-group browsing
- Live workout logging: sets, reps, rest timer, drag-to-reorder, mid-session add/remove, PRs
- History, weekly recap, progress charts, body distribution map, recovery map, progress photos
- Water tracker with scheduled reminders; diet tracker with Indian food database, macros and AI import
- Training partners (share a plan with a gym buddy)
- Push notifications via Cloud Functions (gym reminders, water reminders, partner invites)
- Optional Google Calendar sync for water/meal reminders
- Dark mode

## Prerequisites

- Node.js 18+
- npm
- Firebase project with Auth, Firestore, Storage, and Cloud Messaging enabled

## Setup

### 1. Install

```bash
npm install
```

### 2. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → **Email/Password** (Google is only used for the optional Calendar link)
3. Create **Firestore** database (production mode)
4. Enable **Storage**
5. Enable **Cloud Messaging** and generate a Web Push certificate (VAPID key)
6. Register a **Web app** and copy config values

### 3. Firebase project link

Copy `.firebaserc.example` to `.firebaserc` and set your project ID.

### 4. Environment variables

Copy `.env.local.example` to `.env.local` and fill in values from Firebase Console → Project settings → Your apps:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

Run `npm run messaging-sw` after changing these so `public/firebase-messaging-sw.js` picks up the config (the `dev` and `build` scripts do this automatically).

### 5. Deploy Firestore rules, indexes, Storage, and Functions

```bash
npx -y firebase-tools@latest login
cd functions && npm install && cd ..
npm run firebase:deploy
```

### 6. PWA icons

- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512.png`

### 7. Run

```bash
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # FitTrack + diet-import unit tests
```

## Firestore layout

Everything is per user under `users/{uid}`:

| Path | Description |
|------|-------------|
| `users/{uid}` | Account profile, FCM tokens, `fittrackLinkedOwnerId` |
| `users/{uid}/fittrack/profile` | FitTrack profile incl. `weekSchedule` |
| `users/{uid}/fittrack/state` | PRs, habits, goals, checklist, per-split picks, active workout |
| `users/{uid}/fittrackWorkouts/{id}` | Completed sessions |
| `users/{uid}/fittrackCustomExercises`, `fittrackBodyStats`, `fittrackProgressPhotos`, `fittrackReminders` | Supporting collections |
| `users/{uid}/waterSettings`, `waterLogs`, `waterReminders` | Water tracker |
| `users/{uid}/nutrition*` | Diet tracker |
| `fittrackPartners/{ownerId}_{partnerId}` | Training partner invites |
| `globalFoods` | Shared food database |

## Push notifications

Cloud Functions in `functions/`:

| Function | Purpose |
|----------|---------|
| `sendFitTrackInvite` | Notifies a user when invited as a training partner |
| `onFitTrackWorkoutCreated` | "Workout saved" push + schedules the protein reminder |
| `onFitTrackProfileWritten` | Reschedules pre-gym reminders when the profile/schedule changes |
| `onWaterSettingsWritten`, `onWaterLogWritten` | Water reminder scheduling, goal + streak pushes |
| `dispatchFitTrackReminders` | Every 5 minutes, sends due gym and water reminders |
| `rescheduleWaterRemindersCallable` | Client-triggered reschedule |

## Tech stack

- Next.js 14 App Router (TypeScript)
- Tailwind CSS + shadcn/ui (Radix)
- Framer Motion
- Redux Toolkit (auth only) + React context for FitTrack data
- React Hook Form + Zod
- Firebase (Auth, Firestore, Storage, FCM, Cloud Functions)
- Recharts, dayjs, html2canvas, xlsx, next-pwa

## License

MIT
