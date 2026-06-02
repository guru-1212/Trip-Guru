'use client';

import { GymPageShell } from '@/components/gym/GymPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGym } from '@/hooks/useGym';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GymDashboardPage() {
  const { profile, workoutLogs, weightLogs, checklist } = useGym();
  const latestWeight = weightLogs[0]?.weightKg ?? profile?.currentWeightKg ?? 0;
  const targetWeight = profile?.targetWeightKg ?? 0;
  const completedWorkouts = workoutLogs.filter((w) => w.completed).length;
  const completionRate = workoutLogs.length ? Math.round((completedWorkouts / workoutLogs.length) * 100) : 0;
  const checklistCount = checklist
    ? [checklist.workoutDone, checklist.proteinGoalMet, checklist.waterGoalMet, checklist.calorieGoalMet, checklist.sleepGoalMet].filter(Boolean).length
    : 0;

  return (
    <GymPageShell title="Gym Dashboard" subtitle="Track body metrics, workout consistency, and goal progress.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Current Weight" value={`${latestWeight || '-'} kg`} />
        <MetricCard title="Target Weight" value={`${targetWeight || '-'} kg`} />
        <MetricCard title="Workout Completion" value={`${completionRate}%`} />
        <MetricCard title="Calories Target" value={`${profile?.caloriesTarget ?? '-'} kcal`} />
        <MetricCard title="Protein Target" value={`${profile?.proteinTargetG ?? '-'} g`} />
        <MetricCard title="Daily Checklist" value={`${checklistCount}/5`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-bold mb-2">Workout consistency</p>
            <Progress value={completionRate} className="h-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold mb-2">Weight goal progress</p>
            <Progress
              value={
                profile
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          ((profile.currentWeightKg - latestWeight) /
                            Math.max(1, Math.abs(profile.currentWeightKg - profile.targetWeightKg))) *
                            100
                        )
                      )
                    )
                  : 0
              }
              className="h-2"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Weekly and monthly stats are available in the analytics section.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/gym/analytics"><Button size="sm">View Analytics</Button></Link>
            <Link href="/gym/progress"><Button size="sm" variant="outline">Update Progress</Button></Link>
          </div>
        </CardContent>
      </Card>
    </GymPageShell>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
