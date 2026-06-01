import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RoomBringItem } from '@/types/roomBringItem';

interface RoomBringItemsState {
  items: RoomBringItem[];
  loading: boolean;
}

const initialState: RoomBringItemsState = {
  items: [],
  loading: false,
};

const roomBringItemsSlice = createSlice({
  name: 'roomBringItems',
  initialState,
  reducers: {
    setRoomBringItems(state, action: PayloadAction<RoomBringItem[]>) {
      state.items = action.payload;
    },
    addRoomBringItem(state, action: PayloadAction<RoomBringItem>) {
      state.items.unshift(action.payload);
    },
    removeRoomBringItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    updateRoomBringItem(
      state,
      action: PayloadAction<Partial<RoomBringItem> & { id: string }>
    ) {
      const idx = state.items.findIndex((i) => i.id === action.payload.id);
      if (idx >= 0) {
        state.items[idx] = { ...state.items[idx], ...action.payload };
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const {
  setRoomBringItems,
  addRoomBringItem,
  removeRoomBringItem,
  updateRoomBringItem,
  setLoading,
} = roomBringItemsSlice.actions;
export default roomBringItemsSlice.reducer;
