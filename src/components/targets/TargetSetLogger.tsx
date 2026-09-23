'use client';

import { useState } from 'react';
import { Camera, Check, Minus, Plus, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describeSessionKind, formatTargetValue } from '@/workout/targets';
import type { Target } from '@/workout/targets';
import type { TargetLogger } from '@/hooks/useTargets';
import { RepCounterModal } from './RepCounterModal';

interface TargetSetLoggerProps {
  target: Target;
  logger: TargetLogger;
  /** Fired when a set is logged, so the caller can start the rest timer. */
  onSetLogged?: (restSeconds: number) => void;
  className?: string;
}

/**
 * Shared by the in-workout block and the standalone quick log so both behave
 * identically. Reuses the ft-stepper / ft-set-card vocabulary from SessionSetRow
 * rather than inventing a second set-logging look.
 */
export function TargetSetLogger({
  target,
  logger,
  onSetLogged,
  className,
}: TargetSetLoggerProps) {
  const [countingSet, setCountingSet] = useState<number | null>(null);

  const prescription = logger.livePrescription;
  if (!prescription) return null;

  const step = target.unit === 'seconds' ? 5 : 1;
  const noun = target.unit === 'seconds' ? 'seconds' : 'reps';

  const handleLog = (index: number, alreadyLogged: boolean) => {
    if (alreadyLogged) {
      logger.unlogSet(index);
      return;
    }
    logger.logSet(index);
    onSetLogged?.(prescription.restSeconds);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {prescription.sets.map((set) => {
        const value = logger.values[set.index] ?? set.goal;
        const isLogged = logger.logged[set.index] ?? false;
        const ghost = set.isAmrap ? logger.ghost : null;
        const delta = ghost !== null ? value - ghost : 0;
        const beatsBest = set.isAmrap && value > logger.allTimeBest;

        return (
          <div
            key={set.index}
            className={cn('ft-set-card', isLogged && 'ft-set-card--done')}
          >
            <div className="ft-set-header">
              <span className={cn('ft-set-num', isLogged && 'ft-set-num--done')}>
                {set.index + 1}
              </span>
              <span className="text-sm font-semibold">
                {set.isAmrap ? 'Max effort' : `Target ${formatTargetValue(set.goal, target.unit)}`}
              </span>
              {set.isAmrap && (
                <span className="ft-badge ft-badge--warning ml-auto">AMRAP</span>
              )}
            </div>

            {/* Beat-your-ghost: last session's number, with a live delta. */}
            {set.isAmrap && ghost !== null && (
              <div className="flex items-baseline gap-2 px-1 pb-2 text-xs">
                <span className="text-muted-foreground">
                  Last time: <span className="font-semibold tabular-nums">{formatTargetValue(ghost, target.unit)}</span>
                </span>
                {delta !== 0 && (
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      delta > 0 ? 'ft-pace-ahead' : 'ft-pace-behind'
                    )}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
                {beatsBest && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                    <Flame className="h-3 w-3" />
                    new best
                  </span>
                )}
              </div>
            )}

            <div className="ft-set-fields">
              <div className="ft-set-field">
                <span className="ft-set-field-label">{noun}</span>
                <div className="ft-stepper">
                  <button
                    type="button"
                    className="ft-stepper-btn"
                    onClick={() => logger.setValue(set.index, value - step)}
                    aria-label={`Decrease ${noun}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="ft-stepper-value"
                    value={value === 0 ? '' : value}
                    placeholder="0"
                    onChange={(e) => logger.setValue(set.index, Number(e.target.value) || 0)}
                  />
                  <button
                    type="button"
                    className="ft-stepper-btn"
                    onClick={() => logger.setValue(set.index, value + step)}
                    aria-label={`Increase ${noun}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!isLogged && target.unit === 'reps' && (
                <button
                  type="button"
                  className="ft-btn ft-btn--ghost ft-btn--sm"
                  onClick={() => setCountingSet(set.index)}
                >
                  <Camera className="h-4 w-4" />
                  Count for me
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleLog(set.index, isLogged)}
              className={cn(
                'ft-btn ft-btn--block ft-btn--lg',
                isLogged ? 'ft-btn--primary' : 'ft-btn--ghost'
              )}
            >
              <Check className="h-4 w-4" />
              {isLogged ? 'Completed' : 'Log Set'}
            </button>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground text-center">
        {describeSessionKind(prescription.kind)} · rest {prescription.restSeconds}s between sets
      </p>

      {/* The camera fills the stepper; tapping "Log Set" is the confirmation. */}
      <RepCounterModal
        open={countingSet !== null}
        onOpenChange={(o) => !o && setCountingSet(null)}
        ghost={countingSet === 0 ? logger.ghost : null}
        allTimeBest={logger.allTimeBest}
        unit={target.unit}
        onConfirm={(count) => {
          if (countingSet !== null) logger.setValue(countingSet, count);
          setCountingSet(null);
        }}
      />
    </div>
  );
}
