import { createAsyncThunk } from '@reduxjs/toolkit';
import { getExpenses, createExpense, deleteExpense, updateExpense } from '@/firebase/firestore';
import { setExpenses, addExpense, removeExpense, updateExpense as updateExpenseAction, setLoading } from './expensesSlice';
import { Expense } from '@/types/expense';
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
    { dispatch }
  ) => {
    const id = await createExpense(expense);
    dispatch(
      addExpense({
        ...expense,
        id,
        createdAt: { toDate: () => new Date() } as Expense['createdAt'],
      })
    );

    return id;
  }
);

export const updateExpenseThunk = createAsyncThunk(
  'expenses/update',
  async (
    { expenseId, data }: { expenseId: string; data: Partial<Expense> },
    { dispatch }
  ) => {
    await updateExpense(expenseId, data);
    dispatch(updateExpenseAction({ id: expenseId, ...data }));
  }
);

export const deleteExpenseThunk = createAsyncThunk(
  'expenses/delete',
  async (expenseId: string, { dispatch }) => {
    await deleteExpense(expenseId);
    dispatch(removeExpense(expenseId));
  }
);
