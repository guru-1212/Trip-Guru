'use client';

import Link from 'next/link';
import { ArrowUpRight, Target as TargetIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTargets } from '@/hooks/useTargets';
import { describeSessionKind, formatTargetValue } from '@/workout/targets';
import { TargetRing } from './TargetRing';

/**
 * Renders only when there is target work due today, so the dashboard stays quiet
 * on rest days. Follows the NutritionDashboardWidget contract: className is the
 * only prop and all data comes from a hook.
 */
export function TargetDashboardWidget({ className }: { className?: string }) {
  const { dueToday } = useTargets();
  if (dueToday.length === 0) return null;

  return (
    <section
      className={cn('ft-card ft-card-padded', className)}
      aria-label="Today's targets"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TargetIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="ft-title text-base">Today&apos;s target</h2>
        </div>
        <Link
          href="/fittrack/targets"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Details
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {dueToday.map(({ target, currentBest, prescription, todayAttempt, needsBaseline }) => (
          <Link
            key={target.id}
            href={`/fittrack/targets/${target.id}`}
            className="flex items-center gap-4"
          >
            <TargetRing
              current={currentBest}
              goal={target.goalValue}
              unit={target.unit}
              size={96}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{target.name}</p>
              {needsBaseline ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Log your baseline to start
                </p>
              ) : prescription ? (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    {describeSessionKind(prescription.kind)}
                    {todayAttempt ? ' · logged' : ''}
                  </p>
                  <p className="text-sm font-medium text-primary mt-1">
                    {prescription.sets[0].isAmrap && prescription.ghost !== null
                      ? `Set 1: beat ${formatTargetValue(prescription.ghost, target.unit)}`
                      : `${prescription.sets.length} sets · ${formatTargetValue(prescription.totalGoal, target.unit)} total`}
                  </p>
                </>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
