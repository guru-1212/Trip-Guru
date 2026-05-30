import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense, ExpenseCategory } from '@/types/expense';

interface ExpenseFilters {
  category: ExpenseCategory | 'all';
  memberId: string | 'all';
  dateFrom: string | null;
  dateTo: string | null;
  expenseType: 'all' | 'planned' | 'actual';
}

interface ExpensesState {
  expenses: Expense[];
  filters: ExpenseFilters;
  loading: boolean;
  error: string | null;
}

const initialState: ExpensesState = {
  expenses: [],
  filters: {
    category: 'all',
    memberId: 'all',
    dateFrom: null,
    dateTo: null,
    expenseType: 'all',
  },
  loading: false,
  error: null,
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setExpenses: (state, action: PayloadAction<Expense[]>) => {
      state.expenses = action.payload;
      state.loading = false;
    },
    addExpense: (state, action: PayloadAction<Expense>) => {
      state.expenses.unshift(action.payload);
    },
    updateExpense: (state, action: PayloadAction<{ id: string } & Partial<Expense>>) => {
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = { ...state.expenses[index], ...action.payload };
      }
    },
    removeExpense: (state, action: PayloadAction<string>) => {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload);
    },
    setFilters: (state, action: PayloadAction<Partial<ExpenseFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setExpenses,
  addExpense,
  updateExpense,
  removeExpense,
  setFilters,
  setLoading,
  setError,
} = expensesSlice.actions;
export default expensesSlice.reducer;
