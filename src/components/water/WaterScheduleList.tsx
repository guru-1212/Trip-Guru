'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { ScheduleSlotWithState } from '@/types/water';
import { formatMl, formatTimeDisplay } from '@/lib/water/waterUtils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface WaterScheduleListProps {
  slots: ScheduleSlotWithState[];
  className?: string;
}

export function WaterScheduleList({ slots, className }: WaterScheduleListProps) {
  return (
    <ul className={cn('space-y-2', className)} aria-label="Today's hydration schedule">
      {slots.map((slot) => (
        <li
          key={slot.time}
          className={cn(
            'flex items-start gap-3 rounded-xl p-3 border border-border/50',
            slot.state === 'done' && 'ft-schedule-done',
            slot.state === 'next' && 'ft-schedule-next',
            slot.state === 'upcoming' && 'ft-schedule-upcoming'
          )}
        >
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {slot.state === 'done' ? (
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--pace-ahead))]" />
            ) : slot.state === 'next' ? (
              <Clock className="h-5 w-5 text-[hsl(var(--water))]" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{formatTimeDisplay(slot.time)}</span>
              <span className="text-sm text-muted-foreground">{slot.label}</span>
              {slot.state === 'next' && (
                <Badge variant="default" className="text-xs bg-[hsl(var(--water))] text-white">
                  Next
                </Badge>
              )}
              {slot.state === 'done' && (
                <Badge variant="secondary" className="text-xs">
                  Done
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {slot.note} — {formatMl(slot.amount)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
