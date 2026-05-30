import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createTrip as fbCreateTrip,
  getTripsForUser,
  getTrip,
  getTripMembers,
  getPendingInvitesForUser,
  getUser,
  acceptTripInvite,
  declineTripInvite,
  updateTripCategory as fbUpdateTripCategory,
  updateTripClassification as fbUpdateTripClassification,
  updateTripExpectedBudget as fbUpdateTripExpectedBudget,
  updateTrip as fbUpdateTrip,
  addCustomExpenseCategory as fbAddCustomCategory,
  removeCustomExpenseCategory as fbRemoveCustomCategory,
  type CreateTripInput,
} from '@/firebase/firestore';
import { transitionAllTrips } from '@/services/tripStatusService';
import {
  setTrips,
  setCurrentTrip,
  setMembers,
  setLoading,
  setError,
  setInvitations,
  setInvitationsLoading,
  removeInvitation,
  updateTripInList,
  addTripToList,
} from './tripsSlice';
import { TripInvitation } from '@/types/invitation';
import { Trip } from '@/types/trip';
import { RootState } from '@/store';

export const updateTripExpectedBudget = createAsyncThunk(
  'trips/updateExpectedBudget',
  async (
    { tripId, amount }: { tripId: string; amount: number },
    { dispatch, getState }
  ) => {
    await fbUpdateTripExpectedBudget(tripId, amount);
    const { trips, currentTrip } = (getState() as RootState).trips;
    
    const trip = trips.find((t) => t.tripId === tripId);
    if (trip) {
      dispatch(updateTripInList({ ...trip, expectedBudget: amount }));
    }
    
    if (currentTrip?.tripId === tripId) {
      dispatch(setCurrentTrip({ ...currentTrip, expectedBudget: amount }));
    }
  }
);


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

export const fetchTripInvitations = createAsyncThunk(
  'trips/fetchTripInvitations',
  async (args: { email: string; phone: string }, { dispatch }) => {
    dispatch(setInvitationsLoading(true));
    try {
      const pending = await getPendingInvitesForUser(args.email, args.phone);
      const invitations: TripInvitation[] = [];

      for (const member of pending) {
        const trip = await getTrip(member.tripId);
        if (trip) {
          const invitedBy = await getUser(trip.createdBy);
          invitations.push({ member, trip, invitedBy });
        }
      }

      dispatch(setInvitations(invitations));
    } catch (e) {
      dispatch(setError((e as Error).message));
    }
  }
);

export const acceptInvitation = createAsyncThunk(
  'trips/acceptInvitation',
  async (memberId: string, { dispatch, getState }) => {
    const { auth } = getState() as RootState;
    if (!auth.firebaseUid) return;
    try {
      await acceptTripInvite(memberId, auth.firebaseUid);
      dispatch(removeInvitation(memberId));
      dispatch(fetchUserTrips(auth.firebaseUid));
    } catch (e) {
      dispatch(setError((e as Error).message));
    }
  }
);

export const declineInvitation = createAsyncThunk(
  'trips/declineInvitation',
  async (memberId: string, { dispatch }) => {
    try {
      await declineTripInvite(memberId);
      dispatch(removeInvitation(memberId));
    } catch (e) {
      dispatch(setError((e as Error).message));
    }
  }
);

export const updateTripCategory = createAsyncThunk(
  'trips/updateCategory',
  async (
    { tripId, category }: { tripId: string; category: string },
    { dispatch, getState }
  ) => {
    await fbUpdateTripCategory(tripId, category);
    const { trips } = (getState() as RootState).trips;
    const trip = trips.find((t) => t.tripId === tripId);
    if (trip) {
      const updatedTrip = { ...trip, category };
      dispatch(updateTripInList(updatedTrip));
    }
  }
);

export const updateTripClassification = createAsyncThunk(
  'trips/updateClassification',
  async (
    { tripId, classification }: { tripId: string; classification: 'real' | 'test' },
    { dispatch, getState }
  ) => {
    await fbUpdateTripClassification(tripId, classification);
    const { trips } = (getState() as RootState).trips;
    const trip = trips.find((t) => t.tripId === tripId);
    if (trip) {
      const updatedTrip = { ...trip, classification };
      dispatch(updateTripInList(updatedTrip));
    }
  }
);

export const addCustomCategory = createAsyncThunk(
  'trips/addCustomCategory',
  async (
    { tripId, category }: { tripId: string; category: string },
    { dispatch, getState }
  ) => {
    await fbAddCustomCategory(tripId, category);
    const { currentTrip } = (getState() as RootState).trips;
    if (currentTrip?.tripId === tripId) {
      const customExpenseCategories = [
        ...(currentTrip.customExpenseCategories || []),
        category,
      ];
      dispatch(setCurrentTrip({ ...currentTrip, customExpenseCategories }));
    }
  }
);

export const removeCustomCategory = createAsyncThunk(
  'trips/removeCustomCategory',
  async (
    { tripId, category }: { tripId: string; category: string },
    { dispatch, getState }
  ) => {
    await fbRemoveCustomCategory(tripId, category);
    const { currentTrip } = (getState() as RootState).trips;
    if (currentTrip?.tripId === tripId) {
      const customExpenseCategories = (
        currentTrip.customExpenseCategories || []
      ).filter((c) => c !== category);
      dispatch(setCurrentTrip({ ...currentTrip, customExpenseCategories }));
    }
  }
);

export const updateTripThunk = createAsyncThunk(
  'trips/update',
  async (
    { tripId, data }: { tripId: string; data: Partial<Trip> },
    { dispatch, getState }
  ) => {
    await fbUpdateTrip(tripId, data);
    const { currentTrip, trips } = (getState() as RootState).trips;
    
    if (currentTrip?.tripId === tripId) {
      dispatch(setCurrentTrip({ ...currentTrip, ...data }));
    }
    
    const trip = trips.find((t) => t.tripId === tripId);
    if (trip) {
      dispatch(updateTripInList({ ...trip, ...data }));
    }
  }
);

export const createTripThunk = createAsyncThunk(
  'trips/create',
  async (input: CreateTripInput, { dispatch }) => {
    const newTrip = await fbCreateTrip(input);
    dispatch(addTripToList(newTrip));
    return newTrip;
  }
);
