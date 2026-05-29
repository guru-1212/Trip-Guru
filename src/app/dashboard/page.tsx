'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, Wallet, Map, HandCoins } from 'lucide-react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { TripCard } from '@/components/trips/TripCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner, SkeletonCard } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchUserTrips } from '@/features/trips/tripsThunks';
import { getExpenses, syncTripData } from '@/firebase/firestore';
import { computeSettlements } from '@/lib/settlementAlgorithm';
import { getTripMembers } from '@/firebase/firestore';
import { useState } from 'react';
import { Trip } from '@/types/trip';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { uid, user } = useAuth();
  const dispatch = useAppDispatch();
  const { trips, loading } = useAppSelector((s) => s.trips);
  const [spentByTrip, setSpentByTrip] = useState<Record<string, number>>({});
  const [pendingSettlements, setPendingSettlements] = useState(0);

const firstName = (user as any)?.displayName?.split(' ')[0] || 'Traveler';
// adjsfl

  useEffect(() => {
    if (uid) dispatch(fetchUserTrips(uid));
  }, [uid, dispatch]);

  useEffect(() => {
    async function loadStats() {
      let totalPending = 0;
      const spent: Record<string, number> = {};

      for (const trip of trips) {
        // Silently repair trip data (e.g., member counts)
        await syncTripData(trip.tripId);
        
        const expenses = await getExpenses(trip.tripId);
        spent[trip.tripId] = expenses.reduce((s, e) => s + e.amount, 0);
        const members = await getTripMembers(trip.tripId);
        const computed = computeSettlements(expenses, members, trip.tripId);
        totalPending += computed.length;
      }

      setSpentByTrip(spent);
      setPendingSettlements(totalPending);
    }
    if (trips.length > 0) loadStats();
  }, [trips]);

  const grouped = useMemo(() => {
    const planned: Trip[] = [];
    const ongoing: Trip[] = [];
    const completed: Trip[] = [];
    trips.forEach((t) => {
      if (t.status === 'planned') planned.push(t);
      else if (t.status === 'ongoing') ongoing.push(t);
      else if (t.status === 'completed') completed.push(t);
    });
    return { planned, ongoing, completed };
  }, [trips]);

  const totalSpent = Object.values(spentByTrip).reduce((a, b) => a + b, 0);

  if (loading && trips.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted/50 animate-pulse rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted/50 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hi, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Ready for your next adventure?
          </p>
        </div>
        <Link href="/trips/new">
          <Button size="lg" className="rounded-full px-6 shadow-md hover:shadow-lg transition-all duration-300">
            <PlusCircle className="h-5 w-5 mr-2" /> New trip
          </Button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <Map className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total trips</p>
              <p className="text-3xl font-bold tracking-tight">{trips.length}</p>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <Map className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-success">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-white transition-colors duration-300">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total spent</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-l-warning">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white transition-colors duration-300">
              <HandCoins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending settlements</p>
              <p className="text-3xl font-bold tracking-tight">{pendingSettlements}</p>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <HandCoins className="h-24 w-24" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description="Create your first group trip and start tracking expenses together."
          actionLabel="Create trip"
          onAction={() => (window.location.href = '/trips/new')}
        />
      ) : (
        <>
          {(['planned', 'ongoing', 'completed'] as const).map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            return (
              <section key={status}>
                <h2 className="text-lg font-semibold capitalize mb-4">{status}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((trip, i) => (
                    <TripCard
                      key={trip.tripId}
                      trip={trip}
                      spent={spentByTrip[trip.tripId] ?? 0}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
