'use client';

import { FloatingWorkoutTimer } from '@/components/workout/FloatingWorkoutTimer';
import { useWorkoutStore } from '@/workout/WorkoutContext';

export function GlobalWorkoutTimer() {
  const { activeWorkout } = useWorkoutStore();

  if (!activeWorkout) return null;

  return (
    <FloatingWorkoutTimer
      startedAt={activeWorkout.startedAt}
      splitName={activeWorkout.splitName}
    />
  );
}
