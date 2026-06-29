'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
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
  ChevronLeft,
  ChevronRight, 
  CheckCircle2, 
  Target,
  Zap,
  ArrowUpRight,
  Timer,
  LayoutDashboard,
  Share2,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { WorkoutShareCard } from '@/components/workout/WorkoutShareCard';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  buildShareCardDataFromSession,
  exportWorkoutShareCard,
  waitForShareCardPaint,
  type WorkoutShareCardData,
} from '@/workout/shareCard';
import type { WorkoutSession, DayKey } from '@/workout/types';
import { MUSCLE_COLORS, SPLIT_NAMES } from '@/workout/constants';
import {
  calcStreak,
  displayWeight,
  inputToKg,
  formatDuration,
  formatWeight,
  getMuscleFromSplit,
  getTodaysSplit,
  getTodayDayKey,
  getGreeting,
  getWorkoutsInRange,
  getTrackingWeekNumber,
  getTrackingWeekRangeLabel,
  getTrackingWeekStart,
  filterWorkoutsInTrackingWeek,
} from '@/workout/utils';
import { PageTransition } from '@/components/workout/PageTransition';
import { FitTrackInvitations } from '@/components/workout/FitTrackInvitations';
import { WaterDashboardWidget } from '@/components/water/WaterDashboardWidget';
import { NutritionDashboardWidget } from '@/components/nutrition/NutritionDashboardWidget';
import { getWeeklyMuscleTrainingCounts } from '@/workout/analytics';
import { MuscleRecoveryMap } from '@/components/fittrack/MuscleRecoveryMap';
import { GymAttendanceCalendar } from '@/components/fittrack/GymAttendanceCalendar';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

export default function DashboardPage() {
  const { profile, workouts, weeklyGoals, hydrated, prs, updateWorkoutDate } = useWorkoutStore();
  const [feedWeekOffset, setFeedWeekOffset] = useState(0);
  const [weeklyFrequencyOffset, setWeeklyFrequencyOffset] = useState(0);
  const [targetProfileMode, setTargetProfileMode] = useState<'month' | 'week'>('month');
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<Record<string, string>>({});
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareCardData, setShareCardData] = useState<WorkoutShareCardData | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const todaySplit = getTodaysSplit(profile);
  const splitName = SPLIT_NAMES[todaySplit];

  const { hasTrainedToday, tomorrowSplit } = useMemo(() => {
    const hasTrainedToday = workouts.some((w) => dayjs(w.date).isSame(dayjs(), 'day'));
    const map: DayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const tomorrowSplit = profile.weekSchedule[map[(dayjs().day() + 1) % 7]];
    return { hasTrainedToday, tomorrowSplit };
  }, [profile.weekSchedule, workouts]);

  const recoveryData = useMemo(() => {
    const data: Record<string, any> = {};
    const muscles = [
      'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 
      'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Forearms'
    ];

    muscles.forEach((m) => {
      const lastSession = workouts
        .filter((w) => getMuscleFromSplit(w.splitId).includes(m))
        .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())[0];

      if (!lastSession) {
        data[m] = { name: m, status: 'recovered' };
        return;
      }

      const diffHours = dayjs().diff(dayjs(lastSession.date), 'hour');
      let status: 'fatigued' | 'recovering' | 'recovered' = 'recovered';
      
      if (diffHours < 24) status = 'fatigued';
      else if (diffHours < 72) status = 'recovering';

      data[m] = { 
        name: m, 
        status, 
        lastTrained: dayjs(lastSession.date).fromNow() 
      };
    });

    return data;
  }, [workouts]);

  const metrics = useMemo(() => {
    const monthStart = dayjs().startOf('month');
    const monthWorkouts = workouts.filter((w) => dayjs(w.date).isAfter(monthStart.subtract(1, 'day')));
    const weekWorkouts = filterWorkoutsInTrackingWeek(workouts);
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

  const { muscleData, weeklyData, weeklyMuscleSplit } = useMemo(() => {
    const last8Weeks = Array.from({ length: 8 })
      .map((_, i) => getTrackingWeekStart().subtract(i, 'week'))
      .reverse();

    const wData = last8Weeks.map((start) => {
      const end = start.add(6, 'day').endOf('day');
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

    // Weekly Muscle Split for carousel (Last 8 weeks)
    const wMuscleSplit = Array.from({ length: 8 }).map((_, i) => {
      const start = getTrackingWeekStart().subtract(i, 'week');
      const end = start.add(6, 'day').endOf('day');
      const counts: Record<string, number> = {};
      
      workouts
        .filter((w) => {
          const d = dayjs(w.date);
          return (d.isSame(start) || d.isAfter(start)) && (d.isSame(end) || d.isBefore(end));
        })
        .forEach((w) => {
          const muscles = getMuscleFromSplit(w.splitId);
          muscles.forEach((m) => {
            counts[m] = (counts[m] || 0) + 1;
          });
        });

      return {
        label: `${start.format('MMM D')} – ${end.format('MMM D')}`,
        data: Object.entries(counts).map(([muscle, count]) => ({ muscle, count })),
      };
    });

    return { weeklyData: wData, muscleData: mData, weeklyMuscleSplit: wMuscleSplit };
  }, [workouts, profile.prefs.unit]);

  const freqWeek = useMemo(() => {
    return getTrackingWeekStart().subtract(weeklyFrequencyOffset, 'week');
  }, [weeklyFrequencyOffset]);

  const weeklyMuscleCounts = useMemo(
    () => getWeeklyMuscleTrainingCounts(workouts, freqWeek),
    [workouts, freqWeek]
  );

  const freqWeekRangeLabel = useMemo(() => getTrackingWeekRangeLabel(freqWeek), [freqWeek]);
  const freqWeekNumber = useMemo(() => getTrackingWeekNumber(freqWeek), [freqWeek]);

  const weekRangeLabel = useMemo(() => getTrackingWeekRangeLabel(), []);

  const feedWeek = useMemo(() => {
    const start = getTrackingWeekStart().subtract(feedWeekOffset, 'week');
    const end = start.add(6, 'day').endOf('day');
    const sameYear = start.year() === end.year();
    const label = sameYear
      ? `${start.format('MMM D')} – ${end.format('MMM D, YYYY')}`
      : `${start.format('MMM D, YYYY')} – ${end.format('MMM D, YYYY')}`;
    return { start, end, label };
  }, [feedWeekOffset]);

  const maxFeedWeekOffset = useMemo(() => {
    if (workouts.length === 0) return 0;
    const oldest = workouts.reduce(
      (min, w) => (w.date < min ? w.date : min),
      workouts[0].date
    );
    return getTrackingWeekStart().diff(getTrackingWeekStart(oldest), 'week');
  }, [workouts]);

  const feedWorkouts = useMemo(() => {
    return getWorkoutsInRange(
      workouts,
      feedWeek.start.format('YYYY-MM-DD'),
      feedWeek.end.format('YYYY-MM-DD')
    ).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  }, [workouts, feedWeek]);

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
      <FitTrackInvitations />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <motion.div variants={item} className="space-y-1">
          <h1 className="ft-title-lg">
            {getGreeting()}, {profile.name.split(' ')[0]}
          </h1>
          <p className="ft-subtitle mt-1">
            {hasTrainedToday 
              ? `Workout done for today! Let's plan for tomorrow: ${SPLIT_NAMES[tomorrowSplit]}`
              : `Today is ${getTodayDayKey()}. Ready to train?`}
          </p>
        </motion.div>
        <motion.div variants={item} className="flex gap-3">
          <Link
            href="/fittrack/workout"
            className="ft-btn ft-btn--primary flex items-center gap-2"
          >
            <Dumbbell className="h-4 w-4" />
            <span>{hasTrainedToday ? 'View Workout' : 'Start Session'}</span>
          </Link>
        </motion.div>
      </header>

      <motion.div variants={item}>
        <WaterDashboardWidget />
      </motion.div>

      <motion.div variants={item}>
        <NutritionDashboardWidget />
      </motion.div>

      {/* Daily Status Card */}
      <motion.div variants={item}>
        <div className="ft-card ft-card-padded md:p-8 relative overflow-hidden group">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              background:
                'radial-gradient(ellipse 70% 80% at 0% 100%, hsl(var(--primary)) 0%, transparent 65%)',
            }}
          />
          <div className="absolute top-0 right-0 p-6 md:p-8 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
            <Zap className="h-28 w-28 md:h-32 md:w-32 text-primary" />
          </div>
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-primary"
            aria-hidden
          />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 pl-3 md:pl-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Live Status
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {todaySplit !== 'rest' ? `Targeting ${splitName} Today` : 'Recovery Protocol'}
              </h2>
              <p className="text-muted-foreground text-sm md:text-base font-medium max-w-xl leading-relaxed">
                {todaySplit !== 'rest'
                  ? 'Your musculoskeletal system is optimized for high-intensity output.'
                  : 'Focus on deep tissue recovery and nutritional replenishment for peak gains.'}
              </p>
            </div>
            {todaySplit !== 'rest' && (
              <Link
                href={`/fittrack/workout?split=${todaySplit}`}
                className="shrink-0 bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.03] active:scale-[0.98] shadow-xl shadow-primary/25 hover:shadow-primary/35"
              >
                Launch Protocol
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Metrics + Weekly Goal */}
      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-12 gap-3 md:gap-4">
        <WeeklyGoalCard
          current={metrics.weekDaysCount}
          target={weeklyGoals.workoutsPerWeek}
          weekNumber={getTrackingWeekNumber()}
          weekLabel={weekRangeLabel}
          className="xl:col-span-4"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 xl:col-span-8 gap-3 md:gap-4">
          <MetricCard
            icon={Calendar}
            label="Workouts (M)"
            value={String(metrics.monthCount)}
            accent="#378ADD"
            index={0}
          />
          <MetricCard
            icon={Flame}
            label="Current Streak"
            value={`${metrics.streak}d`}
            accent="#F97316"
            index={1}
          />
          <MetricCard
            icon={TrendingUp}
            label="Total Volume"
            value={formatWeight(metrics.monthVolume, profile.prefs.unit)}
            accent="#1D9E75"
            index={2}
          />
          <MetricCard
            icon={Timer}
            label="Total Sessions"
            value={String(metrics.weekCount)}
            accent="#A855F7"
            index={3}
          />
        </div>
      </motion.div>

      {/* Weight Tracking */}
      <WeightTrackingCard
        bodyStats={useWorkoutStore().bodyStats}
        targetWeight={weeklyGoals.targetWeight ?? 75}
        unit={profile.prefs.unit}
        onAddStat={useWorkoutStore().addBodyStat}
        onUpdateTarget={(weight) => useWorkoutStore().updateWeeklyGoals({ targetWeight: weight })}
        variants={item}
      />

      {/* Weekly body-part frequency */}
      <WeeklyMuscleFrequency
        counts={weeklyMuscleCounts}
        weekLabel={freqWeekRangeLabel}
        weekNumber={freqWeekNumber}
        offset={weeklyFrequencyOffset}
        onOffsetChange={setWeeklyFrequencyOffset}
        maxOffset={maxFeedWeekOffset}
        variants={item}
      />

      {/* Muscle Recovery Map */}
      <motion.div variants={item}>
        <DashboardPanel
          variants={item}
          icon={Activity}
          title="Muscle Recovery"
          description="Tap a muscle group to see fatigue and readiness"
        >
          <MuscleRecoveryMap data={recoveryData} />
        </DashboardPanel>
      </motion.div>

      {/* Charts & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardPanel
          variants={item}
          icon={TrendingUp}
          title="Performance Volume"
          description="Weekly training load over time"
          className="lg:col-span-2"
          badge={
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1.5 rounded-full border border-border bg-muted/40 flex items-center gap-1.5">
              <ArrowUpRight className="h-3 w-3" />
              Last 8 Weeks
            </span>
          }
        >
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
                  padding: '12px 16px',
                }}
              />
              <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardPanel>

        <DashboardPanel
          variants={item}
          icon={Target}
          title="Target Profile"
          description={
            targetProfileMode === 'month' 
              ? `Muscle split · ${dayjs().format('MMMM')}`
              : `Muscle split · ${weeklyMuscleSplit[activeWeekIndex].label}`
          }
          headerExtra={
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/50">
              <button
                onClick={() => setTargetProfileMode('month')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  targetProfileMode === 'month' 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Month
              </button>
              <button
                onClick={() => setTargetProfileMode('week')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  targetProfileMode === 'week' 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Week
              </button>
            </div>
          }
        >
          {targetProfileMode === 'month' ? (
            muscleData.length > 0 ? (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={muscleData}
                      dataKey="count"
                      nameKey="muscle"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                    >
                      {muscleData.map((entry) => (
                        <Cell key={entry.muscle} fill={MUSCLE_COLORS[entry.muscle] ?? 'hsl(var(--primary))'} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2">
                  {[...muscleData]
                    .sort((a, b) => b.count - a.count)
                    .map((entry) => (
                      <div
                        key={entry.muscle}
                        className="flex items-center gap-2 min-w-0 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: MUSCLE_COLORS[entry.muscle] ?? 'hsl(var(--primary))' }}
                        />
                        <span className="text-[11px] font-black tracking-tight truncate">{entry.muscle}</span>
                        <span className="text-xs font-black text-primary tabular-nums ml-auto">{entry.count}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  No data for {dayjs().format('MMMM')}
                </p>
              </div>
            )
          ) : (
            <div className="space-y-6">
              <div className="relative group/carousel">
                <motion.div
                  key={activeWeekIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {weeklyMuscleSplit[activeWeekIndex].data.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={weeklyMuscleSplit[activeWeekIndex].data}
                            dataKey="count"
                            nameKey="muscle"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                          >
                            {weeklyMuscleSplit[activeWeekIndex].data.map((entry) => (
                              <Cell key={entry.muscle} fill={MUSCLE_COLORS[entry.muscle] ?? 'hsl(var(--primary))'} stroke="none" />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2">
                        {[...weeklyMuscleSplit[activeWeekIndex].data]
                          .sort((a, b) => b.count - a.count)
                          .map((entry) => (
                            <div
                              key={entry.muscle}
                              className="flex items-center gap-2 min-w-0 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/40"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: MUSCLE_COLORS[entry.muscle] ?? 'hsl(var(--primary))' }}
                              />
                              <span className="text-[11px] font-black tracking-tight truncate">{entry.muscle}</span>
                              <span className="text-xs font-black text-primary tabular-nums ml-auto">{entry.count}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                        No data for this week
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Carousel Controls */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-3 -right-3 flex justify-between pointer-events-none opacity-0 group-hover/carousel:opacity-100 transition-opacity">
                  <button
                    onClick={() => setActiveWeekIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeWeekIndex === 0}
                    className={cn(
                      'p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg pointer-events-auto transition-all',
                      activeWeekIndex === 0 ? 'opacity-0 scale-90' : 'hover:scale-110 active:scale-95'
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActiveWeekIndex((prev) => Math.min(weeklyMuscleSplit.length - 1, prev + 1))}
                    disabled={activeWeekIndex === weeklyMuscleSplit.length - 1}
                    className={cn(
                      'p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-lg pointer-events-auto transition-all',
                      activeWeekIndex === weeklyMuscleSplit.length - 1 ? 'opacity-0 scale-90' : 'hover:scale-110 active:scale-95'
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center gap-1.5 pt-2">
                {weeklyMuscleSplit.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveWeekIndex(i)}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all duration-300',
                      activeWeekIndex === i ? 'w-4 bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardPanel
          variants={item}
          icon={Calendar}
          title="Consistency"
          description="Monthly and yearly attendance"
        >
          <GymAttendanceCalendar workouts={workouts} profile={profile} />
        </DashboardPanel>

        <DashboardPanel
          variants={item}
          className="lg:col-span-2"
          icon={Dumbbell}
          title="Activity Feed"
          description={`${feedWorkouts.length} session${feedWorkouts.length === 1 ? '' : 's'} this period`}
          headerExtra={
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous week"
                disabled={feedWeekOffset >= maxFeedWeekOffset}
                onClick={() => {
                  setFeedWeekOffset((o) => o + 1);
                  setExpandedId(null);
                }}
                className={cn(
                  'p-2.5 rounded-xl border border-border bg-muted/30 transition-all',
                  feedWeekOffset >= maxFeedWeekOffset
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[180px] text-center px-3 py-1.5 rounded-xl border border-border bg-muted/20">
                <p className="text-xs font-black tracking-tight">{feedWeek.label}</p>
                {feedWeekOffset === 0 ? (
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-0.5">This week</p>
                ) : (
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                    Week {getTrackingWeekNumber(feedWeek.start)}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Next week"
                disabled={feedWeekOffset === 0}
                onClick={() => {
                  setFeedWeekOffset((o) => Math.max(0, o - 1));
                  setExpandedId(null);
                }}
                className={cn(
                  'p-2.5 rounded-xl border border-border bg-muted/30 transition-all',
                  feedWeekOffset === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm'
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        >
          {feedWorkouts.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border/60 bg-muted/20">
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                {workouts.length === 0 ? 'Waiting for first session...' : 'No sessions this week'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="group relative rounded-2xl border border-border/60 bg-gradient-to-br from-white/80 to-white/40 dark:from-white/[0.04] dark:to-white/[0.01] overflow-hidden transition-all duration-300 hover:border-primary/25 hover:shadow-md"
                  style={{ boxShadow: 'inset 3px 0 0 0 hsl(var(--primary))' }}
                >
                  <button
                    type="button"
                    className="w-full p-5 flex items-center justify-between text-left"
                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-sm">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-foreground tracking-tight leading-none mb-1.5">{w.splitName}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {dayjs(w.date).format('MMM D')} · {w.totalSets} Sets · {formatDuration(w.duration)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-black tracking-tighter text-primary tabular-nums">
                        {formatWeight(w.totalVolume, profile.prefs.unit)}
                      </p>
                      <div
                        className={cn(
                          'p-1.5 rounded-full bg-muted/50 text-muted-foreground transition-all duration-300',
                          expandedId === w.id && 'rotate-90 bg-primary/10 text-primary'
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {expandedId === w.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-5 pb-5 border-t border-border/40 pt-5 space-y-4 bg-primary/[0.02]"
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
                        <button
                          type="button"
                          className="ft-btn ft-btn--secondary h-11 py-0 px-6 flex items-center justify-center gap-2 rounded-xl"
                          disabled={sharingId === w.id}
                          onClick={() => handleShareWorkout(w)}
                        >
                          <Share2 className="h-4 w-4" />
                          {sharingId === w.id ? 'Creating…' : 'Download story'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {w.exercises.map((ex) => {
                          const doneSets = ex.sets.filter((s) => s.done);
                          if (doneSets.length === 0) return null;
                          return (
                            <div key={ex.exerciseId} className="p-4 rounded-xl border border-border/50 bg-muted/20 transition-all hover:border-primary/20 hover:bg-muted/40 group/item">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black tracking-tight text-foreground group-hover/item:text-primary transition-colors">{ex.name}</p>
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
        </DashboardPanel>
      </div>

      {shareCardData && <WorkoutShareCard ref={shareCardRef} data={shareCardData} />}
    </motion.div>
  );
}

function WeeklyMuscleFrequency({
  counts,
  weekLabel,
  weekNumber,
  offset,
  onOffsetChange,
  maxOffset,
  variants,
}: {
  counts: { muscle: string; count: number }[];
  weekLabel: string;
  weekNumber: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
  maxOffset: number;
  variants: { hidden: { opacity: number; y: number }; show: { opacity: number; y: number } };
}) {
  const maxCount = Math.max(...counts.map((c) => c.count), 1);
  const trainedGroups = counts.filter((c) => c.count > 0).length;
  const totalSessions = counts.reduce((sum, c) => sum + c.count, 0);

  return (
    <motion.div variants={variants} className="ft-card ft-card-padded md:p-8 overflow-hidden relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 100% 0%, hsl(var(--primary)) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Weekly Body Part Hits</h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  How many sessions each muscle group was trained
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border/50">
              <button
                type="button"
                aria-label="Previous week"
                disabled={offset >= maxOffset}
                onClick={() => onOffsetChange(offset + 1)}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  offset >= maxOffset
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-background text-foreground hover:shadow-sm'
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-2 min-w-[100px] text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {offset === 0 ? 'This Week' : `Week ${weekNumber}`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Next week"
                disabled={offset === 0}
                onClick={() => onOffsetChange(Math.max(0, offset - 1))}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  offset === 0
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-background text-foreground hover:shadow-sm'
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2 rounded-xl border border-border bg-muted/40">
              {weekLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
          {counts.map((entry, index) => {
            const color = MUSCLE_COLORS[entry.muscle] ?? 'hsl(var(--primary))';
            const barPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
            const isHit = entry.count > 0;

            return (
              <motion.div
                key={entry.muscle}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className={cn(
                  'group relative rounded-2xl border p-4 md:p-5 transition-all duration-300',
                  isHit
                    ? 'border-transparent bg-gradient-to-br from-white/80 to-white/40 dark:from-white/[0.06] dark:to-white/[0.02] shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    : 'border-dashed border-border/60 bg-muted/20'
                )}
                style={
                  isHit
                    ? {
                        boxShadow: `inset 3px 0 0 0 ${color}`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125',
                      !isHit && 'opacity-40'
                    )}
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-black uppercase tracking-wider truncate',
                      isHit ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {entry.muscle}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-2 mb-3">
                  <p
                    className={cn(
                      'text-3xl md:text-4xl font-black tabular-nums tracking-tighter leading-none',
                      isHit ? 'text-foreground' : 'text-muted-foreground/40'
                    )}
                  >
                    {entry.count}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pb-1">
                    {entry.count === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ delay: 0.2 + index * 0.05, duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <p className="text-xs font-bold text-muted-foreground">
            <span className="text-foreground font-black">{trainedGroups}</span> of{' '}
            {counts.length} muscle groups trained {offset === 0 ? 'this week' : 'that week'}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {totalSessions} total muscle sessions
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardPanel({
  title,
  description,
  icon: Icon,
  badge,
  headerExtra,
  children,
  className,
  variants,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variants: { hidden: { opacity: number; y: number }; show: { opacity: number; y: number } };
}) {
  return (
    <motion.div
      variants={variants}
      className={cn('ft-card ft-card-padded md:p-8 overflow-hidden relative', className)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 100% 0%, hsl(var(--primary)) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10">
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-black tracking-tight">{title}</h3>
              {description && (
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {(badge || headerExtra) && (
            <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
              {badge}
              {headerExtra}
            </div>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function WeeklyGoalCard({
  current,
  target,
  weekNumber,
  weekLabel,
  className,
}: {
  current: number;
  target: number;
  weekNumber: number;
  weekLabel: string;
  className?: string;
}) {
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(100, Math.round((current / safeTarget) * 100));
  const isComplete = current >= target;
  const remaining = Math.max(0, target - current);
  const accent = '#BA7517';
  const ringRadius = 44;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={cn('h-full', className)}
    >
      <Link
        href="/fittrack/checklist?tab=weekly"
        className={cn(
          'group relative flex h-full min-h-[168px] flex-col sm:flex-row sm:items-center gap-5 sm:gap-6',
          'rounded-2xl border border-border/60 border-l-4 border-l-[#BA7517] p-4 sm:p-5 md:p-6 overflow-hidden',
          'bg-gradient-to-br from-[#BA7517]/10 via-white/80 to-white/40',
          'dark:from-[#BA7517]/10 dark:via-white/[0.06] dark:to-white/[0.02]',
          'shadow-sm transition-all duration-300',
          'hover:shadow-lg hover:-translate-y-0.5 hover:border-[#BA7517]/40',
          isComplete && 'ring-1 ring-[#BA7517]/30'
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            background: `radial-gradient(ellipse 70% 80% at 100% 0%, ${accent} 0%, transparent 70%)`,
          }}
        />

        {/* Animated progress ring */}
        <div className="relative z-10 shrink-0 self-center sm:self-auto">
          <div className="relative w-[108px] h-[108px] sm:w-[120px] sm:h-[120px]">
            {isComplete && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)` }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 120 120"
              aria-hidden
            >
              <circle
                cx="60"
                cy="60"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              <motion.circle
                cx="60"
                cy="60"
                r={ringRadius}
                fill="none"
                stroke={accent}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                initial={{ strokeDashoffset: ringCircumference }}
                animate={{ strokeDashoffset: ringCircumference - (pct / 100) * ringCircumference }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-2xl sm:text-3xl font-black tabular-nums tracking-tighter leading-none"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.4, type: 'spring', stiffness: 200 }}
              >
                {pct}%
              </motion.span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                complete
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${accent}18`, color: accent }}
              >
                <Target className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black tracking-tight truncate">Weekly Goal</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                  Workout days this week
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="ft-badge ft-badge--primary text-[10px]">W{weekNumber}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-[#BA7517] transition-colors" />
            </div>
          </div>

          <div className="flex items-end gap-2 flex-wrap">
            <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter leading-none">
              {current}
            </span>
            <span className="text-lg sm:text-xl font-black text-muted-foreground/50 pb-0.5">/</span>
            <span className="text-xl sm:text-2xl font-black tabular-nums text-muted-foreground pb-0.5">
              {target}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pb-1 ml-1">
              days
            </span>
          </div>

          <div className="space-y-2">
            <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: accent }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-[10px] font-bold text-muted-foreground truncate">
                {isComplete ? (
                  <span className="text-[#BA7517] font-black">Goal reached — great work!</span>
                ) : (
                  <>
                    <span className="text-foreground font-black">{remaining}</span> day
                    {remaining === 1 ? '' : 's'} left · {weekLabel}
                  </>
                )}
              </p>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#BA7517] opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                Edit goal
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent = 'hsl(var(--primary))',
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -3 }}
      className={cn(
        'group relative h-full min-h-[132px] rounded-2xl border border-border/60 p-4 md:p-5 overflow-hidden',
        'bg-gradient-to-br from-white/80 to-white/40 dark:from-white/[0.06] dark:to-white/[0.02]',
        'shadow-sm transition-shadow duration-300 hover:shadow-md'
      )}
      style={{ boxShadow: `inset 3px 0 0 0 ${accent}` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at 0% 100%, ${accent}12 0%, transparent 65%)`,
        }}
      />
      <div className="relative h-full flex flex-col">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-transform group-hover:scale-105"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 sm:mb-1.5 line-clamp-1">
          {label}
        </p>
        <p className="text-xl sm:text-2xl md:text-[1.65rem] font-black tabular-nums tracking-tighter leading-none text-foreground break-all sm:break-normal">
          {value}
        </p>
      </div>
    </motion.div>
  );
}

function WeightTrackingCard({
  bodyStats,
  targetWeight,
  unit,
  onAddStat,
  onUpdateTarget,
  variants,
}: {
  bodyStats: any[];
  targetWeight: number;
  unit: string;
  onAddStat: (stat: any) => void;
  onUpdateTarget: (weight: number) => void;
  variants: any;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [isAddingWeight, setIsAddingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const selectedWeekStart = useMemo(() => getTrackingWeekStart().subtract(weekOffset, 'week'), [weekOffset]);
  const selectedWeekEnd = useMemo(() => selectedWeekStart.add(6, 'day').endOf('day'), [selectedWeekStart]);

  const weekStats = useMemo(() => {
    return bodyStats
      .filter((s) => {
        const d = dayjs(s.date);
        return (
          (d.isSame(selectedWeekStart) || d.isAfter(selectedWeekStart)) &&
          (d.isSame(selectedWeekEnd) || d.isBefore(selectedWeekEnd))
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bodyStats, selectedWeekStart, selectedWeekEnd]);

  const currentWeight = weekStats[0]?.weight;
  const targetDisp = displayWeight(targetWeight, unit as any);

  const handleSaveTarget = () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      onUpdateTarget(inputToKg(val, unit as any));
      setIsEditingTarget(false);
    }
  };

  const handleAddWeight = () => {
    const val = parseFloat(weightInput);
    if (!isNaN(val) && val > 0) {
      onAddStat({
        date: selectedWeekStart.format('YYYY-MM-DD'),
        weight: inputToKg(val, unit as any),
      });
      setIsAddingWeight(false);
      setWeightInput('');
      toast.success('Weekly weight logged');
    }
  };

  const diff = currentWeight ? displayWeight(currentWeight, unit as any) - targetDisp : 0;
  const absDiff = Math.abs(diff);

  return (
    <DashboardPanel
      variants={variants}
      icon={TrendingUp}
      title="Weekly Weight Tracker"
      description="Track your consistency and reach your target"
      headerExtra={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setWeekOffset((o) => o + 1);
              setIsAddingWeight(false);
            }}
            className="p-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-3 py-1.5 rounded-xl border border-border bg-muted/20 min-w-[140px] text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              {weekOffset === 0 ? 'This Week' : `Week ${getTrackingWeekNumber(selectedWeekStart)}`}
            </p>
            <p className="text-xs font-black">
              {selectedWeekStart.format('MMM D')} - {selectedWeekEnd.format('MMM D')}
            </p>
          </div>
          <button
            disabled={weekOffset === 0}
            onClick={() => {
              setWeekOffset((o) => Math.max(0, o - 1));
              setIsAddingWeight(false);
            }}
            className="p-2 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-border/60 bg-muted/10 relative overflow-hidden group min-h-[120px] flex flex-col justify-center">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Target Weight
              </p>
              {isEditingTarget ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    autoFocus
                    type="number"
                    step="0.1"
                    className="ft-input h-10 w-24 text-lg font-black"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
                  />
                  <button
                    onClick={handleSaveTarget}
                    className="ft-btn ft-btn--primary py-2 px-4 text-[10px]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="text-muted-foreground text-[10px] font-black uppercase hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tighter">
                    {targetDisp}
                    <span className="text-lg ml-1 font-black opacity-40">{unit}</span>
                  </span>
                  <button
                    onClick={() => {
                      setTargetInput(String(targetDisp));
                      setIsEditingTarget(true);
                    }}
                    className="text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-border/60 bg-muted/10 min-h-[120px] flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              {weekOffset === 0 ? "Current Week's Weight" : "Logged Weight"}
            </p>
            {currentWeight ? (
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black tracking-tighter text-primary">
                  {displayWeight(currentWeight, unit as any)}
                  <span className="text-lg ml-1 font-black opacity-40">{unit}</span>
                </span>
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg',
                    diff === 0 ? 'bg-muted text-muted-foreground' : 
                    diff > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                  )}
                >
                  {diff === 0 ? 'On Target' : `${absDiff.toFixed(1)} ${unit} ${diff > 0 ? 'Above' : 'Below'}`}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-muted-foreground">No entry for this week</p>
                {!isAddingWeight && (
                  <button
                    onClick={() => setIsAddingWeight(true)}
                    className="ft-btn ft-btn--primary py-2 px-6 text-[10px] font-black uppercase tracking-widest"
                  >
                    Log Weight
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-border/60 bg-muted/10 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Goal Progress
                </p>
                {currentWeight && (
                  <p className="text-xs font-black text-primary">
                    {absDiff === 0 ? 'Goal reached!' : `${absDiff.toFixed(1)} ${unit} to go`}
                  </p>
                )}
              </div>
              <div className="h-3 rounded-full bg-muted/60 overflow-hidden relative">
                {currentWeight && (
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(5, (targetDisp / displayWeight(currentWeight, unit as any)) * 100))}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                )}
              </div>
            </div>

            <AnimatePresence>
              {isAddingWeight && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 p-5 rounded-xl border border-primary/30 bg-primary/5"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">
                    Log Weight for {selectedWeekStart.format('MMM D')}
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      autoFocus
                      type="number"
                      step="0.1"
                      className="ft-input flex-1 h-11 text-lg font-black"
                      placeholder={`Weight in ${unit}`}
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddWeight()}
                    />
                    <button
                      onClick={handleAddWeight}
                      className="ft-btn ft-btn--primary h-11 px-6 font-black uppercase tracking-widest text-xs"
                    >
                      Log
                    </button>
                    <button
                      onClick={() => setIsAddingWeight(false)}
                      className="text-muted-foreground text-[10px] font-black uppercase p-2"
                    >
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {!currentWeight && !isAddingWeight && (
               <div className="flex flex-col items-center justify-center py-4 opacity-40">
                  <Activity className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Data Point</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}
