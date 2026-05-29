import { createAsyncThunk } from '@reduxjs/toolkit';
import { getTripsForUser, getTrip, getTripMembers } from '@/firebase/firestore';
import { transitionAllTrips } from '@/services/tripStatusService';
import { setTrips, setCurrentTrip, setMembers, setLoading, setError } from './tripsSlice';

export const fetchUserTrips = createAsyncThunk(
  'trips/fetchUserTrips',
  async (userId: string, { dispatch }) => {
    dispatch(setLoading(true));
    try {
      let trips = await getTripsForUser(userId);
      trips = await transitionAllTrips(trips);
      dispatch(setTrips(trips));
      return trips;
    } catch (e) {
      dispatch(setError((e as Error).message));
      throw e;
    }
  }
);

export const fetchTripById = createAsyncThunk(
  'trips/fetchTripById',
  async (tripId: string, { dispatch }) => {
    dispatch(setLoading(true));
    try {
      const trip = await getTrip(tripId);
      if (trip) {
        const { transitionTripStatus } = await import('@/services/tripStatusService');
        const updated = await transitionTripStatus(trip);
        dispatch(setCurrentTrip(updated));
      } else {
        dispatch(setCurrentTrip(null));
      }
      const members = await getTripMembers(tripId);
      dispatch(setMembers(members));
      return trip;
    } catch (e) {
      dispatch(setError((e as Error).message));
      throw e;
    } finally {
      dispatch(setLoading(false));
    }
  }
);
