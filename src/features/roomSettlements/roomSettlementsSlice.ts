import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RoomSettlement } from '@/types/roomSettlement';
import { RoomComputedSettlement } from '@/lib/settlementAlgorithm';
import { CarryForwardBalance } from '@/types/roomSettlement';

interface RoomSettlementsState {
  computed: RoomComputedSettlement[];
  settlements: RoomSettlement[];
  carryForward: CarryForwardBalance[];
}

const initialState: RoomSettlementsState = {
  computed: [],
  settlements: [],
  carryForward: [],
};

const roomSettlementsSlice = createSlice({
  name: 'roomSettlements',
  initialState,
  reducers: {
    setComputed(state, action: PayloadAction<RoomComputedSettlement[]>) {
      state.computed = action.payload;
    },
    setRoomSettlements(state, action: PayloadAction<RoomSettlement[]>) {
      state.settlements = action.payload;
    },
    setCarryForward(state, action: PayloadAction<CarryForwardBalance[]>) {
      state.carryForward = action.payload;
    },
    updateRoomSettlement(
      state,
      action: PayloadAction<Partial<RoomSettlement> & { id: string }>
    ) {
      const idx = state.settlements.findIndex(
        (s) => s.id === action.payload.id
      );
      if (idx >= 0) {
        state.settlements[idx] = { ...state.settlements[idx], ...action.payload };
      }
    },
  },
});

export const {
  setComputed,
  setRoomSettlements,
  setCarryForward,
  updateRoomSettlement,
} = roomSettlementsSlice.actions;
export default roomSettlementsSlice.reducer;
