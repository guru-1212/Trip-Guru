'use client';

import { GymPageShell } from '@/components/gym/GymPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGym } from '@/hooks/useGym';

export default function GymAnalyticsPage() {
  const { profile, workoutLogs, weightLogs, checklist } = useGym();

  const consistency = workoutLogs.length
    ? Math.round((workoutLogs.filter((w) => w.completed).length / workoutLogs.length) * 100)
    : 0;

  const prCount = workoutLogs.reduce((acc, log) => {
    const topSet = Math.max(...log.exercises.flatMap((ex) => ex.sets.map((set) => set.weightKg || 0)));
    return acc + (topSet > 0 ? 1 : 0);
  }, 0);

  const calorieCompliance = checklist?.calorieGoalMet ? 100 : 0;
  const proteinCompliance = checklist?.proteinGoalMet ? 100 : 0;

  const firstWeight = weightLogs[weightLogs.length - 1]?.weightKg ?? profile?.currentWeightKg ?? 0;
  const latestWeight = weightLogs[0]?.weightKg ?? profile?.currentWeightKg ?? 0;
  const goalWeight = profile?.targetWeightKg ?? latestWeight;
  const progressDelta = Math.abs(firstWeight - latestWeight);
  const remaining = Math.abs(goalWeight - latestWeight);
  const goalEtaWeeks = progressDelta > 0 ? Math.ceil((remaining / progressDelta) * Math.max(1, weightLogs.length / 4)) : 0;

  return (
    <GymPageShell title="Analytics & Insights" subtitle="Weekly and monthly fitness trends.">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Insight title="Weight Trend" value={`${latestWeight} kg`} sub={`Change tracked: ${progressDelta.toFixed(1)} kg`} />
        <Insight title="Strength Progression" value={`${prCount} PR sessions`} sub="Based on logged top sets" />
        <Insight title="Workout Consistency" value={`${consistency}%`} sub="Completed workouts / total logs" />
        <Insight title="Calorie Compliance" value={`${calorieCompliance}%`} sub="Today" />
        <Insight title="Protein Compliance" value={`${proteinCompliance}%`} sub="Today" />
        <Insight title="Goal Estimation" value={goalEtaWeeks ? `${goalEtaWeeks} weeks` : 'Insufficient data'} sub="Estimated time to target" />
      </div>
    </GymPageShell>
  );
}

function Insight({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
