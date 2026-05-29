# TripMate Project Instructions

Foundational guidance for the TripMate repository.

## Core Mandates

- **Architecture:** Next.js 14 App Router (TypeScript).
- **Styling:** Tailwind CSS + shadcn/ui. Use `src/components/ui` for base components.
- **State Management:** Redux Toolkit (`src/features`, `src/store`).
- **Backend/Database:** Firebase (Auth, Firestore, Storage).
- **Forms:** React Hook Form + Zod for validation.
- **Type Safety:** Always use types from `src/types`.

## Technical Patterns

### 1. PWA & Installation
- **Service Worker:** Managed by `next-pwa`. Configured in `next.config.js`.
- **Install Prompt:** Custom logic in `src/components/common/PWAInstallPrompt.tsx` handles the `beforeinstallprompt` event.
- **Manifest:** Located at `public/manifest.json`. Defines app identity and standalone behavior.

### 2. Data Access (Firestore)
- **Centralized Logic:** All Firestore interactions must reside in `src/firebase/firestore.ts`.
- **Normalization:** Normalize phone numbers using `normalizePhone` from `@/lib/utils`.
- **Atomic Operations:** Use `writeBatch` for multi-document updates (e.g., creating a trip with members).
- **Timestamps:** Use `serverTimestamp()` for `createdAt` fields.

### 2. Feature Organization
- **State & Thunks:** Define feature-specific state and async logic in `src/features/{featureName}/`.
- **Components:** Feature-specific UI components belong in `src/components/{featureName}/`.
- **Hooks:** Common logic should be abstracted into custom hooks in `src/hooks/`.

### 3. Routing & Pages
- Pages are located in `src/app/`.
- Use dynamic routes for trip-specific pages: `src/app/trips/[tripId]`.
- Auth-protected routes should be grouped in `(auth)`.

### 4. Utilities & Services
- **Lib:** Core algorithms (e.g., `settlementAlgorithm.ts`) and shared utils reside in `src/lib/`.
- **Services:** External integrations like FCM or background status checkers go in `src/services/`.

## Development Workflows

### Environment Setup
- Copy `.env.local.example` to `.env.local` and fill in Firebase credentials.
- Ensure `VAPID_KEY` is set for Cloud Messaging.

### Service Workers
- Run `npm run messaging-sw` after updating environment variables to generate the FCM service worker.

### Deployment
- Deploy Firebase rules and functions: `npm run firebase:deploy`.
- Standard build: `npm run build`.

## UI/UX Standards
- Use **Framer Motion** for animations (see `fade-in-up` in `tailwind.config.ts`).
- Adhere to the theme colors defined in `tailwind.config.ts` (primary: `#6366F1`).
- Support Dark Mode via the `dark` class.

## Testing & Validation
- Ensure all new features are typed.
- Validate forms using Zod schemas.
- Verify Firestore rules in `firestore.rules` when adding new collections.

## Recent Incident Notes (Profile Photo Upload 403)

- **Symptom:** Uploading profile photo from `/profile` failed with `403 Forbidden` from Firebase Storage (`POST .../o?name=users%2F{uid}%2Fprofile.jpg`).
- **Root Cause:** Firestore rules were deployed earlier, but Storage rules were not deployed for the active project.
- **Code Path:** Upload uses `src/firebase/storage.ts` -> `uploadProfilePhoto(uid, file)` -> `uploadFile('users/${uid}/profile.${ext}')`.
- **Required Rule:** In `storage.rules`, keep `match /users/{userId}/{allPaths=**}` with `allow write: if request.auth.uid == userId;`.
- **Fix Applied:** Deployed storage rules with:
  - `npx -y firebase-tools@latest deploy --only storage --project trip-planner-gurunath-h`
- **Verification:** Deploy output confirmed `storage.rules compiled successfully` and `released rules ... to firebase.storage`.
- **If issue repeats:** Check Network response first; if still `403`, verify logged-in user token and that `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` points to the same Firebase project.
