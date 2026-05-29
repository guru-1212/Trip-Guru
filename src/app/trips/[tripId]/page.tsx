'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { BudgetGauge } from '@/components/analytics/BudgetGauge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSelector } from '@/store';
import { useExpenses } from '@/hooks/useExpenses';
import { getMemberKey, formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

export default function TripOverviewPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <OverviewContent tripId={tripId} />
    </TripPageShell>
  );
}

function OverviewContent({ tripId }: { tripId: string }) {
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);
  const { allExpenses, totalSpent } = useExpenses();

  if (!trip) return null;

  const recent = [...allExpenses]
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 5);

  const getName = (uid: string) =>
    members.find((m) => getMemberKey(m) === uid)?.name ?? 'Member';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BudgetGauge
        expected={trip.expectedBudget}
        spent={totalSpent}
        currency={trip.currency}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {members
            .filter((m) => m.inviteStatus === 'accepted')
            .map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>{m.name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-xs">{m.name}</span>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expenses yet</p>
          ) : (
            recent.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex justify-between text-sm border-b border-border pb-2 last:border-0"
              >
                <span>
                  {getName(e.paidBy)} paid {formatCurrency(e.amount, trip.currency)}{' '}
                  for {e.category}
                </span>
                <span className="text-muted-foreground">
                  {dayjs(e.createdAt.toDate()).format('MMM D')}
                </span>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
