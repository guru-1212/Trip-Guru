import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppMode } from '@/lib/appMode';

interface AppModeState {
  mode: AppMode;
  initialized: boolean;
  canSwitch: boolean;
}

const initialState: AppModeState = {
  mode: 'trip',
  initialized: false,
  canSwitch: false,
};

const appModeSlice = createSlice({
  name: 'appMode',
  initialState,
  reducers: {
    setAppModeState(
      state,
      action: PayloadAction<{
        mode: AppMode;
        canSwitch: boolean;
      }>
    ) {
      state.mode = action.payload.mode;
      state.canSwitch = action.payload.canSwitch;
      state.initialized = true;
    },
    setAppMode(state, action: PayloadAction<AppMode>) {
      state.mode = action.payload;
    },
    resetAppMode(state) {
      state.mode = 'trip';
      state.initialized = false;
      state.canSwitch = false;
    },
  },
});

export const { setAppModeState, setAppMode, resetAppMode } = appModeSlice.actions;
export default appModeSlice.reducer;
