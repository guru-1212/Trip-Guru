'use client';

import { useParams } from 'next/navigation';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { SettlementCard } from '@/components/settlement/SettlementCard';
import { BalanceSummary } from '@/components/settlement/BalanceSummary';
import { useSettlement } from '@/hooks/useSettlement';
import { useAppSelector, useAppDispatch } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { markPaidThunk } from '@/features/settlements/settlementsThunks';
import { saveSettlements } from '@/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandCoins } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function TripSettlementPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <SettlementContent tripId={tripId} />
    </TripPageShell>
  );
}

function SettlementContent({ tripId }: { tripId: string }) {
  const dispatch = useAppDispatch();
  const { uid } = useAuth();
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const expenses = useAppSelector((s) => s.expenses.expenses);
  const members = useAppSelector((s) => s.trips.members);
  const { computed, settlements, getMemberName, recompute } = useSettlement(tripId);

  const paidHistory = settlements.filter((s) => s.status === 'paid');
  const displaySettlements = computed.length > 0 ? computed : [];

  const handleSaveToFirestore = async () => {
    await saveSettlements(computed, uid ?? undefined);
    recompute();
  };

  const canMarkPaid = (fromUid: string, toUid: string) =>
    uid === fromUid || uid === toUid || trip?.createdBy === uid;

  if (displaySettlements.length === 0 && expenses.length === 0) {
    return (
      <EmptyState
        icon={HandCoins}
        title="All settled up"
        description="Add expenses to calculate who owes whom."
      />
    );
  }

  return (
    <div className="space-y-6">
      <BalanceSummary
        expenses={expenses}
        members={members}
        currency={trip?.currency ?? 'INR'}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Suggested settlements</h2>
        {computed.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleSaveToFirestore}>
            Save to history
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {displaySettlements.map((s, i) => (
          <SettlementCard
            key={`${s.fromUid}-${s.toUid}-${i}`}
            settlement={s}
            fromName={getMemberName(s.fromUid)}
            toName={getMemberName(s.toUid)}
            currency={trip?.currency ?? 'INR'}
            canMarkPaid={canMarkPaid(s.fromUid, s.toUid)}
            onMarkPaid={() => {
              if (s.id.startsWith('computed_')) {
                handleSaveToFirestore();
              } else {
                dispatch(markPaidThunk(s.id));
              }
            }}
            index={i}
          />
        ))}
      </div>

      {paidHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settlement history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paidHistory.map((s, i) => (
              <SettlementCard
                key={s.id}
                settlement={s}
                fromName={getMemberName(s.fromUid)}
                toName={getMemberName(s.toUid)}
                currency={trip?.currency ?? 'INR'}
                index={i}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
