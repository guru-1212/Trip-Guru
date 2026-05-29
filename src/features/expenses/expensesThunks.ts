import { createAsyncThunk } from '@reduxjs/toolkit';
import { getExpenses, createExpense, deleteExpense } from '@/firebase/firestore';
import { setExpenses, addExpense, removeExpense, setLoading } from './expensesSlice';
import { Expense } from '@/types/expense';
import { notifyTripMembersOfExpense } from '@/services/fcmService';
import type { RootState } from '@/store';
import { getMemberKey } from '@/lib/utils';

export const fetchExpenses = createAsyncThunk(
  'expenses/fetch',
  async (tripId: string, { dispatch }) => {
    dispatch(setLoading(true));
    const expenses = await getExpenses(tripId);
    dispatch(setExpenses(expenses));
    return expenses;
  }
);

export const addExpenseThunk = createAsyncThunk(
  'expenses/add',
  async (
    expense: Omit<Expense, 'id' | 'createdAt'>,
    { dispatch, getState }
  ) => {
    const id = await createExpense(expense);
    dispatch(
      addExpense({
        ...expense,
        id,
        createdAt: { toDate: () => new Date() } as Expense['createdAt'],
      })
    );

    const state = getState() as RootState;
    const members = state.trips.members;
    const payer = members.find((m) => getMemberKey(m) === expense.paidBy);
    notifyTripMembersOfExpense(
      expense.tripId,
      expense.amount,
      expense.category,
      payer?.name ?? 'Someone'
    );

    return id;
  }
);

export const deleteExpenseThunk = createAsyncThunk(
  'expenses/delete',
  async (expenseId: string, { dispatch }) => {
    await deleteExpense(expenseId);
    dispatch(removeExpense(expenseId));
  }
);
