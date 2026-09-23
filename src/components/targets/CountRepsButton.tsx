'use client';

import { useState } from 'react';
import { Camera, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogExtraSet } from '@/hooks/useTargets';
import type { Target } from '@/workout/targets';
import { RepCounterModal } from './RepCounterModal';

interface CountRepsButtonProps {
  target: Target;
  /** Last test's top set, shown as the number to beat. */
  ghost: number | null;
  allTimeBest: number;
  className?: string;
}

/**
 * Always-available camera counter, independent of the training schedule.
 *
 * The in-workout block only renders on a scheduled day, which left the counter
 * unreachable on five days out of seven. This is the way in on any day — the
 * count still has to be confirmed before it is saved.
 */
export function CountRepsButton({
  target,
  ghost,
  allTimeBest,
  className,
}: CountRepsButtonProps) {
  const logExtraSet = useLogExtraSet(target);
  const [counting, setCounting] = useState(false);
  const [counted, setCounted] = useState<number | null>(null);

  if (target.unit !== 'reps' || target.status !== 'active') return null;

  return (
    <div className={cn('space-y-2', className)}>
      {counted === null ? (
        <button
          type="button"
          className="ft-btn ft-btn--secondary ft-btn--block ft-btn--sm"
          onClick={() => setCounting(true)}
        >
          <Camera className="h-4 w-4" />
          Count reps with camera
        </button>
      ) : (
        <div className="ft-card p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tabular-nums">{counted} reps counted</p>
            <p className="text-xs text-muted-foreground">Save as an extra set?</p>
          </div>
          <button
            type="button"
            className="ft-btn ft-btn--ghost ft-btn--icon"
            onClick={() => setCounted(null)}
            aria-label="Discard count"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ft-btn ft-btn--primary ft-btn--sm"
            onClick={() => {
              logExtraSet(counted);
              setCounted(null);
            }}
          >
            <Check className="h-4 w-4" />
            Save
          </button>
        </div>
      )}

      <RepCounterModal
        open={counting}
        onOpenChange={(o) => !o && setCounting(false)}
        ghost={ghost}
        allTimeBest={allTimeBest}
        unit={target.unit}
        onConfirm={(count) => {
          setCounting(false);
          if (count > 0) setCounted(count);
        }}
      />
    </div>
  );
}
