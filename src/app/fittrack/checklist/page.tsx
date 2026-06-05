'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Plus, Trash2, Check, CheckCircle2, Circle, Target, Flame, Calendar, Activity, Dumbbell, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { getWeekProgress, getHabitStreak } from '@/workout/analytics';
import { formatWeight } from '@/workout/utils';
import type { ChecklistItem } from '@/workout/types';
import { cn } from '@/lib/utils';

dayjs.extend(isoWeek);

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

  const [tab, setTab] = useState<'daily' | 'weekly' | 'habits'>('daily');
  const [newItem, setNewItem] = useState('');

  const allItems = [...checklist.dailyItems, ...checklist.custom];
  const doneCount = allItems.filter((i) => i.done).length;
  const ringPct = allItems.length ? (doneCount / allItems.length) * 100 : 0;

  const weekProgress = useMemo(() => getWeekProgress(workouts, weeklyGoals), [workouts, weeklyGoals]);

  const weekDays = useMemo(() => {
    const start = dayjs().startOf('isoWeek');
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  }, []);

  const habitKeys = [
    { key: 'workout' as const, label: 'Workout' },
    { key: 'water' as const, label: 'Water' },
    { key: 'sleep' as const, label: 'Sleep 8hrs' },
    { key: 'protein' as const, label: 'Protein goal' },
    { key: 'steps' as const, label: 'Step count' },
  ];

  const toggleItem = (id: string) => {
    const update = (items: ChecklistItem[]) =>
      items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    updateChecklist({
      ...checklist,
      dailyItems: update(checklist.dailyItems),
      custom: update(checklist.custom),
    });
  };

  if (!hydrated) return <div className="text-muted-foreground font-black p-8 uppercase tracking-widest">Deploying Protocols...</div>;

  const tabs = [
    { id: 'daily', label: 'Daily Ops', icon: Activity },
    { id: 'weekly', label: 'Objectives', icon: Target },
    { id: 'habits', label: 'Continuity', icon: Flame },
  ] as const;

  return (
    <PageTransition>
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Operations Center</h1>
          <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.2em]">Maintenance & Habit Persistence Tracking</p>
        </header>

        <div className="flex p-1.5 bg-slate-500/5 rounded-2xl border border-white/5 w-fit">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                  active ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-muted-foreground hover:text-primary/70"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'daily' && (
            <motion.div 
              key="daily"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="glass rounded-[32px] p-8 border-primary/10 flex items-center gap-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Activity className="h-32 w-32" />
                </div>
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 wk-ring-progress" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="6" />
                    <motion.circle
                      cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 28}
                      initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - ringPct / 100) }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-black tracking-tighter">
                    {Math.round(ringPct)}%
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Daily Readiness</h2>
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    {doneCount} of {allItems.length} operational checks completed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChecklistSection title="Pre-Deployment" items={checklist.dailyItems.filter((i) => i.type === 'pre')} onToggle={toggleItem} onDelete={deleteChecklistItem} />
                <ChecklistSection title="Post-Deployment" items={checklist.dailyItems.filter((i) => i.type === 'post')} onToggle={toggleItem} onDelete={deleteChecklistItem} />
              </div>

              {checklist.custom.length > 0 && (
                <ChecklistSection title="Custom Protocols" items={checklist.custom} onToggle={toggleItem} onDelete={deleteChecklistItem} />
              )}

              <div className="flex gap-3 max-w-xl">
                <input
                  className="wk-input h-14 font-bold bg-slate-500/5 focus:bg-primary/[0.02]"
                  placeholder="Inject custom protocol node..."
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newItem.trim()) { addChecklistItem(newItem.trim()); setNewItem(''); } }}
                />
                <button 
                  type="button" 
                  className="wk-btn-primary px-8 flex items-center gap-2 whitespace-nowrap" 
                  onClick={() => { if (newItem.trim()) { addChecklistItem(newItem.trim()); setNewItem(''); } }}
                >
                  <Plus className="h-5 w-5" /> <span>Add</span>
                </button>
              </div>
            </motion.div>
          )}

          {tab === 'weekly' && (
            <motion.div 
              key="weekly"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <GoalInput icon={Dumbbell} label="Workouts" value={weeklyGoals.workoutsPerWeek} onChange={(v) => updateWeeklyGoals({ workoutsPerWeek: v })} suffix="Sessions" />
                <GoalInput icon={TrendingUp} label="Volume" value={weeklyGoals.volumeTarget} onChange={(v) => updateWeeklyGoals({ volumeTarget: v })} suffix={profile.prefs.unit} />
                <GoalInput icon={Activity} label="Protein" value={weeklyGoals.proteinGoal} onChange={(v) => updateWeeklyGoals({ proteinGoal: v })} suffix="g" />
                <GoalInput icon={Calendar} label="Sleep" value={weeklyGoals.sleepGoal} onChange={(v) => updateWeeklyGoals({ sleepGoal: v })} suffix="Hrs" />
              </div>

              <div className="wk-card p-8 md:p-10 space-y-10">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-black tracking-tight">Objective Progress</h3>
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full">Active Cycle</span>
                </div>
                <div className="space-y-8 max-w-3xl">
                  <ProgressBar label="Weekly Deployment" current={weekProgress.workouts} target={weeklyGoals.workoutsPerWeek} pct={weekProgress.workoutPct} />
                  <ProgressBar label="Tonnage Output" current={formatWeight(weekProgress.volume, profile.prefs.unit)} target={formatWeight(weeklyGoals.volumeTarget, profile.prefs.unit)} pct={weekProgress.volumePct} />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-4 opacity-50">Cycle synchronization occurs every Monday 00:00</p>
              </div>
            </motion.div>
          )}

          {tab === 'habits' && (
            <motion.div 
              key="habits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="wk-card p-6 md:p-8 overflow-x-auto no-scrollbar shadow-2xl"
            >
              <div className="min-w-[600px]">
                <div className="grid grid-cols-8 gap-4 mb-8">
                  <div />
                  {weekDays.map((d) => (
                    <div
                      key={d.format('YYYY-MM-DD')}
                      className={cn(
                        "text-center space-y-1",
                        d.isSame(dayjs(), 'day') ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest">{d.format('ddd')}</p>
                      <p className="text-xl font-black tracking-tighter">{d.format('D')}</p>
                    </div>
                  ))}
                </div>
                {habitKeys.map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-8 gap-4 items-center mb-6 last:mb-0 group/habit">
                    <div className="pr-4">
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1 group-hover/habit:text-primary transition-colors">{label}</p>
                      <div className="flex items-center gap-1">
                         <Flame className="h-3 w-3 text-orange-500" />
                         <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{getHabitStreak(habits, key)}D Streak</span>
                      </div>
                    </div>
                    {weekDays.map((d) => {
                      const dateKey = d.format('YYYY-MM-DD');
                      const done = habits[dateKey]?.[key] ?? false;
                      const isToday = d.isSame(dayjs(), 'day');
                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => toggleHabit(dateKey, key)}
                          className={cn(
                            "aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-90",
                            done 
                              ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                              : "bg-slate-500/5 hover:bg-primary/5 text-muted-foreground/20",
                            isToday && !done && "ring-2 ring-primary/30 ring-offset-4 ring-offset-background"
                          )}
                        >
                          {done ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
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
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-4 p-4 glass-dark rounded-2xl border border-white/5 hover:border-primary/20 transition-all duration-300">
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={cn(
                "w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300",
                item.done ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-white/5 text-transparent hover:bg-white/10"
              )}
            >
              <Check className="h-4 w-4" />
            </button>
            <span className={cn(
              "flex-1 text-sm font-bold transition-all duration-300",
              item.done ? "line-through text-muted-foreground opacity-50" : "text-slate-900 dark:text-white"
            )}>
              {item.label}
            </span>
            {!item.isDefault && (
              <button 
                type="button" 
                onClick={() => onDelete(item.id)} 
                className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-500 rounded-xl transition-all"
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

function GoalInput({ icon: Icon, label, value, onChange, suffix }: { icon: any, label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="wk-card p-5 space-y-4 hover:border-primary/30 transition-all group">
      <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Icon className="h-4 w-4" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <div className="relative">
        <input
          type="number"
          className="wk-input bg-slate-500/5 h-12 font-black text-lg px-4 focus:bg-primary/[0.02]"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ label, current, target, pct }: { label: string; current: string | number; target: string | number; pct: number }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
           <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
           <p className="text-lg font-black tracking-tight">{current}</p>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target: <span className="text-slate-900 dark:text-white">{target}</span></p>
      </div>
      <div className="h-3 bg-slate-500/5 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          className="h-full bg-primary relative" 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
           <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-shimmer" />
        </motion.div>
      </div>
    </div>
  );
}
