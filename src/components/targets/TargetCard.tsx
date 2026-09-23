'use client';

import Link from 'next/link';
import dayjs from 'dayjs';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describeSessionKind, formatTargetValue } from '@/workout/targets';
import type { TargetSummary } from '@/hooks/useTargets';
import { TargetRing } from './TargetRing';
import { TargetProjectionLine } from './TargetProjectionLine';

interface TargetCardProps {
  summary: TargetSummary;
  className?: string;
}

function nextUpLabel(summary: TargetSummary): string {
  if (summary.needsBaseline) return 'Baseline test needed';
  if (summary.target.status === 'achieved') return 'Achieved';
  if (summary.target.status === 'paused') return 'Paused';
  if (summary.prescription) {
    return summary.todayAttempt
      ? `Today · ${describeSessionKind(summary.prescription.kind)} logged`
      : `Today · ${describeSessionKind(summary.prescription.kind)}`;
  }
  if (summary.nextDate) return `Next: ${dayjs(summary.nextDate).format('ddd D MMM')}`;
  return 'No sessions scheduled';
}

export function TargetCard({ summary, className }: TargetCardProps) {
  const { target, currentBest, exerciseName } = summary;

  return (
    <Link
      href={`/fittrack/targets/${target.id}`}
      className={cn('ft-card ft-card-padded ft-card-interactive block', className)}
    >
      <div className="flex items-center gap-4">
        <TargetRing
          current={currentBest}
          goal={target.goalValue}
          unit={target.unit}
          size={96}
          className="shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3 className="ft-title text-base truncate">{target.name}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {exerciseName}
            {target.variation ? ` · ${target.variation}` : ''} ·{' '}
            {formatTargetValue(currentBest, target.unit)} best
          </p>
          <p className="text-xs font-medium text-primary mt-2">{nextUpLabel(summary)}</p>
          <TargetProjectionLine
            target={target}
            projection={summary.projection}
            className="mt-2"
          />
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
      </div>
    </Link>
  );
}
