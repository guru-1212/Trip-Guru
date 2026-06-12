'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/workout/PageTransition';
import { WaterProgressRing } from '@/components/water/WaterProgressRing';
import { WaterQuickAdd } from '@/components/water/WaterQuickAdd';
import { WaterScheduleList } from '@/components/water/WaterScheduleList';
import { WaterIntakeLog } from '@/components/water/WaterIntakeLog';
import { WaterPaceIndicator } from '@/components/water/WaterPaceIndicator';
import { WaterStreakBadge } from '@/components/water/WaterStreakBadge';
import { NextReminderCard } from '@/components/water/NextReminderCard';
import { WaterNotificationPrompt } from '@/components/water/WaterNotificationPrompt';
import { useWaterTracker } from '@/hooks/useWaterTracker';
import { formatMl } from '@/lib/water/waterUtils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function WaterPage() {
  const {
    totalMl,
    goalMl,
    intakes,
    scheduleWithStates,
    paceStatus,
    expectedMl,
    nextReminder,
    streak,
    isGymDay,
    timezone,
    loading,
    actionLoading,
    ready,
    error,
    completed,
    addIntake,
    removeIntake,
  } = useWaterTracker();

  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'log-water' && ready && !actionLoading) {
      handleAdd(250);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, ready, actionLoading]);


  const suggestedAmounts = Array.from(new Set(scheduleWithStates.map((s) => s.amount))).sort((a, b) => a - b);

  const handleAdd = async (amount: number) => {
    try {
      await addIntake(amount);
      toast.success(`Added ${formatMl(amount)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log intake');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeIntake(id);
      toast.success('Intake removed');
    } catch {
      toast.error('Could not remove intake');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="ft-loading" aria-busy="true">
          <LoadingSpinner />
          <span>Loading water tracker…</span>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 md:space-y-8 max-w-3xl mx-auto">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Droplets className="h-7 w-7 text-[hsl(var(--water))]" aria-hidden="true" />
            <h1 className="ft-title-lg">Water Intake</h1>
            {isGymDay && (
              <span className="text-xs font-semibold text-[hsl(var(--water))] bg-[hsl(var(--water)/0.12)] px-2.5 py-1 rounded-full">
                Gym day · {formatMl(goalMl)} goal
              </span>
            )}
            {!isGymDay && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                Rest day · {formatMl(goalMl)} goal
              </span>
            )}
          </div>
          <p className="ft-subtitle">Track hydration from 8 AM to 11 PM IST</p>
        </header>

        <WaterNotificationPrompt />

        {error && (
          <p className="text-sm text-[hsl(var(--pace-behind))]" role="alert">
            {error}
          </p>
        )}

        {completed && (
          <div
            className="rounded-xl border border-[hsl(var(--pace-ahead)/0.3)] bg-[hsl(var(--pace-ahead)/0.08)] px-4 py-3 text-sm font-medium text-[hsl(var(--pace-ahead))]"
            role="status"
          >
            Daily goal reached — {formatMl(totalMl)} logged today!
          </div>
        )}

        <div className="ft-card ft-card-padded flex flex-col items-center gap-4">
          <WaterProgressRing totalMl={totalMl} goalMl={goalMl} />
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="flex flex-col items-center p-3 bg-muted/40 rounded-xl border border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Target Pace</span>
              <span className="text-xl font-bold text-[hsl(var(--water))]">{formatMl(expectedMl)}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">should have drunk</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-muted/40 rounded-xl border border-border/50">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Actual Intake</span>
              <span className="text-xl font-bold text-foreground">{formatMl(totalMl)}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">really drunk</span>
            </div>
          </div>

          <WaterPaceIndicator status={paceStatus} />
          <WaterQuickAdd 
            onAdd={handleAdd} 
            suggestedAmounts={suggestedAmounts}
            disabled={!ready || actionLoading} 
            className="w-full max-w-md" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WaterStreakBadge streak={streak} className="w-full justify-center" />
          <NextReminderCard nextReminder={nextReminder} />
        </div>

        <section className="ft-card ft-card-padded">
          <h2 className="ft-title text-base mb-4">Today&apos;s schedule</h2>
          <WaterScheduleList slots={scheduleWithStates} />
        </section>

        <section className="ft-card ft-card-padded">
          <h2 className="ft-title text-base mb-4">Intake log</h2>
          <WaterIntakeLog
            intakes={intakes}
            timezone={timezone}
            onRemove={handleRemove}
            disabled={actionLoading}
          />
        </section>
      </div>
    </PageTransition>
  );
}
