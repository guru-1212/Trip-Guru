'use client';

import { cn } from '@/lib/utils';

export const FINISH_WORKOUT_PIN = '0000';

interface PinConfirmProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  label?: string;
}

export function PinConfirm({
  value,
  onChange,
  error,
  label = 'Enter PIN to save workout',
}: PinConfirmProps) {
  return (
    <div>
      <label className="ft-label">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className={cn(
          'ft-input text-center tracking-[0.5em] font-bold tabular-nums',
          error && 'border-red-500 focus:border-red-500'
        )}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="••••"
        autoComplete="off"
        aria-invalid={error}
      />
      {error && (
        <p className="text-xs text-red-500 mt-1.5 font-medium">Incorrect PIN. Enter 0000 to save.</p>
      )}
    </div>
  );
}
