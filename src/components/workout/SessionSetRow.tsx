'use client';

import { useState } from 'react';
import { Minus, Plus, Check, ScanLine, Trash2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { displayWeight } from '@/workout/utils';
import { specForExercise } from '@/workout/poseExerciseSpecs';
import type { WorkoutSet, WeightUnit } from '@/workout/types';
import { PoseRepCounterModal } from './PoseRepCounterModal';

const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

interface SessionSetRowProps {
  index: number;
  set: WorkoutSet;
  unit: WeightUnit;
  isPR?: boolean;
  onWeightChange: (displayValue: number) => void;
  onRepsChange: (reps: number) => void;
  onToggleDone: () => void;
  onRemove: () => void;
  onUnitChange?: (unit: WeightUnit) => void;
  /**
   * Identifies the movement so the camera counter knows which joint to watch.
   * Optional: without it the row behaves exactly as it always has, which is
   * what keeps the other callers of this component unchanged.
   */
  exerciseId?: string;
  exerciseName?: string;
  /** Reps on this set last session, shown in the counter as the number to beat. */
  lastReps?: number | null;
}

function Stepper({
  label,
  value,
  step,
  inputMode,
  onDecrement,
  onIncrement,
  onInput,
}: {
  label: string;
  value: number | string;
  step?: number;
  inputMode?: 'numeric' | 'decimal';
  onDecrement: () => void;
  onIncrement: () => void;
  onInput: (raw: string) => void;
}) {
  return (
    <div className="ft-set-field">
      <span className="ft-set-field-label">{label}</span>
      <div className="ft-stepper">
        <button type="button" className="ft-stepper-btn" onClick={onDecrement} aria-label={`Decrease ${label}`}>
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode={inputMode}
          step={step}
          className="ft-stepper-value"
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={(e) => onInput(e.target.value)}
        />
        <button type="button" className="ft-stepper-btn" onClick={onIncrement} aria-label={`Increase ${label}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SessionSetRow({
  index,
  set,
  unit,
  isPR,
  onWeightChange,
  onRepsChange,
  onToggleDone,
  onRemove,
  onUnitChange,
  exerciseId,
  exerciseName,
  lastReps = null,
}: SessionSetRowProps) {
  const displayVal = displayWeight(set.weight, unit);
  const weightStep = WEIGHT_STEP[unit];
  const showReadyRing = !set.done && displayVal > 0 && set.reps > 0;

  const [counting, setCounting] = useState(false);
  const poseSpec = specForExercise(exerciseId, exerciseName);
  // Offered only while the set is still open: re-counting a logged set would
  // silently rewrite history.
  const canAutoCount = poseSpec !== null && !set.done;

  const logSetButton = (
    <button
      type="button"
      onClick={onToggleDone}
      className={cn(
        'ft-btn ft-btn--block ft-btn--lg ft-log-set-btn',
        set.done ? 'ft-btn--primary' : 'ft-btn--ghost'
      )}
    >
      <Check className="h-4 w-4" />
      {set.done ? 'Completed' : 'Log Set'}
    </button>
  );

  const adjustWeight = (dir: 1 | -1) => {
    const next = Math.max(0, Math.round((displayVal + dir * weightStep) * 10) / 10);
    onWeightChange(next);
  };

  return (
    <div className={cn('ft-set-card', set.done && 'ft-set-card--done')}>
      <div className="ft-set-header">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn('ft-set-num', set.done && 'ft-set-num--done')}>{index + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Set {index + 1}</p>
            {displayVal > 0 && set.reps > 0 && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {displayVal} {unit} × {set.reps}
              </p>
            )}
          </div>
          {isPR && set.done && (
            <span className="ft-badge ft-badge--warning">
              <Trophy className="h-3 w-3" />
              PR
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="ft-btn ft-btn--ghost ft-btn--icon ft-btn--sm !min-h-[36px] !min-w-[36px] text-muted-foreground hover:!text-red-500 hover:!border-red-200"
          aria-label={`Remove set ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="ft-set-fields">
        <div className="ft-set-field">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="ft-set-field-label mb-0">Weight</span>
            {onUnitChange && (
              <select
                className="ft-set-unit-select"
                value={unit}
                onChange={(e) => onUnitChange(e.target.value as WeightUnit)}
                aria-label="Weight unit"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            )}
          </div>
          <div className="ft-stepper">
            <button
              type="button"
              className="ft-stepper-btn"
              onClick={() => adjustWeight(-1)}
              aria-label="Decrease weight"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              inputMode="decimal"
              step={weightStep}
              className="ft-stepper-value"
              value={displayVal === 0 ? '' : displayVal}
              placeholder="0"
              onChange={(e) => onWeightChange(parseFloat(e.target.value) || 0)}
            />
            <button
              type="button"
              className="ft-stepper-btn"
              onClick={() => adjustWeight(1)}
              aria-label="Increase weight"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Stepper
          label="Reps"
          value={set.reps}
          onDecrement={() => onRepsChange(Math.max(0, set.reps - 1))}
          onIncrement={() => onRepsChange(set.reps + 1)}
          onInput={(raw) => onRepsChange(parseInt(raw, 10) || 0)}
        />
      </div>

      {canAutoCount && (
        <button
          type="button"
          onClick={() => setCounting(true)}
          className="ft-btn ft-btn--ghost ft-btn--block ft-btn--sm mt-2"
        >
          <ScanLine className="h-4 w-4" />
          Auto-count reps
        </button>
      )}

      <div className="ft-set-action">
        {showReadyRing ? (
          <div className="ft-log-set-wrap ft-log-set-wrap--ready">{logSetButton}</div>
        ) : (
          logSetButton
        )}
      </div>

      {canAutoCount && (
        <PoseRepCounterModal
          open={counting}
          onOpenChange={setCounting}
          spec={poseSpec}
          exerciseName={exerciseName ?? 'This exercise'}
          ghost={lastReps}
          onConfirm={(count) => {
            // Fills the field rather than logging the set: the number still
            // has to be looked at, and the weight is usually not filled in yet.
            if (count > 0) onRepsChange(count);
          }}
        />
      )}
    </div>
  );
}
