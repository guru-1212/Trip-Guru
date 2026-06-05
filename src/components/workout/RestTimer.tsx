'use client';

import { useEffect, useState } from 'react';
import { Timer, X, Plus, Minus } from 'lucide-react';
import { playBeep, notify } from '@/workout/utils';
import { REST_TIMER_OPTIONS } from '@/workout/constants';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  endTime: number | null;
  defaultSeconds: number;
  soundEnabled: boolean;
  onComplete: () => void;
  onDurationChange: (seconds: number) => void;
  onClose: () => void;
}

export function RestTimer({
  endTime,
  defaultSeconds,
  soundEnabled,
  onComplete,
  onDurationChange,
  onClose,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [overtime, setOvertime] = useState(0);

  useEffect(() => {
    if (!endTime) {
      setRemaining(0);
      setOvertime(0);
      return;
    }
    const tick = () => {
      const left = Math.ceil((endTime - Date.now()) / 1000);
      setRemaining(left);
      setOvertime(left < 0 ? Math.abs(left) : 0);

      if (soundEnabled && left > 0 && left <= 3 && left !== remaining) {
        playBeep(440, 0.1);
      }
      if (left === 0 && remaining === 1) {
        if (soundEnabled) playBeep(880, 0.5);
        notify('Rest Complete!', 'Time for your next set.');
        onComplete();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTime, soundEnabled, remaining, onComplete]);

  if (!endTime) return null;

  const isOvertime = remaining <= 0;

  return (
    <div className="ft-rest-screen">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 ft-btn ft-btn--ghost ft-btn--icon"
        aria-label="Close rest timer"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="space-y-1 mb-10">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <Timer className="h-4 w-4" />
          {isOvertime ? 'Overtime' : 'Rest Timer'}
        </div>
        <p className="text-sm text-muted-foreground">Recover before your next set</p>
      </div>

      <div className={cn('ft-rest-timer mb-2', isOvertime ? 'text-red-500' : 'text-foreground')}>
        {isOvertime ? `+${overtime}` : remaining}
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-12">seconds</p>

      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-wrap justify-center gap-2">
          {REST_TIMER_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onDurationChange(s)}
              className={cn(
                'ft-chip',
                defaultSeconds === s && 'ft-chip--active'
              )}
            >
              {s}s
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onDurationChange(Math.max(5, defaultSeconds - 15))}
            className="ft-btn ft-btn--secondary flex-1"
          >
            <Minus className="h-4 w-4" />
            15s
          </button>
          <button
            type="button"
            onClick={() => onDurationChange(defaultSeconds + 15)}
            className="ft-btn ft-btn--secondary flex-1"
          >
            <Plus className="h-4 w-4" />
            15s
          </button>
        </div>

        <button type="button" onClick={onClose} className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg">
          {isOvertime ? "I'm Ready" : 'Skip Rest'}
        </button>
      </div>
    </div>
  );
}
