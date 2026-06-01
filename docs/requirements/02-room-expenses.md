# Room expenses — requirements

## Data model

- Collection: `roomExpenses`  
- Types: `src/types/roomExpense.ts`  
- Redux: `roomExpensesSlice`, thunks in `src/features/roomExpenses/roomExpensesThunks.ts`  
- UI form: `src/components/rooms/RoomExpenseForm.tsx`  
- Page: `src/app/rooms/[roomId]/expenses/page.tsx`

Required fields include: `roomId`, `cycleId`, `title`, `amount`, `category`, `paidBy`, `splitType`, `splitBetween`, **`createdBy`**, `expenseDate`.

## Permissions (must not regress)

| Action | Who |
|--------|-----|
| Create | Any room editor (`isRoomEditor` in rules) |
| Update / Delete | **Only** `createdBy === auth.uid` |
| UI edit/delete buttons | Shown only when `expense.createdBy === currentUser.uid` |

## Delete UX

- **Confirmation dialog** required before delete (not instant delete).  
- Copy should show title and amount.

## Edit UX

- Same form as add, with `initialData` → calls `updateRoomExpenseThunk`.  
- Thunk rejects if not creator (client + Firestore rules).

## Firestore rules (summary)

```
roomExpenses: create if isRoomEditor(roomId)
              update/delete if auth.uid == resource.data.createdBy
```

## Settlement linkage

- Splits on each expense drive `computeRoomSettlements`.  
- Example: Guru pays ₹12,000 rent, equal split among 3 → Pravin and Shiva owe Guru their shares in settlement (not “Guru owes himself”).

## Audit log

On create / update / delete, write `roomAuditLogs` via `recordRoomAuditLog` in thunks (`expense.created`, `expense.updated`, `expense.deleted`).

## Do not

- Use trip `expenses` collection or `ExpenseForm` for rooms without explicit product decision.  
- Allow room owner to delete others’ expenses unless requirements change in this file.  
- Skip delete confirmation to “simplify” UX.
