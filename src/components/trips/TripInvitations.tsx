'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { fetchTripInvitations, acceptInvitation, declineInvitation } from '@/features/trips/tripsThunks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { User, Mail, Calendar, MapPin, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';

export function TripInvitations() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { invitations, invitationsLoading } = useAppSelector((state) => state.trips);

  useEffect(() => {
    if (user?.email && user?.phone) {
      dispatch(fetchTripInvitations({ email: user.email, phone: user.phone }));
    }
  }, [dispatch, user]);

  const handleAccept = (memberId: string) => {
    dispatch(acceptInvitation(memberId));
  };

  const handleDecline = (memberId: string) => {
    dispatch(declineInvitation(memberId));
  };

  if (invitationsLoading) {
    return (
      <div className="my-10 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-2">
           <div className="h-48 bg-muted rounded-3xl" />
           <div className="h-48 bg-muted rounded-3xl" />
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="my-10">
      <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Mail className="h-5 w-5" />
        </div>
        Trip Invitations
        <span className="ml-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{invitations.length} New</span>
      </h2>
      
      <div className="grid gap-6 md:grid-cols-2">
        {invitations.map(({ member, trip, invitedBy }) => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="rounded-[32px] overflow-hidden border-border/40 shadow-xl shadow-slate-200/20 dark:shadow-none bg-white dark:bg-slate-900/50">
              <div className="p-5 sm:p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{trip.tripName}</h3>
                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                       <MapPin className="h-3 w-3 text-primary" /> {trip.destination}
                    </p>
                  </div>
                  <Sparkles className="text-primary/40 h-5 w-5" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-border/20">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {dayjs(trip.startDate.toDate()).format('MMM D')} -{' '}
                      {dayjs(trip.endDate.toDate()).format('MMM D, YYYY')}
                    </span>
                  </div>
                  
                  {invitedBy && (
                    <div className="flex items-center gap-3 px-1">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                          {invitedBy.name?.[0]?.toUpperCase()}
                       </div>
                       <p className="text-xs font-bold text-muted-foreground">
                         Invited by <span className="text-slate-900 dark:text-slate-200">{invitedBy.name}</span>
                       </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-2 flex gap-3">
                <Button
                  variant="ghost"
                  className="w-full rounded-2xl font-black text-xs uppercase tracking-widest h-12 hover:bg-destructive/5 hover:text-destructive transition-all"
                  onClick={() => handleDecline(member.id)}
                >
                  Decline
                </Button>
                <Button
                  className="w-full rounded-2xl font-black text-xs uppercase tracking-widest h-12 shadow-lg shadow-primary/20 transition-all active:scale-95"
                  onClick={() => handleAccept(member.id)}
                >
                  Join Trip
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
