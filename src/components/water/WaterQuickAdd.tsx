'use client';

import { formatMl } from '@/lib/water/waterUtils';
import { cn } from '@/lib/utils';

const QUICK_AMOUNTS = [150, 250, 500, 750] as const;

interface WaterQuickAddProps {
  onAdd: (amount: number) => void | Promise<void>;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function WaterQuickAdd({ onAdd, disabled, compact, className }: WaterQuickAddProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-2', className)}>
      {QUICK_AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={disabled}
          onClick={() => void onAdd(amount)}
          className={cn(
            'ft-water-quick-btn',
            compact && 'py-2 px-3 text-sm'
          )}
          aria-label={`Add ${formatMl(amount)} of water`}
        >
          +{formatMl(amount)}
        </button>
      ))}
    </div>
  );
}
