'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchTripById } from '@/features/trips/tripsThunks';

export function useTrip(tripId: string) {
  const dispatch = useAppDispatch();
  const { currentTrip, members, loading, error } = useAppSelector((s) => s.trips);

  useEffect(() => {
    if (tripId) {
      dispatch(fetchTripById(tripId));
    }
  }, [dispatch, tripId]);

  return { trip: currentTrip, members, loading, error };
}
