# FitTrack — Agent Guide

**Read this before changing code.** FitTrack is a single-product gym app: workout logging, training splits, water and diet tracking, training partners, push reminders. The former Trips / Rooms / Yoga products were removed; do not reintroduce multi-workspace concepts (`activeMode`, `primaryUseCase`, workspace switchers).

---

## 1. Product map

| Area | Routes | Key code |
|------|--------|----------|
| Shell | `/fittrack/*` (`src/app/fittrack/layout.tsx`) | `FitTrackNavbar`, `WorkoutSidebar`, `WorkoutBottomNav`, `GlobalWorkoutTimer`, `GlobalRestTimer` |
| Workout | `/fittrack/workout`, `/fittrack/history`, `/fittrack/exercises` | `src/app/fittrack/workout/page.tsx`, `src/components/workout/*`, `src/workout/*` |
| Progress | `/fittrack/progress`, `/recap`, `/body`, `/weight`, `/progress-photos`, `/calendar`, `/analytics`, `/checklist` | `src/components/fittrack/*`, `src/workout/analytics.ts`, `recovery.ts`, `bodyDistribution.ts` |
| Water | `/fittrack/water` | `src/hooks/useWaterTracker.ts`, `src/components/water/*`, `src/firebase/water.firestore.ts` |
| Diet | `/fittrack/diet`, `/fittrack/food-database` | `src/hooks/useDietTracker.ts`, `src/components/nutrition/*`, `src/lib/nutrition/*` |
| Profile / account | `/fittrack/profile` | `src/components/profile/*` (account, push, Google Calendar), `TrainingPartnersSection` |
| Auth | `/login`, `/register` | `src/firebase/auth.ts`, `ProtectedRoute` |

`/`, `/dashboard` and `/profile` redirect to `/fittrack/...` for old bookmarks and installed PWAs.

## 2. Tech stack

- **Next.js 14** App Router, TypeScript, Tailwind, shadcn/ui (`src/components/ui`)
- **State:** `src/workout/WorkoutContext.tsx` (React context fed by Firestore `onSnapshot` in `src/hooks/useFitTrackSync.ts`). Redux holds **only** `auth` (`src/features/auth`, `useAuth()`).
- **Firebase:** Auth, Firestore, Storage, FCM, Cloud Functions (`functions/`). No REST API.
- **Forms:** React Hook Form + Zod (auth pages). **PWA:** `next-pwa`; `npm run messaging-sw` after env changes.
- Unit tests are plain `tsx` scripts: `npm test` runs `src/workout/fittrack.test.ts` and `src/lib/nutrition/dietImportParser.test.ts`.

## 3. Firestore layout

| Path | Contents |
|------|----------|
| `users/{uid}` | Account (`name`, `phone`, `photoURL`, `fcmToken(s)`, `notifyEnabled`, `fittrackLinkedOwnerId`, Google Calendar fields). Legacy `primaryUseCase` / `activeMode` / `enabledWorkspaces` may exist on old docs — ignore. |
| `users/{uid}/fittrack/profile` | `UserProfile` incl. `weekSchedule` (per-weekday `SplitId | SplitId[]`) |
| `users/{uid}/fittrack/state` | `FitTrackStateDoc`: PRs, habits, weekly goals, checklist, custom variations, `splitExtras`, `splitTodayPicks`, `splitSequenceLocked`, `activeWorkout`, `restDays` |
| `users/{uid}/fittrackWorkouts/{id}` | `WorkoutSession` (exercise order = array order) |
| `users/{uid}/fittrackCustomExercises`, `fittrackBodyStats`, `fittrackProgressPhotos`, `fittrackReminders` | supporting collections |
| `users/{uid}/waterSettings`, `waterLogs`, `waterReminders` · `users/{uid}/nutrition*` | water / diet |
| `fittrackPartners/{ownerId}_{partnerId}` | partner invites; partners read/write the owner's `users/{owner}/...` (see `firestore.rules`) |
| `globalFoods` | shared food database |

Data access: `src/firebase/*.firestore.ts`; the barrel `src/firebase/firestore.ts` re-exports users, partners, water, nutrition. `fittrack.firestore.ts` is imported directly.

## 4. Splits, exercises, recommendations

- `SplitId` (`src/workout/types.ts`) = `ct | bb | sh | ctbb | legs | core | coresh | legsh | push | pull | legscore | rest`. Definitions in `src/workout/constants.ts` (`SPLIT_DEFINITIONS`, `SPLIT_NAMES`, `SPLIT_ICONS`, `COMBINED_SPLIT_COMPONENTS`, `WEEK_SCHEDULE_PRESETS`, `MUSCLE_GROUPS`).
- Exercise pools: `getExercisesForSplit` (`src/workout/exerciseLibrary.ts`) — explicit id lists for `push`/`pull` (`EXPLICIT_SPLIT_MEMBERS`), `splitIds` tags otherwise, unions for combined splits. Anatomy in `muscleAnatomy.json` drives the body map (`muscleCoverage.ts`).
- Adding a split: extend `SplitId`, `SPLIT_DEFINITIONS`, `SPLIT_NAMES`, `SPLIT_ICONS`, `getMuscleFromSplit` / `getMuscleOrderForSplit` (`utils.ts`), `MERGED_MOBILITY_SPLITS` (`mobilityLibrary.ts`), `RECOMMENDED_EXERCISES` (`recommendedExercises.ts`); TS flags the `Record<SplitId, …>` maps. Firestore maps are `Partial<Record<SplitId, …>>` so new ids are additive.
- Curated recommendations: `src/workout/recommendedExercises.ts` (validated by tests against the library and split pools).
- "Today's" split is rotation-aware: `getScheduledSplitForDate` in `src/workout/utils.ts`.

## 5. Active workout invariants

- `ActiveWorkoutState.pickOrder` (`${exerciseId}::${variation}` keys) is the user's sequence; keep `exercises` in sync via `orderActiveWorkoutExercises` and save through it in `confirmFinish`. History/share read the saved array order.
- `addedExerciseIds` stores bare exercise ids; `pickOrder` stores composite keys.

## 6. Notifications

Cloud Functions (`functions/src/index.ts`): `sendFitTrackInvite`, `onFitTrackWorkoutCreated`, `onFitTrackProfileWritten`, `onWaterSettingsWritten`, `onWaterLogWritten`, `dispatchFitTrackReminders` (every 5 min), `rescheduleWaterRemindersCallable`. Helpers: `notifications.ts` (`sendPushToUser`, `sendMulticastPush` — always sets `data.url`), `fittrackReminders.ts`, `waterReminders.ts`.

Client: `src/services/fcmService.ts` (token lifecycle), `FCMProvider` (foreground toasts; opens `data.url`), `PushNotificationsCard` (opt-in UI), `public/firebase-messaging-sw.js` (generated by `scripts/generate-messaging-sw.js`).

## 7. Safe change checklist

1. `npx tsc --noEmit`
2. `npm test`
3. **`npm run build`** (required; catches lint + strict UI types that `tsc` alone may miss)
4. New Firestore queries → `firestore.indexes.json`; new storage paths → `storage.rules`; deploy with `npm run firebase:deploy`
5. `cd functions && npm run build` if functions changed
6. Manual: start a workout → reorder → finish → History share shows the new order; Profile → Programs preset updates the dashboard split

### Build pitfalls

| Error | Fix |
|-------|-----|
| `the name X is defined multiple times` | Duplicate import / const after a merge — remove the duplicate |
| shadcn `Badge variant="destructive"` | Badge uses `danger`; Button uses `destructive` |
| Stale `.next/types/app/<deleted route>` errors | `Remove-Item -Recurse .next/types` then re-run `tsc` |

## 8. Environment & deploy

- `.env.local` from `.env.local.example`; run `npm run messaging-sw` after Firebase env changes
- `npm run firebase:deploy` deploys rules, indexes, storage and functions (`scripts/deploy-functions.js`)
- Google Calendar: `src/services/googleCalendarService.ts` looks the app calendar up by name (`FitTrack Reminders`, legacy `Trip-Guru Reminders` still matched)

## 9. Git discipline

- Small commits; do not commit `.env.local`, secrets, or generated `public/firebase-config.json` / `push-config.json` churn
- Do not amend or force-push unless asked
