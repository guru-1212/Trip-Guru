# Firestore & security — room module reference

## Room collections

| Collection | Purpose |
|------------|---------|
| `rooms` | Room metadata, `createdBy`, `currency`, `membersCount` |
| `roomMembers` | Doc id often `{roomId}_{userId}`; `inviteStatus`, `role` |
| `cycles` | Monthly bucket; one active per room |
| `roomExpenses` | Expenses scoped to `cycleId` |
| `roomSettlements` | Pairwise balances + payment workflow |
| `carryForwardBalances` | Cross-cycle dues |
| `rentPayments` | Per-member rent rows per cycle |
| `roomAuditLogs` | Immutable activity log |
| `roomBringItems` | Per-cycle “things to bring” checklist |

Re-exports: `src/firebase/firestore.ts`  
Implementations: `src/firebase/*.firestore.ts`

## Helper functions in rules

- `isRoomMember(roomId)`  
- `isRoomEditor(roomId)` — owner or editor role  
- `isRoomOwner(roomId)`  
- `roomMemberUserId(memberKey)` — for settlement debtor/creditor checks  

## Rules highlights (rooms)

| Collection | Create | Update / delete |
|------------|--------|-----------------|
| `roomExpenses` | Room editor | **Creator only** (`createdBy`) |
| `roomSettlements` | Room member | Debtor claim / creditor confirm / editor (see rules file) |
| `roomAuditLogs` | Member, `actorUid == auth.uid` | **Denied** |
| `carryForwardBalances`, `rentPayments` | Room editor | Room editor |

Trip collections (`expenses`, `settlements`, etc.) have **separate** rules — do not copy room rules onto trips.

## Indexes

After adding queries, update `firestore.indexes.json`. Examples:

- `roomExpenses`: `roomId` + `cycleId`  
- `roomAuditLogs`: `roomId` + `createdAt` desc  

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Member key convention

- `paidBy`, `splitBetween[].uid`, `fromMemberKey`, `toMemberKey` use **`roomMembers` document id**  
- Resolve display names via `getMemberKey(member)` === `member.id`  
- Auth checks in rules use `roomMembers/{memberKey}.userId`

## Redux persistence

Timestamps may need `serializableCheck.ignoredPaths` in `src/store/index.ts` when adding fields.

## Do not

- Store settlements only in Redux without Firestore sync for rooms (refresh loses state).  
- Use `userId` as `paidBy` if the app stores `member.id` everywhere else.  
- Deploy rules without indexes for new compound queries.
