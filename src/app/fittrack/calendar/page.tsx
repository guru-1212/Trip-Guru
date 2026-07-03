'use client';

import { PageTransition } from '@/components/workout/PageTransition';
import { YearlyCalendar } from '@/components/fittrack/YearlyCalendar';
import { useWorkoutStore } from '@/workout/WorkoutContext';

export default function CalendarPage() {
  const { workouts, profile, hydrated } = useWorkoutStore();

  if (!hydrated) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="ft-title text-2xl font-bold">Calendar</h1>
          <p className="ft-subtitle text-sm mt-0.5">Your year of consistency</p>
        </div>
        <YearlyCalendar workouts={workouts} profile={profile} />
      </div>
    </PageTransition>
  );
}
