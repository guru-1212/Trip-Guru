import dayjs from 'dayjs';
import { Trip, TripStatus } from '@/types/trip';
import { updateTripStatus } from '@/firebase/firestore';

export async function transitionTripStatus(trip: Trip): Promise<Trip> {
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    return trip;
  }

  const today = dayjs().startOf('day');
  const start = dayjs(trip.startDate.toDate()).startOf('day');
  const end = dayjs(trip.endDate.toDate()).startOf('day');

  let newStatus: TripStatus = trip.status;

  if (today.isAfter(end) && trip.status === 'ongoing') {
    newStatus = 'completed';
  } else if (
    (today.isSame(start) || today.isAfter(start)) &&
    trip.status === 'planned'
  ) {
    newStatus = 'ongoing';
  }

  if (newStatus !== trip.status) {
    await updateTripStatus(trip.tripId, newStatus);
    return { ...trip, status: newStatus };
  }

  return trip;
}

export async function transitionAllTrips(trips: Trip[]): Promise<Trip[]> {
  return Promise.all(trips.map(transitionTripStatus));
}
