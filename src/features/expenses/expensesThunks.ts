import { createAsyncThunk } from '@reduxjs/toolkit';
import { getExpenses, createExpense, deleteExpense, updateExpense } from '@/firebase/firestore';
import { setExpenses, addExpense, removeExpense, updateExpense as updateExpenseAction, setLoading } from './expensesSlice';
import { Expense } from '@/types/expense';
import {
  formatTripExpenseAuditSummary,
  recordTripAuditLog,
} from '@/services/tripAuditLogService';
import type { RootState } from '@/store';

function getAuditActor(state: RootState) {
  return {
    uid: state.auth.firebaseUid ?? '',
    name: state.auth.user?.name ?? 'Someone',
  };
}
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

    if (expense.expenseType !== 'planned') {
      const state = getState() as RootState;
      const actor = getAuditActor(state);
      const currency = state.trips.currentTrip?.currency ?? 'INR';
      await recordTripAuditLog({
        tripId: expense.tripId,
        action: 'expense.created',
        entityType: 'expense',
        entityId: id,
        actorUid: actor.uid,
        actorName: actor.name,
        summary: formatTripExpenseAuditSummary(
          'expense.created',
          actor.name,
          expense.category,
          expense.amount,
          currency
        ),
        metadata: {
          category: expense.category,
          amount: expense.amount,
        },
      });
    }

    return id;
  }
);

export const updateExpenseThunk = createAsyncThunk(
  'expenses/update',
  async (
    { expenseId, data }: { expenseId: string; data: Partial<Expense> },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const expense = state.expenses.expenses.find((e) => e.id === expenseId);
    await updateExpense(expenseId, data);
    dispatch(updateExpenseAction({ id: expenseId, ...data }));

    const expenseType = data.expenseType ?? expense?.expenseType;
    if (expense && expenseType !== 'planned') {
      const actor = getAuditActor(state);
      const currency = state.trips.currentTrip?.currency ?? 'INR';
      const category = (data.category ?? expense.category) as string;
      const amount = (data.amount ?? expense.amount) as number;
      await recordTripAuditLog({
        tripId: expense.tripId,
        action: 'expense.updated',
        entityType: 'expense',
        entityId: expenseId,
        actorUid: actor.uid,
        actorName: actor.name,
        summary: formatTripExpenseAuditSummary(
          'expense.updated',
          actor.name,
          category,
          amount,
          currency
        ),
        metadata: { category, amount },
      });
    }
  }
);

export const deleteExpenseThunk = createAsyncThunk(
  'expenses/delete',
  async (expenseId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const expense = state.expenses.expenses.find((e) => e.id === expenseId);
    await deleteExpense(expenseId);
    dispatch(removeExpense(expenseId));

    if (expense && expense.expenseType !== 'planned') {
      const actor = getAuditActor(state);
      const currency = state.trips.currentTrip?.currency ?? 'INR';
      await recordTripAuditLog({
        tripId: expense.tripId,
        action: 'expense.deleted',
        entityType: 'expense',
        entityId: expenseId,
        actorUid: actor.uid,
        actorName: actor.name,
        summary: formatTripExpenseAuditSummary(
          'expense.deleted',
          actor.name,
          expense.category,
          expense.amount,
          currency
        ),
        metadata: {
          category: expense.category,
          amount: expense.amount,
        },
      });
    }
  }
);
