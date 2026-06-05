'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { getMuscleVolumeTrend, getExerciseHistory } from '@/workout/analytics';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import { formatWeight } from '@/workout/utils';

type Range = '30d' | '3m' | '6m' | 'all';
type VolumeMetric = 'volume' | 'avgWeight' | 'maxWeight' | 'reps';
type SortPR = 'recent' | 'heaviest' | 'name';

export default function ProgressPage() {
  const { workouts, prs, bodyStats, profile, customExercises, hydrated, addBodyStat } = useWorkoutStore();
  const [range, setRange] = useState<Range>('30d');
  const [muscleFilter, setMuscleFilter] = useState('');
  const [volumeMetric, setVolumeMetric] = useState<VolumeMetric>('volume');
  const [sortPR, setSortPR] = useState<SortPR>('recent');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [bodyNotes, setBodyNotes] = useState('');

  const prCards = useMemo(() => {
    const entries = Object.entries(prs).map(([id, pr]) => {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === id) ?? customExercises.find((e) => e.id === id);
      return { id, name: ex?.name ?? id, ...pr };
    });
    if (sortPR === 'heaviest') entries.sort((a, b) => b.weight - a.weight);
    else if (sortPR === 'name') entries.sort((a, b) => a.name.localeCompare(b.name));
    else entries.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    return entries;
  }, [prs, customExercises, sortPR]);

  const volumeTrend = useMemo(
    () => getMuscleVolumeTrend(workouts, range, muscleFilter || undefined),
    [workouts, range, muscleFilter]
  );

  const exerciseIds = useMemo(() => {
    const ids = new Set<string>();
    workouts.forEach((w) => w.exercises.forEach((e) => ids.add(e.exerciseId)));
    return Array.from(ids);
  }, [workouts]);

  const exerciseHistory = useMemo(
    () => (selectedExercise ? getExerciseHistory(workouts, selectedExercise) : []),
    [workouts, selectedExercise]
  );

  const exerciseChart = exerciseHistory.map((h) => ({
    date: dayjs(h.date).format('MMM D'),
    weight: h.weight,
  }));

  const bodyChart = [...bodyStats]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: dayjs(s.date).format('MMM D'), weight: s.weight }));

  if (!hydrated) return <div className="text-[var(--wk-muted)]">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="wk-heading text-2xl font-bold">Progress</h1>

        <div className="flex flex-wrap gap-3">
          <select className="wk-input w-auto text-sm" value={range} onChange={(e) => setRange(e.target.value as Range)}>
            <option value="30d">Last 30 days</option>
            <option value="3m">3 months</option>
            <option value="6m">6 months</option>
            <option value="all">All time</option>
          </select>
          <select className="wk-input w-auto text-sm" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
            <option value="">All muscles</option>
            {['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* PR Board */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="wk-heading text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Personal Records
            </h2>
            <select className="wk-input w-auto text-xs" value={sortPR} onChange={(e) => setSortPR(e.target.value as SortPR)}>
              <option value="recent">Recent PR</option>
              <option value="heaviest">Heaviest</option>
              <option value="name">Exercise Name</option>
            </select>
          </div>
          {prCards.length === 0 ? (
            <p className="text-[var(--wk-muted)] text-sm">No PRs yet. Complete workouts to set records!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prCards.map((pr) => (
                <div key={pr.id} className="wk-card p-4 border-l-4 border-l-yellow-500">
                  <div className="flex items-center gap-2">
                    <span>🏆</span>
                    <h3 className="font-semibold">{pr.name}</h3>
                  </div>
                  <p className="text-xl font-bold mt-1">{formatWeight(pr.weight, profile.prefs.unit)} × {pr.reps}</p>
                  <p className="text-xs text-[var(--wk-muted)] mt-1">
                    {dayjs(pr.date).format('MMM D, YYYY')} · {pr.variation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Volume Trends */}
        <section className="wk-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="wk-heading text-lg font-semibold">Volume Trends</h2>
            <div className="flex flex-wrap gap-1">
              {(['volume', 'avgWeight', 'maxWeight', 'reps'] as VolumeMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setVolumeMetric(m)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    volumeMetric === m ? 'bg-[var(--wk-accent)] border-[var(--wk-accent)] text-white' : 'border-[var(--wk-border)] text-[var(--wk-muted)]'
                  }`}
                >
                  {m === 'volume' ? 'Total Volume' : m === 'avgWeight' ? 'Avg Weight' : m === 'maxWeight' ? 'Max Weight' : 'Total Reps'}
                </button>
              ))}
            </div>
          </div>
          {volumeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={volumeTrend}>
                <XAxis dataKey="week" tick={{ fill: '#888', fontSize: 11 }} />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                <Line type="monotone" dataKey={volumeMetric} stroke="#378ADD" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[var(--wk-muted)] text-sm text-center py-12">No data for selected range</p>
          )}
        </section>

        {/* Per-Exercise Progress */}
        <section className="wk-card p-4">
          <h2 className="wk-heading text-lg font-semibold mb-4">Per-Exercise Progress</h2>
          <select
            className="wk-input mb-4"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
          >
            <option value="">Select exercise...</option>
            {exerciseIds.map((id) => {
              const ex = EXERCISE_LIBRARY.find((e) => e.id === id) ?? customExercises.find((e) => e.id === id);
              return <option key={id} value={id}>{ex?.name ?? id}</option>;
            })}
          </select>
          {exerciseChart.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={exerciseChart}>
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                <Line type="monotone" dataKey="weight" stroke="#1D9E75" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {exerciseHistory.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--wk-muted)] text-xs border-b border-[var(--wk-border)]">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Variation</th>
                    <th className="text-left py-2">Sets</th>
                    <th className="text-left py-2">Best Set</th>
                  </tr>
                </thead>
                <tbody>
                  {exerciseHistory.map((h) => (
                    <tr key={h.date} className="border-b border-[var(--wk-border)]">
                      <td className="py-2">{dayjs(h.date).format('MMM D, YYYY')}</td>
                      <td className="py-2">{h.variation}</td>
                      <td className="py-2">{h.sets}</td>
                      <td className="py-2">{h.bestSet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Body Stats */}
        <section className="wk-card p-4">
          <h2 className="wk-heading text-lg font-semibold mb-4">Body Stats</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="number"
              className="wk-input w-32"
              placeholder={`Weight (${profile.prefs.unit})`}
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
            />
            <input
              className="wk-input flex-1 min-w-[200px]"
              placeholder="Notes (optional)"
              value={bodyNotes}
              onChange={(e) => setBodyNotes(e.target.value)}
            />
            <button
              type="button"
              className="wk-btn-primary"
              onClick={() => {
                const w = parseFloat(bodyWeight);
                if (!w) return;
                const kg = profile.prefs.unit === 'kg' ? w : w / 2.20462;
                addBodyStat({ date: dayjs().format('YYYY-MM-DD'), weight: Math.round(kg * 10) / 10, notes: bodyNotes });
                setBodyWeight('');
                setBodyNotes('');
              }}
            >
              Log Today
            </button>
          </div>
          {bodyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bodyChart}>
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                <Line type="monotone" dataKey="weight" stroke="#BA7517" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[var(--wk-muted)] text-sm">Log your weight to see trends</p>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
