'use client';

import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBaselineTest, todayKey } from '@/hooks/useTargets';
import type { Target } from '@/workout/targets';

interface BaselineTestCardProps {
  target: Target;
  className?: string;
}

/**
 * Shown until a baseline exists. Nothing can be prescribed before this, because
 * every percentage in the scheme is relative to what the user can actually do.
 */
export function BaselineTestCard({ target, className }: BaselineTestCardProps) {
  const logBaseline = useBaselineTest(target);
  const [value, setValue] = useState('');
  const noun = target.unit === 'seconds' ? 'seconds' : 'reps';
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <div className={cn('ft-card ft-card-padded', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="ft-title text-base">Set your baseline</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        After a short warm-up, go all-out for one set and stop the moment your form breaks.
        That number is what every session from here is built from — it is a measurement,
        not a test you can fail.
      </p>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          className="ft-input flex-1"
          placeholder={`Your max ${noun}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Baseline ${noun}`}
        />
        <button
          type="button"
          className="ft-btn ft-btn--primary"
          disabled={!valid}
          onClick={() => {
            logBaseline(parsed, todayKey());
            setValue('');
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
