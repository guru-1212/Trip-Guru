# Trip packing checklist — requirements

## Purpose

Per-trip checklist for what to **buy** vs **bring**, packing progress (%), and who carries each item — so the group does not forget essentials (including season packs like rainy season).

## Data model

- Collection: `tripPackItems`
- Types: `src/types/tripPackItem.ts`
- Redux: `tripPackItemsSlice`, thunks in `src/features/tripPackItems/tripPackItemsThunks.ts`
- Scoped to `tripId` only (no cycle)

Fields: `title`, `category`, `itemType` (`buy` | `bring`), `status` (`todo` | `ready` | `packed`), `quantity`, `note`, `assignedToMemberKey`, `source` (`custom` | `template`), `templateKey`, `templateItemSlug`, `createdBy`, `packedAt`.

## Status workflow

| itemType | todo | ready | packed |
|----------|------|-------|--------|
| buy | Need to buy | Bought — pack it | Ready for trip |
| bring | Not packed yet | — | Packed |

## Permissions

| Action | Who |
|--------|-----|
| Read | Any trip member |
| Create | Trip **owner** or **editor** |
| Update fields (title, etc.) | **Creator only**; `source: template` rows are not editable (remove + re-add) |
| Update status | Creator, trip editor, or **assignee** (status + `packedAt` only in rules) |
| Delete | **Creator only** (`createdBy === auth.uid`) |

## Templates

- Static packs in `src/lib/tripPackTemplates.ts`: `common_essentials_v1`, `rainy_season_v1`
- Apply pack: batch create with dedupe by `tripId` + `templateKey` + `templateItemSlug`
- Quick-add chips: single template item

## UI

- Tab: **Packing** — `/trips/[tripId]/packing`
- Trip overview card: overall % + link
- Add panel: pack buttons, quick-add chips, custom item form
- Filters: All, To buy, To bring, Not packed, Packed, My list, per-member chips

## Do not

- Mix with `expenses` or `tripPlans`
- Use room `roomBringItems` for trips
