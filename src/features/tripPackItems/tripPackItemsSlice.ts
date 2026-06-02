import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TripPackItem } from '@/types/tripPackItem';

interface TripPackItemsState {
  items: TripPackItem[];
  loading: boolean;
}

const initialState: TripPackItemsState = {
  items: [],
  loading: false,
};

const tripPackItemsSlice = createSlice({
  name: 'tripPackItems',
  initialState,
  reducers: {
    setTripPackItems(state, action: PayloadAction<TripPackItem[]>) {
      state.items = action.payload;
    },
    addTripPackItem(state, action: PayloadAction<TripPackItem>) {
      state.items.unshift(action.payload);
    },
    removeTripPackItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    updateTripPackItem(
      state,
      action: PayloadAction<Partial<TripPackItem> & { id: string }>
    ) {
      const idx = state.items.findIndex((i) => i.id === action.payload.id);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...action.payload };
      }
    },
    setTripPackItemsLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearTripPackItems(state) {
      state.items = [];
      state.loading = false;
    },
  },
});

export const {
  setTripPackItems,
  addTripPackItem,
  removeTripPackItem,
  updateTripPackItem,
  setTripPackItemsLoading,
  clearTripPackItems,
} = tripPackItemsSlice.actions;
export default tripPackItemsSlice.reducer;
