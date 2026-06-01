# Agent checklist (run before every change)

## 1. Which product?

- [ ] **Trips** (`/trips/*`, `expenses` collection, `tripsSlice`)  
- [ ] **Rooms / Roommates** (`/rooms/*`, `roomExpenses`, `roomsSlice`)  
- [ ] **Shared** (auth, profile, app mode, `splitCalculator`, layout)

If the user says “expenses” without context → check route or `useAppMode()`. **Default to the page they were on** in conversation; if unknown, ask.

## 2. Hard prohibitions

- [ ] Did **not** store room data in `expenses` / `trips` collections  
- [ ] Did **not** import `@/components/trips/*` from room pages (or reverse)  
- [ ] Did **not** add back button beside navbar logo (`Navbar` has logo only; use `PageBackNav` in page shells)  
- [ ] Did **not** let any roommate edit/delete another person’s expense (only `createdBy`)  
- [ ] Did **not** mark settlement `paid` without creditor confirmation (room settlements)  
- [ ] Did **not** loosen `firestore.rules` for trips when changing rooms  

## 3. Conventions

- [ ] Member keys = `getMemberKey(member)` → **`member.id`** (Firestore `roomMembers` / `tripMembers` doc id)  
- [ ] Firestore access via `@/firebase/firestore` barrel, implementation in `src/firebase/*.firestore.ts`  
- [ ] New room Redux state → `roomExpenses` / `rooms` / `roomSettlements`, not trip slices  
- [ ] Realtime: `useRealtimeRoom` for rooms, `useRealtimeTrip` for trips  

## 4. After code changes

- [ ] **`npm run build`** (not only `tsc`) — catches duplicate symbols + Badge variant mismatches  
- [ ] `npm run test` if `settlementAlgorithm.ts` or split logic changed  
- [ ] No duplicate imports in the same file (`useAppSelector`, hooks)  
- [ ] Badge uses `danger`, not `destructive` (`src/components/ui/badge.tsx`)  
- [ ] Extending `RoomComputedSettlement` with wider `status` → use `Omit<..., 'status'>`  
- [ ] Remind deploy if `firestore.rules` or `firestore.indexes.json` changed:  
  `firebase deploy --only firestore:rules,firestore:indexes`  

## 5. User prompt red flags

Treat these as **likely wrong** unless the task explicitly says otherwise:

| User might say | Correct behavior |
|----------------|------------------|
| “Delete expense” (room) | Only creator; show confirmation dialog first |
| “Anyone can settle” | Debtor claims paid → creditor confirms |
| “Mark paid” on settlement (room) | Creditor **Confirm received** closes it; debtor uses **I've paid** |
| “Show spent per person” (overview) | **Paid by** = sum of `paidBy` amounts, not split shares |
| “Pending dues” (overview) | From `displaySettlements` (computed + saved), not only carry-forward count |
| “Put back button in header” | Use `PageBackNav` above “Back to Dashboard” in `RoomPageShell` / `TripPageShell` |
| “One expenses table for all” | Trips and rooms use **separate** collections and slices |
