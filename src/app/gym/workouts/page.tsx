'use client';

import { FormEvent, useMemo, useState } from 'react';
import { GymPageShell } from '@/components/gym/GymPageShell';
import { WORKOUT_PLANS, EXERCISE_LIBRARY } from '@/lib/gymLibrary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGym } from '@/hooks/useGym';
import { useAppDispatch } from '@/store';
import { addWorkoutLogThunk } from '@/features/gym/gymThunks';

export default function GymWorkoutsPage() {
  const { uid, workoutLogs } = useGym();
  const dispatch = useAppDispatch();
  const [selectedPlan, setSelectedPlan] = useState(WORKOUT_PLANS[0].id);
  const [duration, setDuration] = useState(60);

  const plan = useMemo(() => WORKOUT_PLANS.find((p) => p.id === selectedPlan) ?? WORKOUT_PLANS[0], [selectedPlan]);

  function logWorkout(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    dispatch(
      addWorkoutLogThunk({
        uid,
        payload: {
          date: new Date().toISOString().slice(0, 10),
          workoutPlanId: plan.id,
          workoutType: plan.type,
          durationMinutes: duration,
          completed: true,
          exercises: plan.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: EXERCISE_LIBRARY.find((item) => item.id === ex.exerciseId)?.name ?? ex.exerciseId,
            sets: Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, reps: Number(ex.reps.split('-')[0]) || 8, weightKg: 0 })),
          })),
          notes: `Completed ${plan.name}`,
        },
      })
    );
  }

  return (
    <GymPageShell title="Workout Plans Library">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {WORKOUT_PLANS.map((item) => (
            <Card key={item.id} className={selectedPlan === item.id ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>{item.level}</Badge>
                    <Badge variant="secondary">{item.type.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Estimated {item.estimatedMinutes} min • {item.difficultyLabel}</p>
                <ul className="text-sm space-y-1">
                  {item.exercises.map((ex) => (
                    <li key={`${item.id}-${ex.exerciseId}`}>
                      {EXERCISE_LIBRARY.find((e) => e.id === ex.exerciseId)?.name ?? ex.exerciseId}: {ex.sets} sets x {ex.reps}, rest {ex.restSeconds}s
                    </li>
                  ))}
                </ul>
                <Button variant={selectedPlan === item.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPlan(item.id)}>
                  {selectedPlan === item.id ? 'Selected' : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Workout Tracking</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={logWorkout}>
              <div className="text-sm"><span className="text-muted-foreground">Current Plan:</span> <span className="font-bold">{plan.name}</span></div>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Duration (minutes)" />
              <Button type="submit" className="w-full">Log Completed Workout</Button>
            </form>
            <div>
              <p className="font-semibold text-sm mb-2">Recent Workouts</p>
              <div className="space-y-2 max-h-56 overflow-auto">
                {workoutLogs.slice(0, 6).map((w) => (
                  <div key={w.id} className="text-xs border rounded-lg p-2">
                    <p className="font-semibold">{w.date} • {w.durationMinutes} min</p>
                    <p className="text-muted-foreground">{w.exercises.length} exercises • {w.completed ? 'Completed' : 'Planned'}</p>
                  </div>
                ))}
                {workoutLogs.length === 0 ? <p className="text-sm text-muted-foreground">No workouts logged yet.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </GymPageShell>
  );
}
