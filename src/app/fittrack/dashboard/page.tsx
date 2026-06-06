'use client';

import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
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
} from 'recharts';
import { 
  Calendar, 
  Flame, 
  TrendingUp, 
  Dumbbell, 
  ChevronRight, 
  CheckCircle2, 
  Target,
  Zap,
  ArrowUpRight,
  Timer,
  LayoutDashboard,
  Share2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { WorkoutShareCard } from '@/components/workout/WorkoutShareCard';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  buildShareCardDataFromSession,
  exportWorkoutShareCard,
  waitForShareCardPaint,
  type WorkoutShareCardData,
} from '@/workout/shareCard';
import type { WorkoutSession } from '@/workout/types';
import { MUSCLE_COLORS, SPLIT_NAMES } from '@/workout/constants';
import {
  calcStreak,
  displayWeight,
  formatDuration,
  formatWeight,
  getMuscleFromSplit,
  getTodaysSplit,
  getTodayDayKey,
  getGreeting,
} from '@/workout/utils';
import { PageTransition } from '@/components/workout/PageTransition';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { profile, workouts, weeklyGoals, hydrated, prs, updateWorkoutDate } = useWorkoutStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<Record<string, string>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareCardData, setShareCardData] = useState<WorkoutShareCardData | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const todayStr = dayjs().format('YYYY-MM-DD');
  const todaySplit = getTodaysSplit(profile);
  const splitName = SPLIT_NAMES[todaySplit];

  const metrics = useMemo(() => {
    const monthStart = dayjs().startOf('month');
    const weekStart = dayjs().startOf('isoWeek');
    const monthWorkouts = workouts.filter((w) => dayjs(w.date).isAfter(monthStart.subtract(1, 'day')));
    const weekWorkouts = workouts.filter((w) => dayjs(w.date).isAfter(weekStart.subtract(1, 'day')));
    const monthVolume = monthWorkouts.reduce((s, w) => s + w.totalVolume, 0);
    const weekDaysCount = new Set(weekWorkouts.map((w) => w.date)).size;
    
    return {
      monthCount: monthWorkouts.length,
      streak: calcStreak(workouts),
      monthVolume,
      weekCount: weekWorkouts.length,
      weekDaysCount,
    };
  }, [workouts]);

  const handleShareWorkout = async (session: WorkoutSession) => {
    setSharingId(session.id);
    const data = buildShareCardDataFromSession(session, profile, workouts, prs);
    flushSync(() => setShareCardData(data));
    try {
      await waitForShareCardPaint();
      if (!shareCardRef.current) {
        throw new Error('Share card not ready');
      }
      const result = await exportWorkoutShareCard(shareCardRef.current, data);
      toast.success(result === 'shared' ? 'Story shared' : 'Story image downloaded');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        toast.error('Could not create share image');
      }
    } finally {
      setSharingId(null);
      setShareCardData(null);
    }
  };

  const { muscleData, weeklyData } = useMemo(() => {
    const last8Weeks = Array.from({ length: 8 })
      .map((_, i) => dayjs().subtract(i, 'week').startOf('isoWeek'))
      .reverse();

    const wData = last8Weeks.map((start) => {
      const end = start.endOf('isoWeek');
      const vol = workouts
        .filter((w) => {
          const d = dayjs(w.date);
          return (d.isSame(start) || d.isAfter(start)) && (d.isSame(end) || d.isBefore(end));
        })
        .reduce((s, w) => s + w.totalVolume, 0);
      return { week: start.format('MMM D'), volume: displayWeight(vol, profile.prefs.unit) };
    });

    const mCounts: Record<string, number> = {};
    workouts
      .filter((w) => dayjs(w.date).isAfter(dayjs().startOf('month').subtract(1, 'day')))
      .forEach((w) => {
        const muscles = getMuscleFromSplit(w.splitId);
        muscles.forEach((m) => {
          mCounts[m] = (mCounts[m] || 0) + 1;
        });
      });

    const mData = Object.entries(mCounts).map(([muscle, count]) => ({ muscle, count }));

    return { weeklyData: wData, muscleData: mData };
  }, [workouts, profile.prefs.unit]);

  const calendarDays = useMemo(() => {
    const start = dayjs().startOf('month').startOf('week');
    const end = dayjs().endOf('month').endOf('week');
    const days = [];
    const workoutDates = new Set(workouts.map((w) => w.date));

    for (let d = start; d.isBefore(end) || d.isSame(end); d = d.add(1, 'day')) {
      days.push({
        date: d.format('YYYY-MM-DD'),
        day: d.date(),
        hasWorkout: workoutDates.has(d.format('YYYY-MM-DD')),
        isToday: d.isSame(dayjs(), 'day'),
      });
    }
    return days;
  }, [workouts]);

  const recent = workouts.slice(0, 5);

  if (!hydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-bounce">
          <Dumbbell className="h-6 w-6" />
        </div>
        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest animate-pulse">Initializing Athlete OS...</p>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 md:space-y-12"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <motion.div variants={item} className="space-y-1">
          <h1 className="ft-title-lg">
            {getGreeting()}, {profile.name.split(' ')[0]}
          </h1>
          <p className="ft-subtitle mt-1">
            Today is {getTodayDayKey()}. Ready to train?
          </p>
        </motion.div>
        <motion.div variants={item} className="flex gap-3">
          <Link
            href="/fittrack/workout"
            className="ft-btn ft-btn--primary flex items-center gap-2"
          >
            <Dumbbell className="h-4 w-4" />
            <span>Start Session</span>
          </Link>
        </motion.div>
      </header>

      {/* Daily Status Card */}
      <motion.div variants={item}>
        <div className="ft-card ft-card-padded border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
             <Zap className="h-32 w-32" />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Live Status</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                {todaySplit !== 'rest' ? `Targeting ${splitName} Today` : "Recovery Protocol"}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base font-medium max-w-xl">
                {todaySplit !== 'rest' 
                  ? "Your musculoskeletal system is optimized for high-intensity output." 
                  : "Focus on deep tissue recovery and nutritional replenishment for peak gains."}
              </p>
            </div>
            {todaySplit !== 'rest' && (
              <Link
                href={`/fittrack/workout?split=${todaySplit}`}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/25"
              >
                Launch Protocol
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={Calendar} label="Workouts (M)" value={String(metrics.monthCount)} index={0} />
        <MetricCard icon={Flame} label="Current Streak" value={`${metrics.streak}d`} index={1} />
        <MetricCard
          icon={TrendingUp}
          label="Total Volume"
          value={formatWeight(metrics.monthVolume, profile.prefs.unit)}
          index={2}
        />
        <MetricCard 
          icon={Target} 
          label="Weekly Goal" 
          value={`${metrics.weekDaysCount}/${weeklyGoals.workoutsPerWeek}`}
          hint="Tap to edit"
          href="/fittrack/checklist?tab=weekly"
          index={3}
        />
        <MetricCard icon={Timer} label="Total Sessions" value={String(metrics.weekCount)} index={4} />
      </div>

      {/* Charts & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2 ft-card ft-card-padded md:p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black tracking-tight">Performance Volume</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
               <ArrowUpRight className="h-3 w-3" />
               Last 8 Weeks
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" stroke="currentColor" strokeOpacity={0.1} tick={{ fill: 'currentColor', fillOpacity: 0.5, fontSize: 10, fontWeight: 700 }} />
              <YAxis stroke="currentColor" strokeOpacity={0.1} tick={{ fill: 'currentColor', fillOpacity: 0.5, fontSize: 10, fontWeight: 700 }} />
              <Tooltip
                cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
                contentStyle={{ 
                  background: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: 16,
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
                  padding: '12px 16px'
                }}
              />
              <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} className="ft-card ft-card-padded md:p-8">
          <h3 className="text-lg font-black tracking-tight mb-8">Target Profile</h3>
          {muscleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={muscleData}
                  dataKey="count"
                  nameKey="muscle"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                >
                  {muscleData.map((entry) => (
                    <Cell key={entry.muscle} fill={MUSCLE_COLORS[entry.muscle] ?? 'hsl(var(--primary))'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: 16,
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
               <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-muted-foreground" />
               </div>
               <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">No data for {dayjs().format('MMMM')}</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Calendar heatmap */}
        <motion.div variants={item} className="ft-card ft-card-padded md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black tracking-tight">Consistency</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dayjs().format('MMMM')}</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((d) => (
              <div
                key={d.date}
                title={d.date}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all duration-300",
                  d.hasWorkout ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-muted text-muted-foreground/30",
                  d.isToday && !d.hasWorkout && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                {d.day}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="lg:col-span-2 ft-card ft-card-padded md:p-8">
          <h3 className="text-lg font-black tracking-tight mb-8">Activity Feed</h3>
          {recent.length === 0 ? (
            <div className="text-center py-12">
               <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Waiting for first session...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recent.map((w) => (
                <div key={w.id} className="group relative ft-card overflow-hidden transition-all hover:border-primary/30">
                  <button
                    type="button"
                    className="w-full p-5 flex items-center justify-between text-left"
                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Dumbbell className="h-6 w-6" />
                       </div>
                       <div>
                          <p className="font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5">{w.splitName}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {dayjs(w.date).format('MMM D')} · {w.totalSets} Sets · {formatDuration(w.duration)}
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <p className="text-sm font-black tracking-tighter text-primary">{formatWeight(w.totalVolume, profile.prefs.unit)}</p>
                       <div className={cn("p-1.5 rounded-full bg-primary/5 text-muted-foreground transition-transform duration-300", expandedId === w.id && "rotate-90 bg-primary/10 text-primary")}>
                          <ChevronRight className="h-4 w-4" />
                       </div>
                    </div>
                  </button>
                  
                  {expandedId === w.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-5 pb-5 border-t border-white/5 pt-5 space-y-4 bg-primary/[0.02]"
                    >
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2 px-1">Update Session Date</label>
                          <input
                            type="date"
                            className="ft-input text-xs font-bold bg-white/5 h-11"
                            value={editingDate[w.id] ?? w.date}
                            max={dayjs().format('YYYY-MM-DD')}
                            onChange={(e) =>
                              setEditingDate((prev) => ({ ...prev, [w.id]: e.target.value }))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="ft-btn ft-btn--primary h-11 py-0 px-6 flex items-center justify-center rounded-xl"
                          onClick={() => {
                            const newDate = editingDate[w.id] ?? w.date;
                            if (newDate !== w.date) updateWorkoutDate(w.id, newDate);
                          }}
                        >
                          Save
                        </button>
                        {w.date === todayStr && (
                          <button
                            type="button"
                            className="ft-btn ft-btn--secondary h-11 py-0 px-6 flex items-center justify-center gap-2 rounded-xl"
                            disabled={sharingId === w.id}
                            onClick={() => handleShareWorkout(w)}
                          >
                            <Share2 className="h-4 w-4" />
                            {sharingId === w.id ? 'Creating…' : 'Share story'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {w.exercises.map((ex) => {
                          const doneSets = ex.sets.filter((s) => s.done);
                          if (doneSets.length === 0) return null;
                          return (
                            <div key={ex.exerciseId} className="p-4 rounded-xl bg-white/5 border border-white/5 transition-colors hover:border-primary/10 group/item">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-200 group-hover/item:text-primary transition-colors">{ex.name}</p>
                                  <div className="mt-2 space-y-1">
                                    {doneSets.map((st, i) => (
                                      <p
                                        key={i}
                                        className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter tabular-nums"
                                      >
                                        Set {i + 1} · {formatWeight(st.weight, profile.prefs.unit)} × {st.reps}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary/40 group-hover/item:text-primary transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {shareCardData && <WorkoutShareCard ref={shareCardRef} data={shareCardData} />}
    </motion.div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  href,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  hint?: string;
  index?: number;
}) {
  const inner = (
    <>
      <div className="ft-metric-icon">
        <Icon className="h-5 w-5" />
      </div>
      <p className="ft-metric-label">{label}</p>
      <p className="ft-metric-value">{value}</p>
      {hint && <p className="text-[10px] text-primary font-medium mt-1">{hint}</p>}
    </>
  );

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
      }}
      className={cn('ft-metric', href && 'ft-card-interactive cursor-pointer hover:border-primary/40')}
    >
      {href ? <Link href={href} className="block">{inner}</Link> : inner}
    </motion.div>
  );
}
