import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  firebaseUid: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  firebaseUid: null,
  loading: false,
  error: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUser: (
      state,
      action: PayloadAction<{ uid: string; profile: User | null }>
    ) => {
      state.firebaseUid = action.payload.uid;
      state.user = action.payload.profile;
      state.loading = false;
      state.error = null;
      state.initialized = true;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearAuth: (state) => {
      state.user = null;
      state.firebaseUid = null;
      state.loading = false;
      state.error = null;
      state.initialized = true;
    },
    updateProfileLocal: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  setLoading,
  setUser,
  setError,
  clearAuth,
  updateProfileLocal,
} = authSlice.actions;
export default authSlice.reducer;
