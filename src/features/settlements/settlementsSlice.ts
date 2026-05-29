import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Settlement } from '@/types/settlement';

interface SettlementsState {
  settlements: Settlement[];
  computed: Settlement[];
  loading: boolean;
  error: string | null;
}

const initialState: SettlementsState = {
  settlements: [],
  computed: [],
  loading: false,
  error: null,
};

const settlementsSlice = createSlice({
  name: 'settlements',
  initialState,
  reducers: {
    setSettlements: (state, action: PayloadAction<Settlement[]>) => {
      state.settlements = action.payload;
      state.loading = false;
    },
    setComputed: (state, action: PayloadAction<Settlement[]>) => {
      state.computed = action.payload;
    },
    updateSettlement: (state, action: PayloadAction<Settlement>) => {
      const idx = state.settlements.findIndex((s) => s.id === action.payload.id);
      if (idx >= 0) state.settlements[idx] = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setSettlements, setComputed, updateSettlement, setLoading } =
  settlementsSlice.actions;
export default settlementsSlice.reducer;
