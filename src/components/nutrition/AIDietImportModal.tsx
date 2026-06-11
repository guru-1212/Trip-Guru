'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, AlertTriangle } from 'lucide-react';
import { formatQuantityDisplay } from '@/lib/nutrition/dietImportParser';
import type { DietImportStep, DietMatchResult } from '@/types/dietImport';
import { MEAL_SLOT_LABELS } from '@/types/nutrition';

interface AIDietImportModalProps {
  open: boolean;
  step: DietImportStep;
  progressValue: number;
  pastedText: string;
  matchedFoods: DietMatchResult[];
  errorMessage: string | null;
  dateLabel: string;
  onPastedTextChange: (value: string) => void;
  onClose: () => void;
  onCopyPrompt: () => void;
  onProcess: () => void;
  onBack: () => void;
  onConfirm: () => void;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AIDietImportModal({
  open,
  step,
  progressValue,
  pastedText,
  matchedFoods,
  errorMessage,
  dateLabel,
  onPastedTextChange,
  onClose,
  onCopyPrompt,
  onProcess,
  onBack,
  onConfirm,
}: AIDietImportModalProps) {
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
        aria-labelledby="ai-diet-import-title"
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
            <div className="min-w-0">
              <h2 id="ai-diet-import-title" className="ft-title">
                Import AI Diet Log
              </h2>
              <p className="text-xs text-muted-foreground truncate">{dateLabel}</p>
            </div>
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
              placeholder="Paste your AI-generated diet JSON here..."
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
            <p className="text-sm font-medium text-foreground">Analysing your diet log...</p>
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
              placeholder="Paste your AI-generated diet JSON here..."
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
              {matchedFoods.map((item) => (
                <div
                  key={`${item.imported.foodName}-${item.imported.mealSlot}-${item.imported.quantity.amount}`}
                  className="ft-card ft-card-padded space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground">{item.imported.foodName}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted shrink-0">
                      {MEAL_SLOT_LABELS[item.imported.mealSlot]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatQuantityDisplay(item.imported.quantity)}
                    {item.imported.servings !== 1 && (
                      <span> · {item.imported.servings}×</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {item.imported.nutrients.calories} kcal · {item.imported.nutrients.proteinG}g P
                    · {item.imported.nutrients.carbsG}g C · {item.imported.nutrients.fatG}g F
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      item.matched
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {item.matched ? 'Library match' : 'Custom entry'}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onBack} className="ft-btn ft-btn--secondary flex-1">
                Back
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!matchedFoods.length}
                className="ft-btn ft-btn--primary flex-1"
              >
                Confirm &amp; Log to {dateLabel}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
