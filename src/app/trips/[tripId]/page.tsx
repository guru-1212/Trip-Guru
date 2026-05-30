'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { BudgetGauge } from '@/components/analytics/BudgetGauge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/store';
import { useExpenses } from '@/hooks/useExpenses';
import { getMemberKey, formatCurrency } from '@/lib/utils';
import { syncTripData } from '@/firebase/firestore';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { updateTripExpectedBudget } from '@/features/trips/tripsThunks';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function TripOverviewPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  useEffect(() => {
    if (tripId) {
      syncTripData(tripId).catch(console.error);
    }
  }, [tripId]);

  return (
    <TripPageShell tripId={tripId}>
      <OverviewContent tripId={tripId} />
    </TripPageShell>
  );
}

function OverviewContent({ tripId }: { tripId: string }) {
  const dispatch = useAppDispatch();
  const trip = useAppSelector((s) => s.trips.currentTrip);
  const members = useAppSelector((s) => s.trips.members);
  const { allExpenses, totalSpent, totalPlanned } = useExpenses();

  if (!trip) return null;

  const showSyncAlert = Math.round(totalPlanned) !== Math.round(trip.expectedBudget);
  const isOverPlanned = totalPlanned > trip.expectedBudget;

  const handleSync = () => {
    dispatch(updateTripExpectedBudget({ tripId, amount: totalPlanned }));
  };

  const recent = [...allExpenses]
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 5);

  const getName = (uid: string) =>
    members.find((m) => getMemberKey(m) === uid)?.name ?? 'Member';

  return (
    <div className="space-y-6">
      {showSyncAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert 
            variant={isOverPlanned ? "destructive" : "default"} 
            className={`flex items-center justify-between gap-4 ${
              isOverPlanned 
                ? "bg-destructive/10 border-destructive/20 text-destructive" 
                : "bg-primary/10 border-primary/20 text-primary"
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <div>
                <AlertTitle className="text-sm font-bold uppercase tracking-tight">
                  {isOverPlanned ? "Budget Exceeded" : "Budget Out of Sync"}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {isOverPlanned 
                    ? `Your planned items (${formatCurrency(totalPlanned, trip.currency)}) exceed your budget.`
                    : `Your detailed plan total (${formatCurrency(totalPlanned, trip.currency)}) differs from your trip budget.`
                  }
                </AlertDescription>
              </div>
            </div>
            <Button 
              size="sm" 
              variant={isOverPlanned ? "destructive" : "default"}
              className="shrink-0 h-8 gap-1 text-[10px] uppercase font-bold"
              onClick={handleSync}
            >
              <RefreshCcw className="h-3 w-3" />
              Sync Budget
            </Button>
          </Alert>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetGauge
          expected={trip.expectedBudget}
          spent={totalSpent}
          planned={totalPlanned}
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
    </div>
  );
}
