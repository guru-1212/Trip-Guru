'use client';

import { useState } from 'react';
import { formatMl } from '@/lib/water/waterUtils';
import { cn } from '@/lib/utils';
import { Plus, X, Check } from 'lucide-react';

const QUICK_AMOUNTS = [150, 250, 500, 750] as const;

interface WaterQuickAddProps {
  onAdd: (amount: number) => void | Promise<void>;
  suggestedAmounts?: number[];
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export function WaterQuickAdd({ 
  onAdd, 
  suggestedAmounts, 
  disabled, 
  compact, 
  className 
}: WaterQuickAddProps) {
  const [isManual, setIsManual] = useState(false);
  const [manualAmount, setManualAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const amounts = suggestedAmounts && suggestedAmounts.length > 0 
    ? suggestedAmounts 
    : QUICK_AMOUNTS;

  const handleManualSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const amount = parseInt(manualAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    try {
      await onAdd(amount);
      setManualAmount('');
      setIsManual(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (isManual) {
    return (
      <form 
        onSubmit={handleManualSubmit}
        className={cn('flex items-center gap-2 w-full', className)}
      >
        <div className="relative flex-1 group">
          <input
            autoFocus
            type="number"
            min="10"
            max="3000"
            step="10"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            placeholder="Amount (ml)"
            className={cn(
              'ft-input py-2 pr-10 focus:ring-[hsl(var(--water))] focus:border-[hsl(var(--water))] transition-all',
              compact && 'py-1.5 text-sm'
            )}
            disabled={disabled || submitting}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground group-focus-within:text-[hsl(var(--water))]">
            ml
          </span>
        </div>
        <button
          type="submit"
          disabled={disabled || submitting || !manualAmount}
          className={cn(
            'p-2 rounded-lg bg-[hsl(var(--water))] text-white hover:bg-[hsl(var(--water)/0.9)] disabled:opacity-50 transition-colors',
            compact && 'p-1.5'
          )}
          aria-label="Confirm custom amount"
        >
          <Check className={cn('h-5 w-5', compact && 'h-4 w-4')} />
        </button>
        <button
          type="button"
          onClick={() => setIsManual(false)}
          disabled={disabled || submitting}
          className={cn(
            'p-2 rounded-lg border border-input bg-background hover:bg-accent text-muted-foreground transition-colors',
            compact && 'p-1.5'
          )}
          aria-label="Cancel custom amount"
        >
          <X className={cn('h-5 w-5', compact && 'h-4 w-4')} />
        </button>
      </form>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2', className)}>
      {amounts.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={disabled}
          onClick={() => void onAdd(amount)}
          className={cn(
            'ft-water-quick-btn transition-transform active:scale-95',
            compact && 'py-2 px-3 text-sm'
          )}
          aria-label={`Add ${formatMl(amount)} of water`}
        >
          +{formatMl(amount)}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsManual(true)}
        className={cn(
          'ft-water-quick-btn bg-transparent border-dashed border-muted-foreground/30 hover:bg-accent/50 text-muted-foreground transition-all hover:border-[hsl(var(--water)/0.5)] hover:text-[hsl(var(--water))]',
          compact && 'py-2 px-3 text-sm'
        )}
        aria-label="Add manual amount"
      >
        <Plus className={cn('h-4 w-4 inline mr-1', compact && 'h-3.5 w-3.5')} />
        Manual
      </button>
    </div>
  );
}
