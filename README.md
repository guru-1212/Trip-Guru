# TripMate

Group travel expense tracking and settlement platform built with Next.js 14, Firebase, Redux Toolkit, and Tailwind CSS.

## Features

- Firebase Auth (email/password; sign in with email or mobile)
- Trip management with auto status transitions (planned → ongoing → completed)
- Expense tracking with 4 split types: equal, unequal, percent, single
- Debt simplification settlement algorithm
- Real-time Firestore sync for expenses and members
- Trip memories (photos, videos, notes, voice)
- Analytics charts and PDF/Excel export
- PWA support via next-pwa
- Dark mode

## Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Auth, Firestore, Storage, and Cloud Messaging enabled

## Setup

### 1. Clone and install

```bash
cd tripmate
npm install
```

### 2. Firebase project

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → **Email/Password** only (Google sign-in is not used)
3. Create **Firestore** database (production mode)
4. Enable **Storage**
5. Enable **Cloud Messaging** and generate a Web Push certificate (VAPID key)
6. Register a **Web app** and copy config values

### 3. Firebase project link

Copy `.firebaserc.example` to `.firebaserc` and set your project ID:

```bash
cp .firebaserc.example .firebaserc
```

### 4. Deploy Firestore rules, indexes, Storage, and Functions

```bash
npx -y firebase-tools@latest login
cd functions && npm install && cd ..

# Generate FCM service worker from .env.local
npm run messaging-sw

npx -y firebase-tools@latest deploy --only firestore,storage,functions
```

Or use the npm script:

```bash
npm run firebase:deploy
```

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

### 6. PWA icons

Add PNG icons at:

- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512.png`

### 7. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Production build

```bash
npm run build
npm start
```

## Firestore collections

| Collection     | Description                          |
|----------------|--------------------------------------|
| `users`        | User profiles and FCM tokens         |
| `trips`        | Trip metadata                        |
| `tripMembers`  | Members (doc ID: `{tripId}_{userId}`)|
| `expenses`     | Trip expenses                        |
| `settlements`  | Payment records                      |
| `memories`     | Photos, videos, notes                |

## Push notifications

Cloud Functions in `functions/`:

| Function | Purpose |
|----------|---------|
| `sendTripInvite` | Notifies a user when added to a trip |
| `onExpenseCreated` | Notifies trip members when a new expense is added |

The client registers FCM tokens on login and calls these via `httpsCallable`. Run `npm run messaging-sw` after updating `.env.local` so `public/firebase-messaging-sw.js` has your Firebase config.

## Tech stack

- Next.js 14 App Router (TypeScript)
- Tailwind CSS + shadcn/ui (Radix)
- Framer Motion
- Redux Toolkit
- React Hook Form + Zod
- Firebase (Auth, Firestore, Storage, FCM)
- Recharts, dayjs, jsPDF, xlsx, next-pwa

## License

MIT
