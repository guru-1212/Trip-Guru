# Interpreting user prompts (anti-mistakes)

Users often describe **intent** correctly but **wrong product terms**. Use this table before implementing.

## Wrong product

| User says | Might mean wrong | Do instead |
|-----------|------------------|------------|
| “Add to expenses” in room chat | Trip `expenses` | `roomExpenses` + active `cycleId` |
| “Trip members” in PG context | `tripMembers` | `roomMembers` |
| “Settlement” after rent discussion | Trip settlement | Room claim/confirm flow |
| “History” on dashboard | Trip list | Room **History** tab = cycles + activity log |

## Wrong permission model

| User says | Wrong implementation | Correct (rooms) |
|-----------|----------------------|-----------------|
| “Only admin can delete expenses” | Room owner deletes all | Only **`createdBy`** deletes/edits |
| “Mark settlement done” | Set `paid` on click | Debtor **I've paid** → creditor **Confirm received** |
| “Auto-settle when expense added” | Set all `paid` | Recompute + sync `pending` settlements |

## Wrong UI placement

| User says | Wrong | Correct |
|-----------|--------|---------|
| “Back button in header” | `Navbar` back | `PageBackNav` in shell |
| “Show everyone’s spend share” on overview | `splitBetween` sums | **Paid by** totals (`paidBy`) unless they say “share” or “split” |
| “Pending count only” on overview | Single number | List **debtor → creditor** amounts |

## Wrong data meaning

| Term | Common mistake | Definition in this app |
|------|----------------|------------------------|
| Total spent (cycle) | Sum of one person’s payments | Sum of **all** expense `amount` fields |
| Paid by (overview) | Split share owed | Sum where member is **`paidBy`** |
| Pending dues | Only carry-forward count | Open `roomSettlements` (+ optional carry-forward note) |
| Settled | Debtor clicked paid | Creditor **confirmed** (`status === 'paid'`) |

## When to ask the user

Ask **one** short question only if:

- The change affects **Firestore rules** or who can pay/delete, and the docs don’t cover it  
- They ask to merge Trips and Rooms into one collection  
- They want to remove creditor confirmation (changes trust model)

Otherwise follow `docs/requirements/` and note assumptions in the PR/summary.

## Build mistakes (run `npm run build`)

| Symptom | Fix |
|---------|-----|
| Duplicate `useAppSelector` / `getMemberName` | Remove extra import or local function; use hook export once |
| Badge `destructive` type error | Use `danger` variant (see `GEMINI.md` §12.1) |
| `DisplayRoomSettlement` extends error | `Omit<RoomComputedSettlement, 'status'>` |

## Keeping docs current

If you implement behavior **not** described here, add or update the relevant `docs/requirements/*.md` file in the same change.
