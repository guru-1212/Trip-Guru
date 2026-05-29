import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Trip } from '@/types/trip';
import { TripMember } from '@/types/member';

interface TripsState {
  trips: Trip[];
  currentTrip: Trip | null;
  members: TripMember[];
  loading: boolean;
  error: string | null;
}

const initialState: TripsState = {
  trips: [],
  currentTrip: null,
  members: [],
  loading: false,
  error: null,
};

const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTrips: (state, action: PayloadAction<Trip[]>) => {
      state.trips = action.payload;
      state.loading = false;
    },
    setCurrentTrip: (state, action: PayloadAction<Trip | null>) => {
      state.currentTrip = action.payload;
    },
    updateTripInList: (state, action: PayloadAction<Trip>) => {
      const idx = state.trips.findIndex((t) => t.tripId === action.payload.tripId);
      if (idx >= 0) state.trips[idx] = action.payload;
      if (state.currentTrip?.tripId === action.payload.tripId) {
        state.currentTrip = action.payload;
      }
    },
    setMembers: (state, action: PayloadAction<TripMember[]>) => {
      state.members = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setLoading,
  setTrips,
  setCurrentTrip,
  updateTripInList,
  setMembers,
  setError,
} = tripsSlice.actions;
export default tripsSlice.reducer;
