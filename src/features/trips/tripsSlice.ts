import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Trip } from '@/types/trip';
import { TripMember } from '@/types/member';

import { TripInvitation } from '@/types/invitation';

interface TripsState {
  trips: Trip[];
  currentTrip: Trip | null;
  members: TripMember[];
  invitations: TripInvitation[];
  invitationsLoading: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: TripsState = {
  trips: [],
  currentTrip: null,
  members: [],
  invitations: [],
  invitationsLoading: false,
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
    setInvitationsLoading: (state, action: PayloadAction<boolean>) => {
      state.invitationsLoading = action.payload;
    },
    setTrips: (state, action: PayloadAction<Trip[]>) => {
      state.trips = action.payload;
      state.loading = false;
    },
    setInvitations: (state, action: PayloadAction<TripInvitation[]>) => {
      state.invitations = action.payload;
      state.invitationsLoading = false;
    },
    removeInvitation: (state, action: PayloadAction<string>) => {
      state.invitations = state.invitations.filter(
        (inv) => inv.member.id !== action.payload
      );
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
  setInvitationsLoading,
  setTrips,
  setInvitations,
  removeInvitation,
  setCurrentTrip,
  updateTripInList,
  setMembers,
  setError,
} = tripsSlice.actions;
export default tripsSlice.reducer;
