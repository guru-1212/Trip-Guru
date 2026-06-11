'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, AlertTriangle } from 'lucide-react';
import type { MatchResult } from '@/types/aiImport';
import type { AIImportStep } from '@/types/aiImport';
import { formatWeight } from '@/workout/utils';
import type { WeightUnit } from '@/workout/types';

interface AIImportModalProps {
  open: boolean;
  step: AIImportStep;
  progressValue: number;
  pastedText: string;
  matchedExercises: MatchResult[];
  errorMessage: string | null;
  weightUnit: WeightUnit;
  onPastedTextChange: (value: string) => void;
  onClose: () => void;
  onCopyPrompt: () => void;
  onProcess: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AIImportModal({
  open,
  step,
  progressValue,
  pastedText,
  matchedExercises,
  errorMessage,
  weightUnit,
  onPastedTextChange,
  onClose,
  onCopyPrompt,
  onProcess,
  onBack,
  onConfirm,
}: AIImportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const focusFirst = () => {
      const root = modalRef.current;
      if (!root) return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      (focusable[0] ?? root).focus();
    };
    focusFirst();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose, step]);

  if (!open) return null;

  const confirmed = matchedExercises.filter((m) => m.matched);
  const skipped = matchedExercises.filter((m) => !m.matched);

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
        aria-labelledby="ai-import-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="ft-modal ft-modal-lg w-full max-w-lg space-y-5 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 id="ai-import-title" className="ft-title">
              Import AI Workout
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {step === 'paste' && (
              <button
                type="button"
                onClick={onCopyPrompt}
                className="ft-btn ft-btn--secondary ft-btn--sm whitespace-nowrap"
              >
                Copy Prompt ✨
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ft-btn ft-btn--ghost ft-btn--icon"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {step === 'paste' && (
          <>
            <textarea
              className="ft-input min-h-[220px] resize-y text-sm leading-relaxed"
              placeholder="Paste your AI-generated workout here..."
              value={pastedText}
              onChange={(e) => onPastedTextChange(e.target.value)}
            />
            {errorMessage && (
              <p className="text-sm text-red-500 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {errorMessage}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="ft-btn ft-btn--secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={onProcess} className="ft-btn ft-btn--primary flex-1">
                Process
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium text-foreground">Analysing your routine...</p>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-[1500ms] ease-out"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        )}

        {step === 'error' && (
          <>
            <textarea
              className="ft-input min-h-[220px] resize-y text-sm leading-relaxed"
              placeholder="Paste your AI-generated workout here..."
              value={pastedText}
              onChange={(e) => onPastedTextChange(e.target.value)}
            />
            <p className="text-sm text-red-500 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {errorMessage}
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="ft-btn ft-btn--secondary flex-1">
                Cancel
              </button>
              <button type="button" onClick={onProcess} className="ft-btn ft-btn--primary flex-1">
                Process
              </button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {confirmed.map((item) => (
                <div key={item.imported.exerciseName} className="ft-card ft-card-padded space-y-1">
                  <p className="font-semibold text-foreground">{item.imported.exerciseName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.imported.sets} sets × {item.imported.reps} reps ·{' '}
                    {formatWeight(item.imported.weight, weightUnit)}
                  </p>
                  {item.imported.notes && (
                    <p className="text-xs text-muted-foreground">{item.imported.notes}</p>
                  )}
                </div>
              ))}
              {skipped.map((item) => (
                <p key={item.imported.exerciseName} className="text-sm text-amber-600 dark:text-amber-400">
                  {item.warning}
                </p>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onBack} className="ft-btn ft-btn--secondary flex-1">
                Back
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!confirmed.length}
                className="ft-btn ft-btn--primary flex-1"
              >
                Confirm &amp; Add to Today&apos;s Workout
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
