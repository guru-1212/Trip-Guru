'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  PlusCircle, 
  TrendingUp, 
  Target, 
  ArrowRight,
  ChevronRight,
  Calendar,
  MapPin,
  Sparkles,
  Globe,
  MoreVertical,
  TestTube,
  CheckCircle,
  FolderPen,
  Pencil
} from 'lucide-react';
import dayjs from 'dayjs';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchUserTrips } from '@/features/trips/tripsThunks';
import { getExpenses } from '@/firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { TripInvitations } from '@/components/trips/TripInvitations';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const [userSpentByTrip, setUserSpentByTrip] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [viewMode, setViewMode] = useState<'real' | 'test'>('real');

  useEffect(() => {
    if (uid) dispatch(fetchUserTrips(uid));
  }, [uid, dispatch]);

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      const tripSpent: Record<string, number> = {};
      const userSpent: Record<string, number> = {};
      
      for (const trip of trips) {
        const expenses = await getExpenses(trip.tripId);
        tripSpent[trip.tripId] = expenses
          .filter((e) => (e.expenseType || 'actual') === 'actual')
          .reduce((s, e) => s + e.amount, 0);
        userSpent[trip.tripId] = expenses
          .filter((e) => e.paidBy === uid && (e.expenseType || 'actual') === 'actual')
          .reduce((s, e) => s + e.amount, 0);
      }
      
      setSpentByTrip(tripSpent);
      setUserSpentByTrip(userSpent);
      setLoadingStats(false);
    }
    if (trips.length > 0 && uid) loadStats();
    else if (trips.length === 0) setLoadingStats(false);
  }, [trips, uid]);

  const ongoingTrip = trips.find(t => t.status === 'ongoing' && (t.classification || 'real') === viewMode);
  const upcomingTrips = trips
    .filter(t => t.status === 'planned' && (t.classification || 'real') === viewMode)
    .sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis());
  
  const filteredTripsForStats = trips.filter(t => (t.classification || 'real') === viewMode);
  
  const totalPersonalSpent = filteredTripsForStats.reduce((acc, t) => acc + (userSpentByTrip[t.tripId] || 0), 0);
  const totalRealSpent = filteredTripsForStats.reduce((acc, t) => acc + (spentByTrip[t.tripId] || 0), 0);
  const totalUpcomingBudget = upcomingTrips.reduce((sum, t) => sum + t.expectedBudget, 0);
  
  const planAccuracy = useMemo(() => {
    const completed = filteredTripsForStats.filter(t => t.status === 'completed');
    if (completed.length === 0) return 100;
    const accuracies = completed.map(t => {
      const actual = spentByTrip[t.tripId] || 0;
      const expected = t.expectedBudget || 1;
      return Math.max(0, 100 - Math.abs(((actual - expected) / expected) * 100));
    });
    return Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length);
  }, [filteredTripsForStats, spentByTrip]);

  if (loading && trips.length === 0) return <DashboardSkeleton />;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 md:space-y-12"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <motion.div variants={item} className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Hi, {user?.name?.split(' ')[0] || 'Traveler'}! 👋
          </h1>
          <p className="text-muted-foreground text-base md:text-lg font-medium">
            Your "Travel OS" is ready for adventure.
          </p>
        </motion.div>
        <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
          <div className="bg-muted p-1 rounded-2xl flex gap-1 self-start sm:self-center shadow-inner">
            <Button 
              variant={viewMode === 'real' ? 'default' : 'ghost'} 
              size="sm" 
              className="rounded-xl px-4 h-9 text-xs font-bold"
              onClick={() => setViewMode('real')}
            >
              Real Trips
            </Button>
            <Button 
              variant={viewMode === 'test' ? 'default' : 'ghost'} 
              size="sm" 
              className="rounded-xl px-4 h-9 text-xs font-bold"
              onClick={() => setViewMode('test')}
            >
              Test Trips
            </Button>
          </div>
          <Link href="/trips/new" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto rounded-2xl px-8 h-12 md:h-14 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
              <PlusCircle className="h-5 w-5 mr-3" /> Plan New Trip
            </Button>
          </Link>
        </motion.div>
      </header>

      <TripInvitations />

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Featured Trip - Spans 2x2 on Large screens */}
        <motion.div variants={item} className="md:col-span-2 md:row-span-2">
          {ongoingTrip ? (
            <Link href={`/trips/${ongoingTrip.tripId}`}>
              <Card className="h-full min-h-[300px] md:min-h-[340px] rounded-[24px] md:rounded-[32px] overflow-hidden border-0 relative group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 z-10" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80')] bg-cover opacity-30 mix-blend-overlay z-0 transition-transform duration-700 group-hover:scale-110" />
                
                <CardContent className="relative z-20 p-6 md:p-10 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
                       Ongoing Now
                    </span>
                    <Sparkles className="text-indigo-400/50 h-5 w-5 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight">
                      {ongoingTrip.tripName}
                    </h2>
                    <p className="text-indigo-200/70 text-sm md:text-base font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {ongoingTrip.destination}
                    </p>
                  </div>

                  <div className="mt-auto pt-8 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                         <p className="text-xs md:text-sm font-bold text-white/90">
                           {formatCurrency(spentByTrip[ongoingTrip.tripId] || 0, ongoingTrip.currency)} 
                           <span className="text-white/40 font-normal ml-1">spent</span>
                         </p>
                         <p className="text-[10px] md:text-xs font-black text-indigo-400">
                           {Math.round(((spentByTrip[ongoingTrip.tripId] || 0) / ongoingTrip.expectedBudget) * 100)}% Used
                         </p>
                      </div>
                      <Progress 
                        value={((spentByTrip[ongoingTrip.tripId] || 0) / ongoingTrip.expectedBudget) * 100} 
                        className="h-2.5 bg-white/10 [&>div]:bg-emerald-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="h-full min-h-[300px] md:min-h-[340px] rounded-[24px] md:rounded-[32px] bg-muted/30 border-dashed border-2 flex items-center justify-center text-center p-6 md:p-12 group overflow-hidden relative transition-all hover:bg-muted/40">
               <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="relative z-10 space-y-4 max-w-xs">
                 <AnimatedGlobe />
                 <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Adventure Awaits</h3>
                 <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                   Your dashboard is ready, but your next journey hasn't started. Create or start a trip to begin!
                 </p>
                 <Link href="/trips/new" className="inline-block mt-2">
                   <Button variant="outline" className="rounded-xl font-bold border-primary/20 hover:bg-primary/5 shadow-sm">
                     Plan Your First Trip
                   </Button>
                 </Link>
               </div>
            </Card>
          )}
        </motion.div>

        {/* Total Real Spent Stat */}
        <motion.div variants={item}>
          <Card className="h-full rounded-[24px] md:rounded-[28px] border-border/40 shadow-sm p-6 md:p-8 flex flex-col justify-between group">
             <div>
               <div className="flex justify-between items-start mb-3 md:mb-4">
                 <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Real-time Spent</span>
                 <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Live</span>
                 </div>
               </div>
               <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none">
                 {formatCurrency(totalRealSpent)}
               </h3>
               <p className="text-muted-foreground text-[10px] font-bold mt-3 uppercase tracking-tight">
                 Across all journeys
               </p>
             </div>
             <div className="h-10 md:h-12 w-full bg-indigo-50 dark:bg-indigo-500/10 rounded-xl mt-4 md:mt-6 overflow-hidden flex items-end gap-1 px-1 py-1">
                {[40, 70, 30, 85, 50, 95, 60].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500/30 rounded-t-sm transition-all group-hover:bg-indigo-500 group-hover:scale-y-110" style={{ height: `${h}%` }} />
                ))}
             </div>
          </Card>
        </motion.div>

        {/* Travel Network */}
        <motion.div variants={item}>
          <Card className="h-full rounded-[24px] md:rounded-[28px] border-border/40 shadow-sm p-6 md:p-8 group">
             <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-3 md:mb-4">Travel Network</span>
             <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none mb-3 md:mb-4">
               {trips.reduce((acc, t) => acc + (t.membersCount || 1), 0)}
             </h3>
             <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-tight">Active Connections</span>
             
             <div className="flex -space-x-2.5 mt-6 md:mt-8">
               {[1, 2, 3, 4].map(i => (
                 <Avatar key={i} className="border-2 border-background h-8 w-8 md:h-10 md:w-10 ring-1 ring-primary/5">
                   <AvatarImage src={`https://i.pravatar.cc/100?u=${i}`} />
                   <AvatarFallback className="bg-primary/5 text-[10px] font-black">M</AvatarFallback>
                 </Avatar>
               ))}
               <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-black text-muted-foreground ring-1 ring-primary/5">
                 +12
               </div>
             </div>
          </Card>
        </motion.div>

        {/* Plan Accuracy */}
        <motion.div variants={item}>
          <Card className="h-full rounded-[24px] md:rounded-[28px] border-border/40 shadow-sm p-6 md:p-8 flex flex-col justify-between">
             <div>
               <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-3 md:mb-4">Plan Accuracy</span>
               <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-none mb-1">
                 {planAccuracy}%
               </h3>
               <p className="text-muted-foreground text-[10px] md:text-xs font-medium uppercase tracking-tight">Budget Adherence</p>
             </div>
             <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-4 md:mt-6 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${planAccuracy}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20" 
                />
             </div>
          </Card>
        </motion.div>

        {/* Upcoming Budget */}
        <motion.div variants={item}>
          <Card className="h-full rounded-[24px] md:rounded-[28px] border-0 bg-indigo-600 dark:bg-indigo-500 shadow-xl p-6 md:p-8 text-white flex flex-col justify-between transition-transform hover:scale-[1.02]">
             <div>
               <span className="text-[10px] font-black uppercase text-white/60 tracking-widest block mb-3 md:mb-4">Upcoming Budget</span>
               <h3 className="text-2xl md:text-3xl font-black text-white leading-none mb-2">
                 {formatCurrency(totalUpcomingBudget)}
               </h3>
               <p className="text-white/70 text-[10px] md:text-xs font-bold uppercase tracking-tight">Next 30 Days</p>
             </div>
             <div className="mt-6 md:mt-8 flex justify-end">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                </div>
             </div>
          </Card>
        </motion.div>

      </div>

      {/* Upcoming Journeys Section */}
      <section className="space-y-6">
        <motion.div variants={item} className="flex justify-between items-center px-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
             <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Upcoming
          </h2>
          <Button variant="ghost" size="sm" className="text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/5">
             View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </motion.div>

        <div className="space-y-3">
          {upcomingTrips.length > 0 ? (
            upcomingTrips.map((trip, i) => (
              <motion.div 
                key={trip.tripId} 
                variants={item}
                className="group"
              >
                <Link href={`/trips/${trip.tripId}`}>
                  <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-4 md:p-5 border border-border/40 shadow-sm hover:border-primary/50 hover:shadow-md transition-all flex flex-row items-center gap-4 md:gap-6 overflow-hidden">
                    <div className="w-10 h-10 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl bg-primary/5 flex items-center justify-center text-xl md:text-3xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      {trip.tripType === 'bike_ride' ? '🏍️' : trip.tripType === 'trekking' ? '🥾' : '✈️'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white truncate">
                        {trip.tripName}
                      </h3>
                      <p className="text-[10px] md:text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
                        <MapPin className="h-3 w-3 text-primary shrink-0" /> {trip.destination}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8 shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-tighter mb-0.5">Budget</p>
                        <p className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-200">{formatCurrency(trip.expectedBudget, trip.currency)}</p>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-border/60 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all">
                        <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          ) : (
             <motion.div variants={item}>
               <EmptyState 
                  title="No journeys planned" 
                  description="Time to dream big and plan something new!"
                />
             </motion.div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-16 bg-muted/50 rounded-2xl w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="md:col-span-2 md:row-span-2 h-72 bg-muted/50 rounded-[24px] md:rounded-[32px]" />
        <div className="h-36 bg-muted/50 rounded-[24px] md:rounded-[28px]" />
        <div className="h-36 bg-muted/50 rounded-[24px] md:rounded-[28px]" />
        <div className="h-36 bg-muted/50 rounded-[24px] md:rounded-[28px]" />
        <div className="h-36 bg-muted/50 rounded-[24px] md:rounded-[28px]" />
      </div>
    </div>
  );
}

function AnimatedGlobe() {
  return (
    <div className="relative w-24 h-24 mx-auto mb-6">
      {/* Outer rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-full"
      />
      
      {/* Middle rotating ring (reverse) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 border border-primary/10 rounded-full"
      />
      
      {/* Inner glowing globe */}
      <motion.div
        animate={{ 
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.15)]"
      >
        <Globe className="h-10 w-10 text-primary animate-pulse" strokeWidth={1.5} />
      </motion.div>
      
      {/* Floating particles */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeInOut"
          }}
          className="absolute w-1 h-1 bg-primary/40 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"
          style={{
            top: `${15 + Math.random() * 70}%`,
            left: `${15 + Math.random() * 70}%`,
          }}
        />
      ))}
    </div>
  );
}
