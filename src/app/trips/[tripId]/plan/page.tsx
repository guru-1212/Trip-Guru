'use client';

import { useParams } from 'next/navigation';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { TripPlanView } from '@/components/tripPlan/TripPlanView';
import { useTripPlan } from '@/hooks/useTripPlan';
import { useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Map } from 'lucide-react';

export default function TripPlanPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <PlanContent tripId={tripId} />
    </TripPageShell>
  );
}

function PlanContent({ tripId }: { tripId: string }) {
  const { uid } = useAuth();
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);
  const { plan, loading, saving, persist, resetDefault } = useTripPlan(tripId);

  const myMember = members.find((m) => m.userId === uid);
  const canEdit =
    myMember?.role === 'owner' || myMember?.role === 'editor';

  if (loading) {
    return <LoadingSpinner label="Loading trip plan..." />;
  }

  if (!plan) {
    return (
      <EmptyState
        icon={Map}
        title="No plan yet"
        description="Import a CSV or reset to the sample Lonavala plan."
      />
    );
  }

  return (
    <TripPlanView
      plan={plan}
      currency={trip?.currency ?? 'INR'}
      saving={saving}
      onPersist={persist}
      onReset={resetDefault}
      canEdit={canEdit ?? false}
    />
  );
}
