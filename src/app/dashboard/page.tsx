'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PlusCircle, Wallet, Map, HandCoins, TestTube, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
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
import { TripInvitations } from '@/components/trips/TripInvitations';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [activeFilter, setActiveFilter] = useState('upcoming');

  const firstName = user?.name?.split(' ')[0] || 'Traveler';

  useEffect(() => {
    if (uid) dispatch(fetchUserTrips(uid));
  }, [uid, dispatch]);

  useEffect(() => {
    async function loadStats() {
      const spent: Record<string, number> = {};
      for (const trip of trips) {
        const expenses = await getExpenses(trip.tripId);
        spent[trip.tripId] = expenses.reduce((s, e) => s + e.amount, 0);
      }
      setSpentByTrip(spent);
    }
    if (trips.length > 0) loadStats();
  }, [trips]);

  const filteredAndGroupedTrips = useMemo(() => {
    const now = dayjs();
    const filtered = trips.filter((trip) => {
      // If filtering for test trips, only show test trips
      if (activeFilter === 'test_trips') {
        return trip.classification === 'test';
      }

      // Otherwise, only show real trips
      if (trip.classification === 'test') {
        return false;
      }

      const startDate = dayjs(trip.startDate.toDate());
      switch (activeFilter) {
        case 'upcoming':
          return trip.status === 'planned' && startDate.isAfter(now);
        case 'this_month':
          return startDate.isSame(now, 'month');
        case 'ongoing':
          return trip.status === 'ongoing';
        case 'completed':
          return trip.status === 'completed';
        case 'all':
        default:
          return true;
      }
    });

    return filtered.reduce((acc, trip) => {
      const category = trip.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(trip);
      return acc;
    }, {} as Record<string, Trip[]>);
  }, [trips, activeFilter]);

  const totalSpent = Object.values(spentByTrip).reduce((a, b) => a + b, 0);
  const realTrips = trips.filter((t) => t.classification !== 'test');
  const testTrips = trips.filter((t) => t.classification === 'test');

  if (loading && trips.length === 0) {
    // Keep a simple loading skeleton for the initial load
    return <DashboardSkeleton />;
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

      <TripInvitations />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          label="Real Trips"
          value={realTrips.length}
          icon={CheckCircle}
          color="primary"
        />
        <StatCard
          label="Test Trips"
          value={testTrips.length}
          icon={TestTube}
          color="warning"
        />
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent)}
          icon={Wallet}
          color="success"
        />
      </motion.div>
      
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="this_month">This Month</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Real</TabsTrigger>
          <TabsTrigger value="test_trips">Test Trips</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="space-y-6">
        {Object.keys(filteredAndGroupedTrips).length > 0 ? (
          Object.entries(filteredAndGroupedTrips)
            .sort(([catA], [catB]) => (catA === 'Uncategorized' ? 1 : catB === 'Uncategorized' ? -1 : catA.localeCompare(catB)))
            .map(([category, tripsInCategory]) => (
            <section key={category}>
              <h2 className="text-xl font-semibold capitalize mb-4">{category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tripsInCategory.map((trip, i) => (
                  <TripCard
                    key={trip.tripId}
                    trip={trip}
                    spent={spentByTrip[trip.tripId] ?? 0}
                    index={i}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <EmptyState
            title="No trips found"
            description={`There are no trips matching the "${activeFilter}" filter.`}
          />
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-8 w-full bg-muted/50 animate-pulse rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted/50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: 'primary' | 'success' | 'warning' }) {
  const colors = {
    primary: 'border-l-primary text-primary bg-primary/10 group-hover:bg-primary',
    success: 'border-l-success text-success bg-success/10 group-hover:bg-success',
    warning: 'border-l-warning text-warning bg-warning/10 group-hover:bg-warning',
  }
  return (
     <Card className={`relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 ${colors[color]}`}>
        <CardContent className="p-6 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${colors[color]} group-hover:text-white transition-colors duration-300`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <Icon className="h-24 w-24" />
          </div>
        </CardContent>
      </Card>
  )
}

