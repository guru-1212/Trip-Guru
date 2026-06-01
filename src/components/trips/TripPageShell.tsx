'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { TripNav } from './TripNav';
import { useTrip } from '@/hooks/useTrip';
import { useRealtimeTrip } from '@/hooks/useRealtimeTrip';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TripStatusBadge } from './TripStatusBadge';
import { MapPin, Pencil, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TripForm } from './TripForm';
import { motion } from 'framer-motion';
import { PageBackNav } from '@/components/common/PageBackNav';

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
  const { uid } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  useRealtimeTrip(tripId);

  if (loading && !trip) {
    return <LoadingSpinner label="Loading trip..." />;
  }

  if (!trip) {
    return (
      <p className="text-center text-muted-foreground py-12">Trip not found</p>
    );
  }

  const isOwner = trip.createdBy === uid;

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <PageBackNav />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3">
               <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                 {trip.tripName}
               </h1>
               {isOwner && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Trip Details</DialogTitle>
                    </DialogHeader>
                    <TripForm 
                      initialData={trip} 
                      onSuccess={() => setIsEditDialogOpen(false)} 
                    />
                  </DialogContent>
                </Dialog>
               )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate">{trip.destination}</span>
              </p>
              <div className="w-1.5 h-1.5 rounded-full bg-border" />
              <p className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>
                  {dayjs(trip.startDate.toDate()).format('MMM D')} –{' '}
                  {dayjs(trip.endDate.toDate()).format('MMM D, YYYY')}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <TripStatusBadge status={trip.status} />
          </div>
        </div>
      </motion.div>

      <div>
        <TripNav tripId={tripId} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
