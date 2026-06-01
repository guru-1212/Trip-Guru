import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getRoomExpenses,
  createRoomExpense,
  updateRoomExpense,
  deleteRoomExpense,
} from '@/firebase/firestore';
import {
  setRoomExpenses,
  addRoomExpense,
  removeRoomExpense,
  updateRoomExpense as updateRoomExpenseAction,
  setLoading,
} from './roomExpensesSlice';
import { RoomExpense } from '@/types/roomExpense';
import {
  formatExpenseAuditSummary,
  recordRoomAuditLog,
} from '@/services/roomAuditLogService';
import type { RootState } from '@/store';

function getAuditActor(state: RootState) {
  return {
    uid: state.auth.firebaseUid ?? '',
    name: state.auth.user?.name ?? 'Someone',
  };
}

export const fetchRoomExpenses = createAsyncThunk(
  'roomExpenses/fetch',
  async (
    { roomId, cycleId }: { roomId: string; cycleId?: string },
    { dispatch }
  ) => {
    dispatch(setLoading(true));
    const expenses = await getRoomExpenses(roomId, cycleId);
    dispatch(setRoomExpenses(expenses));
    dispatch(setLoading(false));
    return expenses;
  }
);

export const addRoomExpenseThunk = createAsyncThunk(
  'roomExpenses/add',
  async (
    expense: Omit<RoomExpense, 'id' | 'createdAt'>,
    { dispatch, getState }
  ) => {
    const id = await createRoomExpense(expense);
    dispatch(
      addRoomExpense({
        ...expense,
        id,
        createdAt: { toDate: () => new Date() } as RoomExpense['createdAt'],
      })
    );

    const state = getState() as RootState;
    const actor = getAuditActor(state);
    const currency = state.rooms.currentRoom?.currency ?? 'INR';
    await recordRoomAuditLog({
      roomId: expense.roomId,
      cycleId: expense.cycleId,
      action: 'expense.created',
      entityType: 'expense',
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: formatExpenseAuditSummary(
        'expense.created',
        actor.name,
        expense.title,
        expense.amount,
        currency
      ),
      metadata: {
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
      },
    });

    return id;
  }
);

export const updateRoomExpenseThunk = createAsyncThunk(
  'roomExpenses/update',
  async (
    { expenseId, data }: { expenseId: string; data: Partial<RoomExpense> },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const expense = state.roomExpenses.expenses.find((e) => e.id === expenseId);
    const uid = state.auth.firebaseUid;
    if (!expense || !uid || expense.createdBy !== uid) {
      return rejectWithValue('Only the person who added this expense can edit it.');
    }
    await updateRoomExpense(expenseId, data);
    dispatch(updateRoomExpenseAction({ id: expenseId, ...data }));

    const actor = getAuditActor(state);
    const currency = state.rooms.currentRoom?.currency ?? 'INR';
    const title = (data.title ?? expense.title) as string;
    const amount = (data.amount ?? expense.amount) as number;
    await recordRoomAuditLog({
      roomId: expense.roomId,
      cycleId: expense.cycleId,
      action: 'expense.updated',
      entityType: 'expense',
      entityId: expenseId,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: formatExpenseAuditSummary(
        'expense.updated',
        actor.name,
        title,
        amount,
        currency
      ),
      metadata: { title, amount },
    });
  }
);

export const deleteRoomExpenseThunk = createAsyncThunk(
  'roomExpenses/delete',
  async (expenseId: string, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const expense = state.roomExpenses.expenses.find((e) => e.id === expenseId);
    const uid = state.auth.firebaseUid;
    if (!expense || !uid || expense.createdBy !== uid) {
      return rejectWithValue('Only the person who added this expense can delete it.');
    }
    await deleteRoomExpense(expenseId);
    dispatch(removeRoomExpense(expenseId));

    const actor = getAuditActor(state);
    const currency = state.rooms.currentRoom?.currency ?? 'INR';
    await recordRoomAuditLog({
      roomId: expense.roomId,
      cycleId: expense.cycleId,
      action: 'expense.deleted',
      entityType: 'expense',
      entityId: expenseId,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: formatExpenseAuditSummary(
        'expense.deleted',
        actor.name,
        expense.title,
        expense.amount,
        currency
      ),
      metadata: {
        title: expense.title,
        amount: expense.amount,
      },
    });
  }
);
