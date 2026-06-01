# Room audit log & history — requirements

## Activity log (`roomAuditLogs`)

**Purpose:** Append-only trail of roommate actions for accountability.

### Schema (`src/types/roomAuditLog.ts`)

- `roomId`, optional `cycleId`  
- `action` — e.g. `expense.created`, `expense.updated`, `expense.deleted`, `member.invited`, `settlement.payment_claimed`, `settlement.payment_confirmed`, `rent.initialized`, `rent.paid`, `rent.amount_updated`, `room.created`  
- `entityType`, optional `entityId`  
- `actorUid`, `actorName`, `summary` (human-readable)  
- `metadata` (optional)  
- `createdAt` (server timestamp)

### Write path

- `recordRoomAuditLog()` in `src/services/roomAuditLogService.ts`  
- Failures are logged, **must not** block main user action

### Read path

- `getRoomAuditLogs(roomId)`  
- UI: `src/app/rooms/[roomId]/history/page.tsx` — tab **Activity log**  
- Component: `RoomAuditTimeline`

### Firestore rules

- Read: `isRoomMember(roomId)`  
- Create: member of room and `actorUid == auth.uid`  
- **No update or delete** (immutable log)

### Index

`roomId` + `createdAt` desc — see `firestore.indexes.json`

## Cycle history

Same **History** page, tab **Cycles**:

- Lists `cycles` for room with status (`active` | `closed` | `archived`)  
- Does not replace activity log

## Do not

- Store audit entries in trip collections.  
- Allow clients to forge `actorUid` (rules enforce match).  
- Delete audit rows for “cleanup” without explicit product + security approval.
