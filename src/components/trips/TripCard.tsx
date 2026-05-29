'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Users, Calendar, ArrowRight, TrendingUp } from 'lucide-react';
import { Trip } from '@/types/trip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TripStatusBadge } from './TripStatusBadge';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import dayjs from 'dayjs';

const tripTypeIcons: Record<string, string> = {
  friends: '👥',
  family: '👨‍👩‍👧',
  office: '💼',
  bike_ride: '🏍️',
  trekking: '🥾',
  custom: '✈️',
};

interface TripCardProps {
  trip: Trip;
  spent?: number;
  index?: number;
}

export function TripCard({ trip, spent = 0, index = 0 }: TripCardProps) {
  const progress = Math.min((spent / trip.expectedBudget) * 100, 100);
  const isOverBudget = spent > trip.expectedBudget;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link href={`/trips/${trip.tripId}`}>
        <Card className="group hover:border-primary/50 transition-all duration-300 cursor-pointer h-full overflow-hidden flex flex-col shadow-sm hover:shadow-md">
          <div className="h-2 w-full bg-primary/10 group-hover:bg-primary/20 transition-colors" />
          
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <TripStatusBadge status={trip.status} />
                <CardTitle className="text-xl flex items-center gap-2 group-hover:text-primary transition-colors">
                  <span className="text-2xl">{tripTypeIcons[trip.tripType] ?? '✈️'}</span>
                  {trip.tripName}
                </CardTitle>
              </div>
              <div className="p-2 rounded-full bg-muted group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-muted-foreground flex-grow">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{trip.destination}</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>{trip.membersCount} members</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg w-full">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <span>
                {dayjs(trip.startDate.toDate()).format('MMM D')} –{' '}
                {dayjs(trip.endDate.toDate()).format('MMM D, YYYY')}
              </span>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Budget Status</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(spent, trip.currency)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {formatCurrency(trip.expectedBudget, trip.currency)}
                    </span>
                  </p>
                </div>
                {isOverBudget && (
                  <div className="flex items-center gap-1 text-danger font-medium animate-pulse">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[10px]">OVER</span>
                  </div>
                )}
              </div>
              <Progress 
  value={progress} 
  className={`h-2 ${isOverBudget ? 'bg-danger/20 [&>div]:bg-danger' : '[&>div]:bg-primary'}`}
/>

            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
