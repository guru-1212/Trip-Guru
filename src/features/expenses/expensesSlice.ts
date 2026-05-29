import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Expense, ExpenseCategory } from '@/types/expense';

interface ExpenseFilters {
  category: ExpenseCategory | 'all';
  memberId: string | 'all';
  dateFrom: string | null;
  dateTo: string | null;
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
  removeExpense,
  setFilters,
  setLoading,
  setError,
} = expensesSlice.actions;
export default expensesSlice.reducer;
