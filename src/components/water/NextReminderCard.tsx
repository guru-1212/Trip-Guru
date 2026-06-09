'use client';

import { Bell, Droplets } from 'lucide-react';
import type { NextReminderInfo } from '@/types/water';
import { formatMl, formatTimeDisplay } from '@/lib/water/waterUtils';
import { cn } from '@/lib/utils';

interface NextReminderCardProps {
  nextReminder: NextReminderInfo;
  className?: string;
}

export function NextReminderCard({ nextReminder, className }: NextReminderCardProps) {
  const { slot, minutesUntil } = nextReminder;

  if (!slot) {
    return (
      <div
        className={cn(
          'ft-card ft-card-padded flex items-center gap-3 border border-border/50',
          className
        )}
      >
        <Droplets className="h-8 w-8 text-[hsl(var(--water))]" aria-hidden="true" />
        <div>
          <p className="font-semibold">All reminders done for today</p>
          <p className="text-sm text-muted-foreground">Great job staying hydrated!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'ft-card ft-card-padded border border-[hsl(var(--water)/0.3)] bg-[hsl(var(--water)/0.06)]',
        className
      )}
      aria-label={`Next reminder at ${formatTimeDisplay(slot.time)}: ${slot.note}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-[hsl(var(--water)/0.15)] p-2.5">
          <Bell className="h-5 w-5 text-[hsl(var(--water))]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Next reminder
          </p>
          <p className="font-bold text-lg mt-0.5">{formatTimeDisplay(slot.time)}</p>
          <p className="text-sm font-medium mt-1">{slot.label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {slot.note} — drink {formatMl(slot.amount)}
          </p>
          {minutesUntil !== null && minutesUntil > 0 && (
            <p className="text-xs text-[hsl(var(--water))] font-medium mt-2">
              in {minutesUntil >= 60 ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m` : `${minutesUntil} min`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
