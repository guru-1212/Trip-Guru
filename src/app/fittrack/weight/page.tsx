'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Scale, Plus, Trash2, X, TrendingDown, TrendingUp, Minus, Target } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { displayWeight, formatWeight, inputToKg } from '@/workout/utils';
import { cn } from '@/lib/utils';

type Range = '1M' | '3M' | '6M' | '1Y' | 'All';
const RANGES: Range[] = ['1M', '3M', '6M', '1Y', 'All'];
const RANGE_MONTHS: Record<Range, number | null> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, All: null };

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function WeightPage() {
  const { bodyStats, profile, weeklyGoals, hydrated, addBodyStat, deleteBodyStat, updateWeeklyGoals } =
    useWorkoutStore();
  const unit = profile.prefs.unit;

  const [range, setRange] = useState<Range>('1Y');
  const [adding, setAdding] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(dayjs().format('YYYY-MM-DD'));
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  // Newest-first (store already sorts, but be defensive).
  const sorted = useMemo(
    () => [...bodyStats].sort((a, b) => b.date.localeCompare(a.date)),
    [bodyStats]
  );
  const latest = sorted[0];
  const target = weeklyGoals.targetWeight;

  const rangeStats = useMemo(() => {
    const months = RANGE_MONTHS[range];
    if (months === null) return sorted;
    const cutoff = dayjs().subtract(months, 'month');
    return sorted.filter((s) => !dayjs(s.date).isBefore(cutoff, 'day'));
  }, [sorted, range]);

  const chartData = useMemo(
    () =>
      [...rangeStats]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({
          date: dayjs(s.date).format('MMM D'),
          weight: round1(displayWeight(s.weight, unit)),
        })),
    [rangeStats, unit]
  );

  // Change across the visible range (oldest → newest in range).
  const rangeChange = useMemo(() => {
    if (rangeStats.length < 2) return null;
    const newest = rangeStats[0];
    const oldest = rangeStats[rangeStats.length - 1];
    return round1(displayWeight(newest.weight, unit) - displayWeight(oldest.weight, unit));
  }, [rangeStats, unit]);

  const vsTarget = useMemo(() => {
    if (!latest || target == null) return null;
    return round1(displayWeight(latest.weight, unit) - displayWeight(target, unit));
  }, [latest, target, unit]);

  const handleSave = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) return;
    addBodyStat({ date: dateInput, weight: inputToKg(val, unit) });
    setWeightInput('');
    setDateInput(dayjs().format('YYYY-MM-DD'));
    setAdding(false);
  };

  const handleSaveTarget = () => {
    const val = parseFloat(targetInput);
    if (isNaN(val) || val <= 0) return;
    updateWeeklyGoals({ targetWeight: inputToKg(val, unit) });
    setEditingTarget(false);
  };

  const openEdit = (date: string, kg: number) => {
    setDateInput(date);
    setWeightInput(String(round1(displayWeight(kg, unit))));
    setAdding(true);
  };

  if (!hydrated) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="ft-title text-2xl font-bold">Body Weight</h1>
            {latest ? (
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums">{formatWeight(latest.weight, unit)}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {dayjs(latest.date).format('MMM D, YYYY')}
                </span>
              </p>
            ) : (
              <p className="ft-subtitle mt-1 text-sm">Log your first measurement to start tracking</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setAdding((a) => !a);
              setDateInput(dayjs().format('YYYY-MM-DD'));
              setWeightInput('');
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95"
            aria-label="Add measurement"
          >
            {adding ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>

        {/* Add / edit form */}
        {adding && (
          <div className="ft-card ft-card-padded space-y-3">
            <p className="text-sm font-bold">Log weight</p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[120px] text-xs font-semibold text-muted-foreground">
                Date
                <input
                  type="date"
                  value={dateInput}
                  max={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="ft-input mt-1 w-full"
                />
              </label>
              <label className="flex-1 min-w-[120px] text-xs font-semibold text-muted-foreground">
                Weight ({unit})
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder={latest ? String(round1(displayWeight(latest.weight, unit))) : `70`}
                  className="ft-input mt-1 w-full"
                />
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={!weightInput || parseFloat(weightInput) <= 0}
                className="ft-btn ft-btn--primary"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Chart card */}
        <section className="ft-card ft-card-padded space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
              <Scale className="h-3.5 w-3.5" />
              Weight
            </span>
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider transition-colors',
                    range === r ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  domain={['auto', 'auto']}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  unit={unit}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} ${unit}`, 'Weight']}
                />
                {target != null && (
                  <ReferenceLine
                    y={round1(displayWeight(target, unit))}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{ value: 'Goal', fontSize: 10, fill: 'hsl(var(--primary))', position: 'insideTopRight' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No measurements in this range yet.
            </div>
          )}
        </section>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Current" value={latest ? formatWeight(latest.weight, unit) : '—'} />
          <StatTile
            label={`Change · ${range}`}
            value={rangeChange == null ? '—' : `${rangeChange > 0 ? '+' : ''}${rangeChange} ${unit}`}
            trend={rangeChange == null ? undefined : rangeChange}
          />
          <button
            type="button"
            onClick={() => {
              setEditingTarget(true);
              setTargetInput(target != null ? String(round1(displayWeight(target, unit))) : '');
            }}
            className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:border-border"
          >
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Target className="h-3 w-3" />
              To Goal
            </p>
            <p className="mt-1 text-sm font-black tabular-nums">
              {vsTarget == null ? (target == null ? 'Set goal' : '—') : `${vsTarget > 0 ? '+' : ''}${vsTarget} ${unit}`}
            </p>
          </button>
        </div>

        {editingTarget && (
          <div className="ft-card ft-card-padded flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[140px] text-xs font-semibold text-muted-foreground">
              Goal weight ({unit})
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
                className="ft-input mt-1 w-full"
              />
            </label>
            <button type="button" onClick={handleSaveTarget} className="ft-btn ft-btn--primary">
              Save goal
            </button>
            <button type="button" onClick={() => setEditingTarget(false)} className="ft-btn ft-btn--ghost">
              Cancel
            </button>
          </div>
        )}

        {/* History */}
        <section className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Weight History</h2>
          {sorted.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No measurements logged yet.</p>
          ) : (
            <ul className="ft-card divide-y divide-border/60 overflow-hidden">
              {sorted.map((s, i) => {
                const prev = sorted[i + 1];
                const delta = prev ? round1(displayWeight(s.weight, unit) - displayWeight(prev.weight, unit)) : null;
                return (
                  <li key={s.date} className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(s.date, s.weight)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                      <span className="text-sm font-medium">{dayjs(s.date).format('MMM D, YYYY')}</span>
                      <span className="flex items-center gap-2">
                        {delta != null && delta !== 0 && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black',
                              delta > 0
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(delta)}
                          </span>
                        )}
                        <span className="text-sm font-bold tabular-nums">{formatWeight(s.weight, unit)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBodyStat(s.date)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                      aria-label={`Delete ${dayjs(s.date).format('MMM D')}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageTransition>
  );
}

function StatTile({ label, value, trend }: { label: string; value: string; trend?: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-sm font-black tabular-nums">
        {trend !== undefined && trend !== 0 && (
          trend > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
          )
        )}
        {trend === 0 && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}
