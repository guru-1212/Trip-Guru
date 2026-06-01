# Room UI & navigation — requirements

## Page shell

- `RoomPageShell` → `AppShell` + `useRoom` + `useRealtimeRoom`  
- Tabs: `RoomNav` — Overview, Expenses, Settlement, Rent, Members, History

## Back navigation (do not put in navbar)

| Location | Behavior |
|----------|----------|
| **Navbar** | Logo + TripMate link only — **no** back button |
| **RoomPageShell / TripPageShell** | `PageBackNav` (`src/components/common/PageBackNav.tsx`) |

`PageBackNav` order:

1. **Back to previous page** — `router.back()`  
2. **Back to Dashboard** — link to `/dashboard`

Do not reintroduce `BackButton` beside the logo in `Navbar.tsx`.

## Overview page (`/rooms/[roomId]`)

### Primary stats card

- Cycle label  
- **Total spent this cycle** — `getTotalSpent(expenses)`  
- **Paid by** — per-member totals from `getMemberPaidTotals` (who paid bills), not split shares  
- CTAs: Add expense, Settlements  

### Pending dues card

- List open settlements from `displaySettlements` (see [03-room-settlements.md](./03-room-settlements.md))  
- Show awaiting-confirmation state  
- Link to settlement page  

### Other cards

- Rent status, roommates count, history shortcut — keep scoped to room data only

## Expenses page

- Add expense dialog  
- Creator-only edit/delete + delete confirmation dialog  

## Members page

- Invite roommate → audit `member.invited`

## Rent page

- Initialize rent, mark paid, adjust shares → audit rent actions

## Do not

- Mix trip `TripPageShell` patterns into room pages without shared component extraction.  
- Show trip dashboard widgets on room overview.  
- Use navbar back for browser history (use `PageBackNav`).
