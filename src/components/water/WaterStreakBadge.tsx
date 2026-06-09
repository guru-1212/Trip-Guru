'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WaterStreakBadgeProps {
  streak: number;
  className?: string;
}

export function WaterStreakBadge({ streak, className }: WaterStreakBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-3',
        className
      )}
      aria-label={`${streak} day hydration streak`}
    >
      <Flame
        className={cn(
          'h-5 w-5',
          streak > 0 ? 'text-[hsl(var(--pace-ahead))]' : 'text-muted-foreground'
        )}
        aria-hidden="true"
      />
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{streak}</p>
        <p className="text-xs text-muted-foreground mt-0.5">day streak</p>
      </div>
    </div>
  );
}
