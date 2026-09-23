'use client';

import Link from 'next/link';
import { Target as TargetIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTargetLogger, useTargets, todayKey } from '@/hooks/useTargets';
import { describeSessionKind, formatTargetValue } from '@/workout/targets';
import type { Target } from '@/workout/targets';
import { TargetSetLogger } from './TargetSetLogger';
import { BaselineTestCard } from './BaselineTestCard';

interface TargetWorkoutBlockProps {
  date: string;
  /** Starts the shared rest timer at the prescribed rest. */
  onRest?: (seconds: number) => void;
  className?: string;
}

function TargetBlockCard({
  target,
  exerciseName,
  date,
  onRest,
}: {
  target: Target;
  exerciseName: string;
  date: string;
  onRest?: (seconds: number) => void;
}) {
  const logger = useTargetLogger(target, date);
  const prescription = logger.livePrescription;
  if (!prescription) return null;

  return (
    <div
      className={cn(
        'ft-card ft-card-padded border-primary/40',
        logger.isComplete && 'opacity-80'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <TargetIcon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="ft-title text-base truncate">{target.name}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {exerciseName} · {describeSessionKind(prescription.kind)} ·{' '}
              {formatTargetValue(prescription.currentBest, target.unit)} best
            </p>
          </div>
        </div>
        <Link
          href={`/fittrack/targets/${target.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
        >
          Details
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-sm text-muted-foreground my-3">{prescription.coachNote}</p>

      <TargetSetLogger target={target} logger={logger} onSetLogged={onRest} />
    </div>
  );
}

/**
 * Target work pinned above the day's lifts. Rendered as a sibling of the exercise
 * Reorder.Group and kept out of ActiveWorkoutState.exercises entirely, so
 * pickOrder, orderActiveWorkoutExercises and the remote-merge heuristic are
 * untouched. Attempts persist on their own as each set is logged.
 */
export function TargetWorkoutBlock({ date, onRest, className }: TargetWorkoutBlockProps) {
  const { dueToday } = useTargets(date ?? todayKey());
  if (dueToday.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 px-1">
        <span className="ft-badge ft-badge--primary">Before your lifts</span>
      </div>
      {dueToday.map(({ target, exerciseName, needsBaseline }) =>
        needsBaseline ? (
          <BaselineTestCard key={target.id} target={target} />
        ) : (
          <TargetBlockCard
            key={target.id}
            target={target}
            exerciseName={exerciseName}
            date={date}
            onRest={onRest}
          />
        )
      )}
    </div>
  );
}
