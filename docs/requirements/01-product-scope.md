# Product scope — Trips vs Rooms

## Two products, one app

| | **Trips** | **Rooms (Roommates)** |
|---|-----------|------------------------|
| **Use case** | Group travel, planned vs actual expenses | Shared home / PG, monthly cycles |
| **Routes** | `/trips/*`, `/trips/new` | `/rooms/*`, `/rooms/new` |
| **Time model** | Trip start/end dates | **Cycles** (month/year), `ensureActiveCycle` |
| **Expense collection** | `expenses` | `roomExpenses` (+ `cycleId`) |
| **Settlement** | `settlements`, trip page mark paid | `roomSettlements` + claim/confirm flow |
| **Shell UI** | `TripPageShell`, `TripNav` | `RoomPageShell`, `RoomNav` |

There is **no** shared `workspaces` collection. Do not migrate trips into rooms without an explicit migration project.

## App mode

- `users.activeMode`: `'trip' | 'room'`  
- `WorkspaceGuard` blocks cross-mode routes  
- Dashboard shows trip **or** room sections based on `useAppMode()`, not both at once (unless user explicitly asks for a combined view)

## When user prompt is vague

| Phrase | Usually means |
|--------|----------------|
| “roommates”, “PG”, “rent”, “cycle” | **Rooms** |
| “trip”, “itinerary”, “planned expense”, “memories” | **Trips** |
| “dashboard” | Check `activeMode`; may need both sections only for `primaryUseCase: 'both'` switcher |
| “settlement” | Trip settlement (simple mark paid) **or** room settlement (claim + confirm) — **read context** |

## Code ownership

```
src/app/trips/          → trips only
src/app/rooms/          → rooms only
src/features/trips/     → trips only
src/features/rooms/     → rooms only
src/features/roomExpenses/
src/features/roomSettlements/
src/lib/settlementAlgorithm.ts  → shared math; test after edits
```
