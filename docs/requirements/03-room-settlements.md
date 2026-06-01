# Room settlements — requirements

## Purpose

After expenses (especially one person paying rent/utilities), show **who owes whom** and track payment until the **creditor confirms** receipt.

## Settlement math

- `computeRoomSettlements(expenses, members, roomId, carryForward[])` in `src/lib/settlementAlgorithm.ts`  
- Uses `calculateNetBalances` + carry-forward, then greedy pairing  
- Output: `fromMemberKey` (debtor) → `toMemberKey` (creditor), `amount`

## Persisted records

- Collection: `roomSettlements`  
- Sync: `syncRoomSettlements(roomId, cycleId, computed)` — upserts per cycle, updates amounts only while `status === 'pending'`  
- Hook: `useRoomSettlement` auto-syncs when computed balances change  
- Merge UI state: `mergeRoomSettlements()` in `src/lib/mergeRoomSettlements.ts` → `displaySettlements`

## Status workflow (required)

| Status | Meaning | Next action |
|--------|---------|-------------|
| `pending` | Debtor owes money | Debtor taps **I've paid** |
| `awaiting_confirmation` | Debtor claimed they paid | Creditor taps **Confirm received** |
| `paid` | Creditor confirmed | Closed |

**Never** set `paid` when only the debtor marks payment. Guru (creditor) must confirm Pravin/Shiva paid.

## API

| Function | Actor |
|----------|--------|
| `claimRoomSettlementPayment(id)` | Debtor (`fromMemberKey`) |
| `confirmRoomSettlementPayment(id)` | Creditor (`toMemberKey`) |

## Firestore rules (summary)

- Read: room member  
- Create: room member (for sync)  
- Update to `awaiting_confirmation`: debtor only, from `pending`  
- Update to `paid`: creditor only, from `awaiting_confirmation`  
- Editors may have broader update for admin flows — do not remove debtor/creditor paths

## UI — Settlement page (`/rooms/[id]/settlement`)

Sections (in order):

1. **Your payments** — `fromMemberKey === me`, view `debtor`, **I've paid** when pending  
2. **Owed to you** — `toMemberKey === me`, status `pending`  
3. **Confirm payments received** — `toMemberKey === me`, status `awaiting_confirmation`, **Confirm received**  
4. **Previous month pending** — `carryForwardBalances`  
5. **Other balances** — pairs where user is neither party  
6. **Settled this cycle** — `paid`  
7. **Save to carry forward** — optional month-end carry-forward (not required for basic dues display)

Component: `RoomSettlementCard` with `viewAs: 'debtor' | 'creditor' | 'other'`.

## UI — Overview (`/rooms/[id]`)

**Pending dues** card must list open settlements:

- Format: `{debtor} → pay to {creditor} — {amount}`  
- Include `awaiting_confirmation` with label  
- Link to settlement page  
- Do **not** show only `carryForward.length` without pairwise breakdown when computed dues exist

## Overview — “Paid by” (separate from settlement)

Under total spent: show each member’s **out-of-pocket** total (`getMemberPaidTotals` — sum where `paidBy === memberKey`).  
This is **not** the same as split share (`getMemberSpendTotals`).

## Audit log

- `settlement.payment_claimed` — debtor marked paid  
- `settlement.payment_confirmed` — creditor confirmed  
- `settlement.saved` — carry-forward save

## Trips difference

Trip settlements use simpler `markSettlementPaid` — **do not** copy trip UX to rooms without reading this file.

## Do not

- Let debtor set `status: 'paid'` directly.  
- Create duplicate settlement docs on every page load without upsert logic.  
- Use `saveRoomSettlements` batch-create for normal sync (deprecated; use `syncRoomSettlements`).
