'use client';

import { useState } from 'react';
import { ClipboardCheck, Plus, Target as TargetIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TargetCard } from '@/components/targets/TargetCard';
import { CreateTargetSheet } from '@/components/targets/CreateTargetSheet';
import { QuickLogDialog } from '@/components/targets/QuickLogDialog';
import { useTargets } from '@/hooks/useTargets';
import type { Target } from '@/workout/targets';

export default function TargetsPage() {
  const { summaries, active, hydrated } = useTargets();
  const [creating, setCreating] = useState(false);
  const [quickLog, setQuickLog] = useState<Target | null>(null);

  const done = summaries.filter((s) => s.target.status !== 'active');

  if (!hydrated) return <LoadingSpinner label="Loading targets…" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="ft-title-lg">Targets</h1>
          <p className="ft-subtitle">One number to chase, and a plan to get there.</p>
        </div>
        {summaries.length > 0 && (
          <button
            type="button"
            className="ft-btn ft-btn--primary"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        )}
      </div>

      {summaries.length === 0 ? (
        <EmptyState
          icon={TargetIcon}
          title="No targets yet"
          description="Pick a movement and a number — 100 non-stop push-ups, a 3 minute plank — and the app will test your baseline, prescribe every session and track the climb."
          actionLabel="Create your first target"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="space-y-4">
          {active.map((summary) => (
            <div key={summary.target.id} className="space-y-2">
              <TargetCard summary={summary} />
              {summary.prescription && !summary.needsBaseline && (
                <button
                  type="button"
                  className="ft-btn ft-btn--secondary ft-btn--block ft-btn--sm"
                  onClick={() => setQuickLog(summary.target)}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {summary.todayAttempt ? 'Update today' : 'Log today'}
                </button>
              )}
            </div>
          ))}

          {done.length > 0 && (
            <>
              <h2 className="ft-section-title pt-2">Finished</h2>
              {done.map((summary) => (
                <TargetCard key={summary.target.id} summary={summary} className="opacity-75" />
              ))}
            </>
          )}
        </div>
      )}

      <CreateTargetSheet open={creating} onOpenChange={setCreating} />
      <QuickLogDialog
        target={quickLog}
        open={quickLog !== null}
        onOpenChange={(o) => !o && setQuickLog(null)}
      />
    </div>
  );
}
