'use client';

import Link from 'next/link';
import { ArrowUpRight, Droplets } from 'lucide-react';
import { WaterProgressRing } from '@/components/water/WaterProgressRing';
import { WaterQuickAdd } from '@/components/water/WaterQuickAdd';
import { WaterPaceIndicator } from '@/components/water/WaterPaceIndicator';
import { useWaterTracker } from '@/hooks/useWaterTracker';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface WaterDashboardWidgetProps {
  className?: string;
}

export function WaterDashboardWidget({ className }: WaterDashboardWidgetProps) {
  const {
    totalMl,
    goalMl,
    paceStatus,
    loading,
    actionLoading,
    ready,
    addIntake,
    isGymDay,
  } = useWaterTracker();

  const handleAdd = async (amount: number) => {
    try {
      await addIntake(amount);
      toast.success(`Added ${amount} ml`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log intake');
    }
  };

  if (loading) {
    return (
      <div className={cn('ft-card ft-card-padded animate-pulse h-48', className)} aria-busy="true" />
    );
  }

  return (
    <section
      className={cn('ft-card ft-card-padded', className)}
      aria-label="Water intake summary"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-[hsl(var(--water))]" aria-hidden="true" />
          <h2 className="ft-title text-base">Hydration</h2>
          {isGymDay && (
            <span className="text-xs font-medium text-[hsl(var(--water))] bg-[hsl(var(--water)/0.12)] px-2 py-0.5 rounded-full">
              Gym day
            </span>
          )}
        </div>
        <Link
          href="/fittrack/water"
          className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--water))] hover:underline"
          aria-label="Open full water tracker"
        >
          Details
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <WaterProgressRing totalMl={totalMl} goalMl={goalMl} size={140} />
        <div className="flex-1 w-full space-y-3">
          <WaterPaceIndicator status={paceStatus} />
          <WaterQuickAdd onAdd={handleAdd} disabled={!ready || actionLoading} compact />
        </div>
      </div>
    </section>
  );
}
