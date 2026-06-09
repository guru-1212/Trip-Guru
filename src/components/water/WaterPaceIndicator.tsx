'use client';

import type { PaceStatus } from '@/types/water';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface WaterPaceIndicatorProps {
  status: PaceStatus;
  className?: string;
}

const LABELS: Record<PaceStatus, string> = {
  ahead: 'Ahead of pace',
  on_track: 'On track',
  behind: 'Behind pace — catch up!',
};

const ICONS: Record<PaceStatus, typeof TrendingUp> = {
  ahead: TrendingUp,
  on_track: Minus,
  behind: TrendingDown,
};

const STATUS_CLASS: Record<PaceStatus, string> = {
  ahead: 'ft-pace-ahead',
  on_track: 'ft-pace-on-track',
  behind: 'ft-pace-behind',
};

export function WaterPaceIndicator({ status, className }: WaterPaceIndicatorProps) {
  const Icon = ICONS[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        STATUS_CLASS[status],
        className
      )}
      role="status"
      aria-label={`Hydration pace: ${LABELS[status]}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {LABELS[status]}
    </div>
  );
}
