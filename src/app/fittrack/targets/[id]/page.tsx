'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { ArrowLeft, Pause, Play, Trash2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TargetRing } from '@/components/targets/TargetRing';
import { TargetProgressChart } from '@/components/targets/TargetProgressChart';
import { TargetProjectionLine } from '@/components/targets/TargetProjectionLine';
import { TargetSetLogger } from '@/components/targets/TargetSetLogger';
import { BaselineTestCard } from '@/components/targets/BaselineTestCard';
import { CountRepsButton } from '@/components/targets/CountRepsButton';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { useTargetLogger, useTargetSummary, todayKey } from '@/hooks/useTargets';
import {
  attemptsForTarget,
  describeSessionKind,
  formatAttemptSets,
  summarizeAttempt,
} from '@/workout/targets';
import type { Target } from '@/workout/targets';

function TodaysSession({ target }: { target: Target }) {
  const logger = useTargetLogger(target, todayKey());
  if (!logger.livePrescription) return null;

  return (
    <section className="ft-card ft-card-padded">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="ft-title text-base">Today</h2>
        <span className="ft-badge ft-badge--primary">
          {describeSessionKind(logger.livePrescription.kind)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{logger.livePrescription.coachNote}</p>
      <TargetSetLogger target={target} logger={logger} />
    </section>
  );
}

export default function TargetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const summary = useTargetSummary(params.id);
  const { targetAttempts, updateTarget, deleteTarget, hydrated } = useWorkoutStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const attempts = useMemo(
    () => (summary ? attemptsForTarget(summary.target.id, targetAttempts) : []),
    [summary, targetAttempts]
  );

  if (!hydrated) return <LoadingSpinner label="Loading target…" />;

  if (!summary) {
    return (
      <div className="space-y-4">
        <button type="button" className="ft-btn ft-btn--ghost" onClick={() => router.push('/fittrack/targets')}>
          <ArrowLeft className="h-4 w-4" />
          Targets
        </button>
        <p className="text-sm text-muted-foreground">That target no longer exists.</p>
      </div>
    );
  }

  const { target, currentBest, exerciseName, needsBaseline, nextDate, projection } = summary;
  const isActive = target.status === 'active';

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="ft-btn ft-btn--ghost ft-btn--sm"
        onClick={() => router.push('/fittrack/targets')}
      >
        <ArrowLeft className="h-4 w-4" />
        Targets
      </button>

      <section className="ft-card ft-card-padded">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <TargetRing
            current={currentBest}
            goal={target.goalValue}
            unit={target.unit}
            size={160}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="ft-title text-lg">{target.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {exerciseName}
              {target.variation ? ` · ${target.variation}` : ''} ·{' '}
              {target.trainingDays.join(' & ')}
            </p>
            <div className="mt-3">
              <TargetProjectionLine target={target} projection={projection} />
            </div>
            {target.status === 'achieved' && target.achievedDate && (
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold ft-pace-ahead mt-3">
                <Trophy className="h-4 w-4" />
                Achieved {dayjs(target.achievedDate).format('D MMM YYYY')}
              </p>
            )}
          </div>
        </div>
      </section>

      {needsBaseline && isActive && <BaselineTestCard target={target} />}

      {!needsBaseline && isActive && <TodaysSession target={target} />}

      {!needsBaseline && isActive && !summary.prescription && (
        <section className="ft-card ft-card-padded">
          <h2 className="ft-title text-base mb-1">Not a training day</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {nextDate
              ? `Next session ${dayjs(nextDate).format('dddd D MMM')} — the rest until then is part of the plan.`
              : 'No sessions scheduled.'}{' '}
            You can still knock out a set; it is logged as extra volume and will not touch your
            programmed numbers.
          </p>
          <CountRepsButton
            target={target}
            ghost={currentBest}
            allTimeBest={currentBest}
          />
        </section>
      )}

      <section className="ft-card ft-card-padded">
        <h2 className="ft-title text-base mb-3">Progress</h2>
        <TargetProgressChart target={target} attempts={targetAttempts} />
      </section>

      <section className="ft-card ft-card-padded">
        <h2 className="ft-title text-base mb-3">Sessions</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {attempts
              .slice()
              .reverse()
              .map((attempt, i) => {
                const sessionNumber = attempts.length - i;
                const previous = attempts[sessionNumber - 2];
                return (
                  <li
                    key={attempt.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {summarizeAttempt(
                          target,
                          attempt,
                          sessionNumber,
                          previous?.topSet ?? target.baseline ?? 0
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayjs(attempt.date).format('ddd D MMM')} ·{' '}
                        {describeSessionKind(attempt.kind)} ·{' '}
                        {formatAttemptSets(attempt, target.unit)}
                      </p>
                    </div>
                    {attempt.isPR && (
                      <span className="ft-badge ft-badge--warning shrink-0">PR</span>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="ft-card ft-card-padded space-y-3">
        <h2 className="ft-title text-base">Settings</h2>

        {target.status !== 'achieved' && (
          <button
            type="button"
            className="ft-btn ft-btn--secondary ft-btn--block"
            onClick={() =>
              updateTarget(target.id, { status: isActive ? 'paused' : 'active' })
            }
          >
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? 'Pause this target' : 'Resume this target'}
          </button>
        )}

        <button
          type="button"
          className={cn('ft-btn ft-btn--block', confirmDelete ? 'ft-btn--danger' : 'ft-btn--ghost')}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            deleteTarget(target.id);
            router.push('/fittrack/targets');
          }}
        >
          <Trash2 className="h-4 w-4" />
          {confirmDelete ? 'Tap again to delete everything' : 'Delete target'}
        </button>
      </section>
    </div>
  );
}
