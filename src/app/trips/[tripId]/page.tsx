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
import { 
  AlertCircle, 
  RefreshCcw, 
  Utensils, 
  Bed, 
  Fuel, 
  Navigation, 
  ShoppingBag, 
  Ticket, 
  AlertTriangle, 
  MoreHorizontal,
  ArrowUpRight
} from 'lucide-react';
import { updateTripExpectedBudget } from '@/features/trips/tripsThunks';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

const categoryIcons: Record<string, any> = {
  Food: Utensils,
  Hotel: Bed,
  Petrol: Fuel,
  Toll: Navigation,
  Shopping: ShoppingBag,
  Ticket: Ticket,
  Emergency: AlertTriangle,
  Misc: MoreHorizontal,
};

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

  const showSyncAlert = totalPlanned > trip.expectedBudget;

  const handleSync = () => {
    dispatch(updateTripExpectedBudget({ tripId, amount: totalPlanned }));
  };

  const recent = [...allExpenses]
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {showSyncAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert 
            variant="destructive" 
            className="flex items-center justify-between gap-4 bg-destructive/10 border-destructive/20 text-destructive"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <div>
                <AlertTitle className="text-sm font-bold uppercase tracking-tight">
                  Budget Exceeded
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Your planned items ({formatCurrency(totalPlanned, trip.currency)}) exceed your trip budget.
                </AlertDescription>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="destructive"
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

        <Card className="border-border/40 shadow-sm rounded-[32px] overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="text-xl font-black">Trip Members</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8 flex flex-wrap gap-4">
            {members
              .filter((m) => m.inviteStatus === 'accepted')
              .map((m) => (
                <div key={m.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <Avatar className="h-14 w-14 border-2 border-background shadow-md ring-1 ring-border/10 transition-transform group-hover:scale-110">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/5 text-primary font-black uppercase text-lg">
                      {m.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter transition-colors group-hover:text-primary">
                    {m.name.split(' ')[0]}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/40 shadow-sm rounded-[32px] overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="px-8 pt-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black">Recent Activity</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-muted-foreground/50" />
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {recent.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-muted/20 rounded-3xl border border-dashed border-border/50">
                 <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-50">
                    <MoreHorizontal className="h-6 w-6" />
                 </div>
                 <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No history yet</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-[21px] before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:to-transparent before:z-0">
                {recent.map((e, i) => {
                  const Icon = categoryIcons[e.category] || MoreHorizontal;
                  const member = members.find((m) => getMemberKey(m) === e.paidBy);
                  const isPlanned = e.expenseType === 'planned';
                  
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-4 relative z-10 group"
                    >
                      <div className="shrink-0 relative">
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm group-hover:scale-110",
                          isPlanned ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 ring-2 ring-background rounded-full overflow-hidden">
                          <Avatar className="h-5 w-5">
                             <AvatarImage src="" />
                             <AvatarFallback className="text-[6px] font-black bg-primary text-white">
                               {member?.name?.[0]?.toUpperCase() ?? '?'}
                             </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex justify-between items-start gap-2">
                           <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                             <span className="text-primary font-black uppercase text-[10px] tracking-tighter mr-1.5">
                               {isPlanned ? "Draft" : "Paid"}
                             </span>
                             {member?.name ?? 'Someone'} added {e.category}
                           </p>
                           <span className="text-sm font-black text-slate-900 dark:text-white shrink-0">
                             {formatCurrency(e.amount, trip.currency)}
                           </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                             {dayjs(e.createdAt.toDate()).fromNow()}
                           </span>
                           {e.note && (
                             <>
                               <div className="w-1 h-1 rounded-full bg-border" />
                               <span className="text-[10px] font-medium text-muted-foreground truncate italic">"{e.note}"</span>
                             </>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
