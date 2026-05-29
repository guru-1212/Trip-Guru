import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Memory } from '@/types/memory';

interface MemoriesState {
  memories: Memory[];
  loading: boolean;
  error: string | null;
}

const initialState: MemoriesState = {
  memories: [],
  loading: false,
  error: null,
};

const memoriesSlice = createSlice({
  name: 'memories',
  initialState,
  reducers: {
    setMemories: (state, action: PayloadAction<Memory[]>) => {
      state.memories = action.payload;
      state.loading = false;
    },
    addMemory: (state, action: PayloadAction<Memory>) => {
      state.memories.unshift(action.payload);
    },
    removeMemory: (state, action: PayloadAction<string>) => {
      state.memories = state.memories.filter((m) => m.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setMemories, addMemory, removeMemory, setLoading } =
  memoriesSlice.actions;
export default memoriesSlice.reducer;
