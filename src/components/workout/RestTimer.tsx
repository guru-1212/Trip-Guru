'use client';

import { useEffect, useState } from 'react';
import { Timer, X, Plus, Minus } from 'lucide-react';
import { playBeep, notify, formatDuration } from '@/workout/utils';
import { REST_TIMER_OPTIONS } from '@/workout/constants';

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
  onClose 
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
      const now = Date.now();
      const left = Math.ceil((endTime - now) / 1000);
      
      setRemaining(left);
      
      if (left < 0) {
        setOvertime(Math.abs(left));
      } else {
        setOvertime(0);
      }

      // Play "near finish" beeps
      if (soundEnabled && left > 0 && left <= 3 && left !== remaining) {
        playBeep(440, 0.1);
      }

      if (left === 0 && remaining === 1) {
        if (soundEnabled) playBeep(880, 0.5);
        notify('Rest Complete!', 'Time for your next set.');
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endTime, soundEnabled, remaining]);

  if (!endTime) return null;

  const isOvertime = remaining <= 0;

  return (
    <div className="fixed inset-0 bg-[var(--wk-bg)]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--wk-surface)] transition-colors"
      >
        <X className="h-8 w-8 text-[var(--wk-muted)]" />
      </button>

      <div className="space-y-2 mb-12">
        <div className="flex items-center justify-center gap-2 text-[var(--wk-muted)] uppercase tracking-[0.2em] font-bold text-sm">
          <Timer className="h-5 w-5" />
          {isOvertime ? 'Overtime' : 'Resting'}
        </div>
        <h2 className="wk-heading text-lg text-[var(--wk-muted)]">Time to recover</h2>
      </div>

      <div className={`relative flex flex-col items-center justify-center transition-colors duration-500 ${isOvertime ? 'text-[var(--wk-danger)]' : 'text-[var(--wk-text)]'}`}>
        <div className="text-[120px] sm:text-[180px] font-black wk-heading leading-none tabular-nums">
          {isOvertime ? `+${overtime}` : remaining}
        </div>
        <div className="text-xl font-bold uppercase tracking-widest text-[var(--wk-muted)] mt-4">
          Seconds
        </div>
      </div>

      <div className="mt-16 w-full max-w-sm space-y-6">
        <div className="flex flex-wrap justify-center gap-3">
          {REST_TIMER_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onDurationChange(s)}
              className={`px-4 py-2 rounded-xl border-2 font-bold transition-all ${
                defaultSeconds === s
                  ? 'border-[var(--wk-accent)] bg-[var(--wk-accent)] text-white'
                  : 'border-[var(--wk-border)] text-[var(--wk-muted)] hover:border-[var(--wk-muted)]'
              }`}
            >
              {s}s
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onDurationChange(Math.max(5, defaultSeconds - 15))}
            className="flex-1 wk-btn-secondary flex items-center justify-center gap-2 py-4"
          >
            <Minus className="h-5 w-5" /> -15s
          </button>
          <button
            onClick={() => onDurationChange(defaultSeconds + 15)}
            className="flex-1 wk-btn-secondary flex items-center justify-center gap-2 py-4"
          >
            <Plus className="h-5 w-5" /> +15s
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full wk-btn-primary py-5 text-lg shadow-xl shadow-indigo-500/20"
        >
          {isOvertime ? "I'm Ready!" : 'Skip Rest'}
        </button>
      </div>
    </div>
  );
}
