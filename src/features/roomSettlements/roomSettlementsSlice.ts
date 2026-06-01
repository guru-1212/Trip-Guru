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
  },
});

export const { setComputed, setRoomSettlements, setCarryForward } =
  roomSettlementsSlice.actions;
export default roomSettlementsSlice.reducer;
