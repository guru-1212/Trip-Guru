'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { Plus, Trash2, Check, CheckCircle2, Circle, Target, Flame, Calendar, Activity, Dumbbell, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { getWeekProgress, getHabitStreak } from '@/workout/analytics';
import { formatWeight, getTrackingWeekNumber, getTrackingWeekStart } from '@/workout/utils';
import type { ChecklistItem } from '@/workout/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import * as fittrackDb from '@/firebase/fittrack.firestore';

export default function ChecklistPage() {
  const {
    checklist,
    weeklyGoals,
    habits,
    workouts,
    profile,
    hydrated,
    updateChecklist,
    addChecklistItem,
    deleteChecklistItem,
    updateWeeklyGoals,
    toggleHabit,
  } = useWorkoutStore();

  const { uid } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'daily' | 'weekly' | 'habits'>('daily');
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'weekly' || t === 'habits' || t === 'daily') setTab(t);
  }, [searchParams]);

  const allItems = [...checklist.dailyItems, ...checklist.custom];
  const doneCount = allItems.filter((i) => i.done).length;
  const ringPct = allItems.length ? (doneCount / allItems.length) * 100 : 0;

  const weekProgress = useMemo(() => getWeekProgress(workouts, weeklyGoals), [workouts, weeklyGoals]);

  const weekDays = useMemo(() => {
    const start = getTrackingWeekStart();
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  }, []);

  const habitKeys = [
    { key: 'workout' as const, label: 'Workout' },
    { key: 'water' as const, label: 'Water' },
    { key: 'sleep' as const, label: 'Sleep' },
    { key: 'protein' as const, label: 'Protein' },
    { key: 'steps' as const, label: 'Steps' },
  ];

  const toggleItem = (id: string) => {
    const item =
      checklist.dailyItems.find((i) => i.id === id) ??
      checklist.custom.find((i) => i.id === id);
    const markingDone = item && !item.done;

    const update = (items: ChecklistItem[]) =>
      items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    updateChecklist({
      ...checklist,
      dailyItems: update(checklist.dailyItems),
      custom: update(checklist.custom),
    });

    if (id === 'post-protein' && markingDone && uid) {
      const localDate = dayjs().format('YYYY-MM-DD');
      void fittrackDb.cancelPendingProteinReminders(uid, localDate);
    }
  };

  if (!hydrated) return <div className="ft-loading"><span>Loading tasks...</span></div>;

  const tabs = [
    { id: 'daily', label: 'Daily', shortLabel: 'Daily', icon: Activity },
    { id: 'weekly', label: 'Weekly Goals', shortLabel: 'Weekly', icon: Target },
    { id: 'habits', label: 'Habits', shortLabel: 'Habits', icon: Flame },
  ] as const;

  return (
    <PageTransition>
      <div className="space-y-6 max-w-full overflow-x-hidden">
        <header>
          <h1 className="ft-title-lg">Tasks</h1>
          <p className="ft-subtitle mt-1">Daily checklists, weekly goals, and habits</p>
        </header>

        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 rounded-xl border border-border w-full">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 sm:px-3 sm:py-3 rounded-lg text-[10px] sm:text-xs font-semibold transition-all min-w-0',
                  active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate w-full text-center sm:w-auto">{t.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="ft-card ft-card-padded relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="6" />
                      <motion.circle
                        cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 28}
                        initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - ringPct / 100) }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-base sm:text-lg font-bold tabular-nums">
                      {Math.round(ringPct)}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="ft-title text-lg">Today&apos;s checklist</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {doneCount} of {allItems.length} completed
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChecklistSection title="Before workout" items={checklist.dailyItems.filter((i) => i.type === 'pre')} onToggle={toggleItem} onDelete={deleteChecklistItem} />
                <ChecklistSection title="After workout" items={checklist.dailyItems.filter((i) => i.type === 'post')} onToggle={toggleItem} onDelete={deleteChecklistItem} />
              </div>

              {checklist.custom.length > 0 && (
                <ChecklistSection title="Custom items" items={checklist.custom} onToggle={toggleItem} onDelete={deleteChecklistItem} />
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="ft-input flex-1 min-w-0"
                  placeholder="Add a custom task..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { addChecklistItem(newItem.trim()); setNewItem(''); } }}
                />
                <button
                  type="button"
                  className="ft-btn ft-btn--primary shrink-0"
                  onClick={() => { if (newItem.trim()) { addChecklistItem(newItem.trim()); setNewItem(''); } }}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </motion.div>
          )}

          {tab === 'weekly' && (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GoalInput icon={Dumbbell} label="Workouts / week" value={weeklyGoals.workoutsPerWeek} onChange={(v) => updateWeeklyGoals({ workoutsPerWeek: v })} suffix="sessions" />
                <GoalInput icon={TrendingUp} label="Volume target" value={weeklyGoals.volumeTarget} onChange={(v) => updateWeeklyGoals({ volumeTarget: v })} suffix={profile.prefs.unit} />
                <GoalInput icon={Activity} label="Protein" value={weeklyGoals.proteinGoal} onChange={(v) => updateWeeklyGoals({ proteinGoal: v })} suffix="g" />
                <GoalInput icon={Calendar} label="Sleep" value={weeklyGoals.sleepGoal} onChange={(v) => updateWeeklyGoals({ sleepGoal: v })} suffix="hrs" />
              </div>

              <div className="ft-card ft-card-padded space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="ft-section-title text-base">This week&apos;s progress</h3>
                  <span className="ft-badge ft-badge--primary self-start">Week {getTrackingWeekNumber()}</span>
                </div>
                <div className="space-y-6">
                  <ProgressBar label="Workouts" current={weekProgress.workouts} target={weeklyGoals.workoutsPerWeek} pct={weekProgress.workoutPct} />
                  <ProgressBar label="Volume" current={formatWeight(weekProgress.volume, profile.prefs.unit)} target={formatWeight(weeklyGoals.volumeTarget, profile.prefs.unit)} pct={weekProgress.volumePct} />
                </div>
                <p className="text-xs text-muted-foreground">Goals reset every Sunday night.</p>
              </div>
            </motion.div>
          )}

          {tab === 'habits' && (
            <motion.div
              key="habits"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {habitKeys.map(({ key, label }) => (
                <div key={key} className="ft-card ft-card-padded space-y-3">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="font-semibold text-sm truncate">{label}</p>
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      {getHabitStreak(habits, key)}d
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {weekDays.map((d) => {
                      const dateKey = d.format('YYYY-MM-DD');
                      const done = habits[dateKey]?.[key] ?? false;
                      const isToday = d.isSame(dayjs(), 'day');
                      return (
                        <div key={dateKey} className="flex flex-col items-center gap-1 min-w-0">
                          <span className={cn(
                            'text-[9px] sm:text-[10px] font-medium uppercase',
                            isToday ? 'text-primary' : 'text-muted-foreground'
                          )}>
                            {d.format('dd')}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleHabit(dateKey, key)}
                            aria-label={`${label} on ${d.format('MMM D')}`}
                            className={cn(
                              'w-full max-w-[44px] aspect-square rounded-lg flex items-center justify-center transition-all active:scale-95',
                              done
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-muted-foreground/40 hover:bg-primary/10',
                              isToday && !done && 'ring-2 ring-primary/30'
                            )}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <Circle className="h-4 w-4 sm:h-5 sm:w-5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

function ChecklistSection({
  title,
  items,
  onToggle,
  onDelete,
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 min-w-0">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3 ft-card min-w-0">
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all',
                item.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-transparent'
              )}
            >
              <Check className="h-4 w-4" />
            </button>
            <span className={cn(
              'flex-1 min-w-0 text-sm font-medium break-words',
              item.done && 'line-through text-muted-foreground'
            )}>
              {item.label}
            </span>
            {!item.isDefault && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg shrink-0 sm:opacity-70"
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalInput({
  icon: Icon,
  label,
  value,
  onChange,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="ft-card ft-card-padded space-y-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium truncate">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="ft-input flex-1 min-w-0"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && (
          <span className="text-xs text-muted-foreground shrink-0 w-14 sm:w-auto">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  current,
  target,
  pct,
}: {
  label: string;
  current: string | number;
  target: string | number;
  pct: number;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-base font-semibold tabular-nums truncate">{current}</p>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          Goal: <span className="font-medium text-foreground">{target}</span>
        </p>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
