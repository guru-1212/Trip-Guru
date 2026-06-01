# Room bring list — requirements

## Purpose

Shared checklist for what the room still needs (groceries, furniture, supplies) before or during a cycle — with estimated cost and who will bring each item.

## Data model

- Collection: `roomBringItems`
- Types: `src/types/roomBringItem.ts`
- Redux: `roomBringItemsSlice`, thunks in `src/features/roomBringItems/roomBringItemsThunks.ts`
- Scoped to `roomId` + `cycleId` (same as expenses)

Fields: `title`, `category`, `estimatedAmount`, `quantity`, `note`, `assignedToMemberKey` (nullable), `status` (`planned` | `brought`), `createdBy`.

## Permissions

| Action | Who |
|--------|-----|
| Read | Any room member |
| Create / update / delete | Room **owner** or **editor** (`isRoomEditor`) |

## UI

- Tab: **To bring** — `/rooms/[roomId]/bring`
- Overview card: count + estimated total, link to list
- Filters: All, To bring, Brought, My list (assigned to current member)
- **Mark brought** / **Undo** on each row

## Audit log

`bring_item.created`, `bring_item.updated`, `bring_item.brought`, `bring_item.deleted`

## Do not

- Mix with `roomExpenses` (bring list is planning only until brought; add as expense separately if needed for settlement).
