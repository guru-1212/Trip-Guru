'use client';

import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { History, Share2, Calendar, Timer, TrendingUp, Dumbbell, Filter } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { formatDuration, formatWeight, toSubVariationLabel } from '@/workout/utils';
import toast from 'react-hot-toast';
import { WorkoutSession } from '@/workout/types';

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'];

export default function HistoryPage() {
  const { workouts, profile, hydrated } = useWorkoutStore();
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredWorkouts = useMemo(() => {
    let filtered = workouts;
    if (muscleFilter !== 'All') {
      filtered = filtered.filter(w => 
        w.exercises.some(ex => ex.muscle === muscleFilter)
      );
    }
    return [...filtered].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  }, [workouts, muscleFilter]);

  const formatDurationHMS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const generateShareText = (workout: WorkoutSession) => {
    const unit = profile.prefs.unit;
    let text = `${workout.splitName} - ${dayjs(workout.date).format('MMM D, YYYY')}\n`;
    text += `Duration: ${formatDurationHMS(workout.duration)} | Volume: ${formatWeight(workout.totalVolume, unit)}\n`;
    text += `--------------------------------\n`;

    workout.exercises.forEach((ex, idx) => {
      text += `${idx + 1}) ${ex.name}\n`;
      text += `   ${toSubVariationLabel(0)}) ${ex.variation}\n`;
      const doneSets = ex.sets.filter(s => s.done);
      doneSets.forEach((set, sIdx) => {
        text += `      Set ${sIdx + 1}: ${formatWeight(set.weight, unit)} × ${set.reps}\n`;
      });
    });

    text += `\nShared via Athlete OS`;
    return text;
  };

  const handleShare = async (workout: WorkoutSession) => {
    const text = generateShareText(workout);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(workout.id);
      toast.success("Workout data copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleShareThisWeek = async () => {
    // Current week boundaries
    const startOfWeek = dayjs().startOf('week'); 
    const endOfWeek = dayjs().endOf('week');
    
    const thisWeekWorkouts = workouts.filter(w => {
      const d = dayjs(w.date);
      return d.valueOf() >= startOfWeek.valueOf() && d.valueOf() <= endOfWeek.valueOf();
    }).sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

    if (thisWeekWorkouts.length === 0) {
      toast.error("No workouts found for this week yet.");
      return;
    }

    const unit = profile.prefs.unit;
    let text = `🏋️ This Week's Workout Summary (${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D')})\n\n`;

    thisWeekWorkouts.forEach(workout => {
      text += `📅 ${workout.splitName} - ${dayjs(workout.date).format('dddd, MMM D')}\n`;
      text += `⏱️ ${formatDurationHMS(workout.duration)} | ⚖️ ${formatWeight(workout.totalVolume, unit)} Vol\n`;
      
      workout.exercises.forEach((ex, idx) => {
        const doneSets = ex.sets.filter(s => s.done);
        if (doneSets.length === 0) return;
        text += `  ${idx + 1}. ${ex.name} ${ex.variation !== 'Standard' ? `(${ex.variation})` : ''}\n`;
        doneSets.forEach((set, sIdx) => {
          text += `     Set ${sIdx + 1}: ${formatWeight(set.weight, unit)} × ${set.reps}\n`;
        });
      });
      text += `\n`;
    });

    text += `Shared via Athlete OS`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Weekly summary copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy weekly summary");
    }
  };

  if (!hydrated) return <div className="text-muted-foreground p-6">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6 pb-24">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="ft-title text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Workout History
            </h1>
            <p className="ft-subtitle mt-1">Review and share your past sessions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={handleShareThisWeek}
              className="ft-btn ft-btn--secondary ft-btn--sm flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share This Week
            </button>
            <div className="flex items-center gap-2 border-l border-border pl-2 ml-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                className="ft-input w-auto text-sm py-1.5 h-auto min-w-[120px]"
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
              >
                {MUSCLE_GROUPS.map(m => (
                  <option key={m} value={m}>{m === 'All' ? 'All Muscles' : m}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {filteredWorkouts.length === 0 ? (
          <div className="ft-card ft-card-padded text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No workouts found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {muscleFilter !== 'All' 
                ? `No workouts found targeting ${muscleFilter}.` 
                : 'Your completed workouts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkouts.map(workout => (
              <div key={workout.id} className="ft-card ft-card-padded space-y-4">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{workout.splitName}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        {dayjs(workout.date).format('MMM D, YYYY')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Timer className="h-4 w-4" />
                        {formatDuration(workout.duration)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4" />
                        {formatWeight(workout.totalVolume, profile.prefs.unit)} Vol
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleShare(workout)}
                    className={`ft-btn ft-btn--sm shrink-0 ${copiedId === workout.id ? 'ft-btn--primary' : 'ft-btn--secondary'}`}
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{copiedId === workout.id ? 'Copied!' : 'Share'}</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {workout.exercises.map((ex, idx) => {
                    const doneSets = ex.sets.filter(s => s.done);
                    if (doneSets.length === 0) return null;
                    return (
                      <div key={`${ex.exerciseId}-${idx}`} className="bg-muted/30 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">{ex.name}</p>
                            <p className="text-xs text-primary font-medium">{ex.variation}</p>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            {doneSets.length} sets
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {doneSets.map((set, sIdx) => (
                            <div key={sIdx} className="text-xs flex items-center justify-between bg-background border border-border px-2 py-1 rounded">
                              <span className="text-muted-foreground">Set {sIdx + 1}</span>
                              <span className="font-semibold tabular-nums">{formatWeight(set.weight, profile.prefs.unit)} × {set.reps}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
