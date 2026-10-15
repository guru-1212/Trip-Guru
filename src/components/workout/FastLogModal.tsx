'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Zap, X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { SPLIT_NAMES } from '@/workout/constants';
import { buildFastLogSession, formatExerciseSetsSummary, formatWeight, getFastLogCandidates } from '@/workout/utils';
import type { SplitId, WeightUnit, WorkoutSession } from '@/workout/types';
import { cn } from '@/lib/utils';

interface FastLogModalProps {
  open: boolean;
  workouts: WorkoutSession[];
  /** Split picked on the workout page; its past sessions are shown first. */
  preferredSplit: SplitId | null;
  unit: WeightUnit;
  /** Log on this date only (calendar day); hides the date picker. */
  fixedDate?: string;
  onClose: () => void;
  onLog: (source: WorkoutSession, date: string) => void;
}

const MAX_SESSIONS = 20;

export function FastLogModal({
  open,
  workouts,
  preferredSplit,
  unit,
  fixedDate,
  onClose,
  onLog,
}: FastLogModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const today = dayjs().format('YYYY-MM-DD');

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [date, setDate] = useState(fixedDate ?? today);
  const [allSplits, setAllSplits] = useState(false);

  // Only sessions that still have completed sets can be cloned.
  const loggable = useMemo(() => getFastLogCandidates(workouts), [workouts]);

  const hasPreferred = preferredSplit !== null && loggable.some((w) => w.splitId === preferredSplit);
  const filterBySplit = hasPreferred && !allSplits;
  const visible = useMemo(
    () =>
      (filterBySplit ? loggable.filter((w) => w.splitId === preferredSplit) : loggable).slice(
        0,
        MAX_SESSIONS
      ),
    [loggable, filterBySplit, preferredSplit]
  );

  // Preselect the latest session every time the dialog opens, so one tap on
  // "Log workout" repeats the last workout for today.
  useEffect(() => {
    if (!open) return;
    setDate(fixedDate ?? dayjs().format('YYYY-MM-DD'));
    setAllSplits(false);
    const latest =
      loggable.find((w) => w.splitId === preferredSplit) ?? loggable[0] ?? null;
    setSourceId(latest?.id ?? null);
    // Re-seed on open only; later workout changes must not reset the user's pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useDialogFocus(open, modalRef, onClose);

  if (!open) return null;

  const source = loggable.find((w) => w.id === sourceId) ?? null;
  const preview = source ? buildFastLogSession(source, date) : null;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
  const alreadyLogged =
    !!source && workouts.some((w) => w.date === date && w.splitId === source.splitId);

  return (
    <div
      ref={backdropRef}
      className="ft-overlay"
      style={{ zIndex: 110 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fast-log-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="ft-modal ft-modal-lg w-full max-w-lg space-y-5 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="fast-log-title" className="ft-title">
                Fast Log
              </h2>
              <p className="text-sm text-muted-foreground">
                Repeat a past workout with all its sets and weights.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ft-btn ft-btn--ghost ft-btn--icon" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loggable.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-6 text-center">
            No past workouts with logged sets yet. Finish one workout the normal way first, then Fast Log can
            repeat it.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="ft-label !mb-0">Copy from</p>
                {preferredSplit && (hasPreferred || allSplits) && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setAllSplits((v) => !v)}
                  >
                    {allSplits ? `Only ${SPLIT_NAMES[preferredSplit]}` : 'Show all splits'}
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1" role="radiogroup" aria-label="Past workouts">
                {visible.map((w) => {
                  const selected = w.id === sourceId;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setSourceId(w.id)}
                      className={cn(
                        'w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors',
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {dayjs(w.date).format('ddd, MMM D, YYYY')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {w.splitName} · {w.exercises.length} exercises · {w.totalSets} sets ·{' '}
                          {formatWeight(w.totalVolume, unit)}
                        </p>
                      </div>
                      {selected && (
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {preview && (
              <div className="rounded-xl bg-muted/30 px-4 py-3 space-y-1.5 max-h-40 overflow-y-auto">
                {preview.exercises.map((ex) => (
                  <div
                    key={`${ex.exerciseId}::${ex.variation}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="font-medium text-foreground truncate">{ex.name}</span>
                    <span className="text-muted-foreground tabular-nums text-right shrink-0 max-w-[55%]">
                      {formatExerciseSetsSummary(ex, unit)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              {fixedDate ? (
                <p className="text-sm text-muted-foreground">
                  Logging on{' '}
                  <span className="font-semibold text-foreground">
                    {dayjs(fixedDate).format('dddd, MMM D, YYYY')}
                  </span>
                </p>
              ) : (
                <>
                  <label htmlFor="fast-log-date" className="ft-label">
                    Log on date
                  </label>
                  <input
                    id="fast-log-date"
                    type="date"
                    className="ft-input"
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </>
              )}
              {alreadyLogged && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {source?.splitName} is already logged on {dayjs(date).format('MMM D')}. Logging again adds a
                  second session.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="ft-btn ft-btn--secondary flex-1">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => source && onLog(source, date)}
                disabled={!source || !dateValid}
                className="ft-btn ft-btn--primary flex-1"
              >
                <Zap className="h-4 w-4" />
                Log workout
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
