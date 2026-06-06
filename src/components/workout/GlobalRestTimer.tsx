'use client';

import { RestTimer } from '@/components/workout/RestTimer';
import { useWorkoutStore } from '@/workout/WorkoutContext';

export function GlobalRestTimer() {
  const { activeWorkout, profile, patchActiveWorkout } = useWorkoutStore();

  const endTime = activeWorkout?.restTimerEnd ?? null;
  const defaultSeconds = activeWorkout?.restTimerSeconds ?? profile.prefs.restTimer;

  if (!endTime) return null;

  return (
    <RestTimer
      endTime={endTime}
      defaultSeconds={defaultSeconds}
      soundEnabled={profile.prefs.sound}
      onComplete={() => {
        patchActiveWorkout((prev) => ({ ...prev, restTimerEnd: null }));
      }}
      onDurationChange={(s) => {
        patchActiveWorkout((prev) => {
          const diff = s - prev.restTimerSeconds;
          return {
            ...prev,
            restTimerSeconds: s,
            restTimerEnd: prev.restTimerEnd ? prev.restTimerEnd + diff * 1000 : null,
          };
        });
      }}
      onClose={() => {
        patchActiveWorkout((prev) => ({ ...prev, restTimerEnd: null }));
      }}
    />
  );
}
