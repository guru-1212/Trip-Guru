'use client';

import { Trash2 } from 'lucide-react';
import type { WaterIntakeEntry } from '@/types/water';
import { formatMl, getIntakeTimeDisplay } from '@/lib/water/waterUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WaterIntakeLogProps {
  intakes: WaterIntakeEntry[];
  timezone: string;
  onRemove: (id: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function WaterIntakeLog({
  intakes,
  timezone,
  onRemove,
  disabled,
  className,
}: WaterIntakeLogProps) {
  const sorted = [...intakes].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-6', className)}>
        No intake logged yet today. Tap a quick-add button to start.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-2', className)} aria-label="Today's water intake log">
      {sorted.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2.5"
        >
          <div className="min-w-0">
            <span className="font-semibold text-sm">{formatMl(entry.amount)}</span>
            <span className="text-muted-foreground text-sm ml-2">
              {getIntakeTimeDisplay(entry.time, timezone)}
            </span>
            {entry.note && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.note}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => void onRemove(entry.id)}
            aria-label={`Remove ${formatMl(entry.amount)} intake from ${getIntakeTimeDisplay(entry.time, timezone)}`}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
