'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { TripNav } from './TripNav';
import { useTrip } from '@/hooks/useTrip';
import { useRealtimeTrip } from '@/hooks/useRealtimeTrip';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TripStatusBadge } from './TripStatusBadge';
import { MapPin } from 'lucide-react';
import dayjs from 'dayjs';

export function TripPageShell({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppShell>
        <TripPageContent tripId={tripId}>{children}</TripPageContent>
      </AppShell>
    </ProtectedRoute>
  );
}

function TripPageContent({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  const { trip, loading } = useTrip(tripId);
  useRealtimeTrip(tripId);

  if (loading && !trip) {
    return <LoadingSpinner label="Loading trip..." />;
  }

  if (!trip) {
    return (
      <p className="text-center text-muted-foreground py-12">Trip not found</p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{trip.tripName}</h1>
          <TripStatusBadge status={trip.status} />
        </div>
        <p className="flex items-center gap-2 text-muted-foreground mt-1">
          <MapPin className="h-4 w-4" />
          {trip.destination} ·{' '}
          {dayjs(trip.startDate.toDate()).format('MMM D')} –{' '}
          {dayjs(trip.endDate.toDate()).format('MMM D, YYYY')}
        </p>
      </div>
      <TripNav tripId={tripId} />
      {children}
    </div>
  );
}
