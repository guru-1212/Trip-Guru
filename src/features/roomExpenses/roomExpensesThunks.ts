import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getRoomExpenses,
  createRoomExpense,
  deleteRoomExpense,
} from '@/firebase/firestore';
import {
  setRoomExpenses,
  addRoomExpense,
  removeRoomExpense,
  setLoading,
} from './roomExpensesSlice';
import { RoomExpense } from '@/types/roomExpense';
import { notifyRoomMembersOfExpense } from '@/services/fcmService';
import type { RootState } from '@/store';
import { getMemberKey } from '@/lib/utils';

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
    const members = state.rooms.members;
    const payer = members.find((m) => getMemberKey(m) === expense.paidBy);
    notifyRoomMembersOfExpense(
      expense.roomId,
      expense.amount,
      expense.category,
      payer?.name ?? 'Someone'
    );
    return id;
  }
);

export const deleteRoomExpenseThunk = createAsyncThunk(
  'roomExpenses/delete',
  async (expenseId: string, { dispatch }) => {
    await deleteRoomExpense(expenseId);
    dispatch(removeRoomExpense(expenseId));
  }
);
