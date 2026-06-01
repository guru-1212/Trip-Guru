import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RoomExpense } from '@/types/roomExpense';

interface RoomExpensesState {
  expenses: RoomExpense[];
  loading: boolean;
}

const initialState: RoomExpensesState = {
  expenses: [],
  loading: false,
};

const roomExpensesSlice = createSlice({
  name: 'roomExpenses',
  initialState,
  reducers: {
    setRoomExpenses(state, action: PayloadAction<RoomExpense[]>) {
      state.expenses = action.payload;
    },
    addRoomExpense(state, action: PayloadAction<RoomExpense>) {
      state.expenses.unshift(action.payload);
    },
    removeRoomExpense(state, action: PayloadAction<string>) {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload);
    },
    updateRoomExpense(
      state,
      action: PayloadAction<Partial<RoomExpense> & { id: string }>
    ) {
      const idx = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (idx >= 0) {
        state.expenses[idx] = { ...state.expenses[idx], ...action.payload };
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const {
  setRoomExpenses,
  addRoomExpense,
  removeRoomExpense,
  updateRoomExpense,
  setLoading,
} = roomExpensesSlice.actions;
export default roomExpensesSlice.reducer;
