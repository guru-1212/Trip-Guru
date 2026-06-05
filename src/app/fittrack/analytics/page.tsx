'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { ConsistencyGauge } from '@/components/workout/ConsistencyGauge';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  calcTrainingOverview,
  getStackedVolumeByMuscle,
  getVolumeSplitDonut,
  getAvgWeightPerSession,
  getRepRangeDistribution,
  getMuscleTrainingGaps,
  detectOvertraining,
  calcConsistencyScore,
  getRangeDates,
  type TimeRange,
} from '@/workout/analytics';

export default function AnalyticsPage() {
  const { workouts, profile, weeklyGoals, habits, hydrated } = useWorkoutStore();
  const [range, setRange] = useState<TimeRange>('month');

  const overview = useMemo(() => calcTrainingOverview(workouts, range), [workouts, range]);
  const { start, end } = useMemo(() => getRangeDates(range), [range]);
  const stacked = useMemo(() => getStackedVolumeByMuscle(workouts, 8), [workouts]);
  const donut = useMemo(() => getVolumeSplitDonut(workouts, start, end), [workouts, start, end]);
  const avgWeight = useMemo(() => getAvgWeightPerSession(workouts, start, end), [workouts, start, end]);
  const repRanges = useMemo(() => getRepRangeDistribution(workouts, start, end), [workouts, start, end]);
  const muscleGaps = useMemo(() => getMuscleTrainingGaps(workouts), [workouts]);
  const overtraining = useMemo(() => detectOvertraining(workouts), [workouts]);
  const consistency = useMemo(
    () => calcConsistencyScore(workouts, weeklyGoals, profile, habits),
    [workouts, weeklyGoals, profile, habits]
  );

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const hasWorkout = workouts.some((w) => w.date === d.format('YYYY-MM-DD'));
      days.push({ date: d.format('MMM D'), hasWorkout, isRest: !hasWorkout });
    }
    return days;
  }, [workouts]);

  if (!hydrated) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="ft-title text-2xl font-bold">Analytics</h1>
          <select className="ft-input w-auto text-sm" value={range} onChange={(e) => setRange(e.target.value as TimeRange)}>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="3months">3 Months</option>
            <option value="year">Year</option>
          </select>
        </div>

        {/* Training Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <OverviewCard label="Total Workouts" value={String(overview.totalWorkouts)} trend={overview.trends.workouts} />
          <OverviewCard label="Rest Days" value={String(overview.restDays)} trend={overview.trends.rest} invert />
          <OverviewCard label="Training Hours" value={`${overview.trainingHours}h`} trend={overview.trends.hours} />
          <OverviewCard label="Avg Duration" value={`${overview.avgDuration} min`} trend={Math.round(overview.trends.duration / 60)} />
        </div>

        {/* Volume Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="ft-card ft-card-padded">
            <h3 className="ft-title font-semibold mb-4">Weekly Volume by Muscle</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stacked.data}>
                <XAxis dataKey="week" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                {stacked.muscles.map((m) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={stacked.colors[m]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="ft-card ft-card-padded">
            <h3 className="ft-title font-semibold mb-4">Volume Split</h3>
            {donut.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, value }) => `${name} ${value}%`}>
                    {donut.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-16">No volume data</p>
            )}
          </div>
        </div>

        {/* Intensity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="ft-card ft-card-padded">
            <h3 className="ft-title font-semibold mb-4">Avg Weight per Session</h3>
            {avgWeight.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={avgWeight}>
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                  <Line type="monotone" dataKey="avgWeight" stroke="#378ADD" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">No data</p>
            )}
          </div>
          <div className="ft-card ft-card-padded">
            <h3 className="ft-title font-semibold mb-4">Rep Range Distribution</h3>
            <div className="space-y-3 mt-4">
              {repRanges.map((r) => {
                const max = Math.max(...repRanges.map((x) => x.count), 1);
                return (
                  <div key={r.range}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{r.range} reps</span>
                      <span className="text-muted-foreground">{r.count} sets</span>
                    </div>
                    <div className="h-3 bg-[#333] rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rest & Recovery */}
        <div className="ft-card ft-card-padded">
          <h3 className="ft-title font-semibold mb-4">Rest & Recovery</h3>
          <div className="flex flex-wrap gap-1 mb-4">
            {calendarDays.map((d) => (
              <div
                key={d.date}
                title={d.date}
                className={`w-6 h-6 rounded text-[8px] flex items-center justify-center ${
                  d.hasWorkout ? 'bg-[#1D9E75]' : 'bg-[#333]'
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {muscleGaps.filter((g) => g.avgDays > 0).map((g) => (
              <div key={g.muscle} className="text-sm p-2 rounded bg-muted/30">
                <span className="text-muted-foreground">{g.muscle}:</span> {g.avgDays}d avg between sessions
              </div>
            ))}
          </div>
          {overtraining.map((alert) => (
            <div key={alert} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(163,45,45,0.15)] border border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm">{alert}</p>
            </div>
          ))}
        </div>

        {/* Consistency Score */}
        <div className="ft-card ft-card-padded flex flex-col items-center">
          <h3 className="ft-title font-semibold mb-6">Consistency Score</h3>
          <ConsistencyGauge score={consistency.score} />
          <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-md">
            {consistency.breakdown.map((b) => (
              <div key={b.label} className="text-center">
                <p className="text-xs text-muted-foreground">{b.label}</p>
                <p className="font-bold">{b.value}/{b.max}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function OverviewCard({ label, value, trend, invert }: { label: string; value: string; trend: number; invert?: boolean }) {
  const positive = invert ? trend < 0 : trend > 0;
  const neutral = trend === 0;
  return (
    <div className="ft-card ft-card-padded">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="ft-title text-xl font-bold mt-1">{value}</p>
      <div className={`flex items-center gap-1 text-xs mt-1 ${positive ? 'text-primary' : neutral ? 'text-muted-foreground' : 'text-red-500'}`}>
        {positive ? <TrendingUp className="h-3 w-3" /> : neutral ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {trend > 0 ? '+' : ''}{typeof trend === 'number' && !Number.isInteger(trend) ? trend.toFixed(1) : trend} vs prev
      </div>
    </div>
  );
}
