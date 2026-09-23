'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import { DAY_KEYS } from '@/workout/constants';
import { generateId } from '@/workout/utils';
import {
  DEFAULT_TARGET_SCHEME,
  MAX_EFFORT_TARGET_SCHEME,
  createTarget,
} from '@/workout/targets';
import type { TargetUnit } from '@/workout/targets';
import type { DayKey } from '@/workout/types';

interface CreateTargetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

/** Holds rather than reps — the unit follows the movement, not the user's choice. */
const HOLD_EXERCISE_IDS = new Set(['plank']);

export function CreateTargetSheet({ open, onOpenChange, onCreated }: CreateTargetSheetProps) {
  const { customExercises, addTarget } = useWorkoutStore();

  const [exerciseId, setExerciseId] = useState('push-ups');
  const [variation, setVariation] = useState('');
  const [goalValue, setGoalValue] = useState('100');
  const [targetDate, setTargetDate] = useState('');
  const [trainingDays, setTrainingDays] = useState<DayKey[]>(['Mon', 'Thu']);
  const [testEveryDay, setTestEveryDay] = useState(false);

  const exercises = useMemo(
    () =>
      [
        ...EXERCISE_LIBRARY.map((e) => ({ id: e.id, name: e.name, variations: e.variations })),
        ...customExercises.map((e) => ({ id: e.id, name: e.name, variations: e.variations })),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [customExercises]
  );

  const selected = exercises.find((e) => e.id === exerciseId);
  const unit: TargetUnit = HOLD_EXERCISE_IDS.has(exerciseId) ? 'seconds' : 'reps';
  const noun = unit === 'seconds' ? 'seconds' : 'reps';
  const goal = Number(goalValue);
  const valid = selected && Number.isFinite(goal) && goal > 0 && trainingDays.length > 0;

  const toggleDay = (day: DayKey) => {
    setTrainingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreate = () => {
    if (!valid || !selected) return;
    const id = generateId();
    addTarget(
      createTarget({
        id,
        name: `${goal} ${unit === 'seconds' ? 'second' : 'non-stop'} ${selected.name.toLowerCase()}`,
        exerciseId,
        variation: variation || undefined,
        unit,
        goalValue: goal,
        startDate: dayjs().format('YYYY-MM-DD'),
        targetDate: targetDate || null,
        trainingDays,
        scheme: testEveryDay ? MAX_EFFORT_TARGET_SCHEME : DEFAULT_TARGET_SCHEME,
      })
    );
    onOpenChange(false);
    onCreated?.(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New target</DialogTitle>
          <DialogDescription>
            Pick a movement and a number. You will log a baseline first, then the coach builds
            every session from there.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="ft-label" htmlFor="target-exercise">
              Exercise
            </label>
            <select
              id="target-exercise"
              className="ft-select w-full"
              value={exerciseId}
              onChange={(e) => {
                setExerciseId(e.target.value);
                setVariation('');
              }}
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {selected && selected.variations.length > 0 && (
            <div>
              <label className="ft-label" htmlFor="target-variation">
                Variation (optional)
              </label>
              <select
                id="target-variation"
                className="ft-select w-full"
                value={variation}
                onChange={(e) => setVariation(e.target.value)}
              >
                <option value="">Any</option>
                {selected.variations.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="ft-label" htmlFor="target-goal">
              Goal ({noun})
            </label>
            <input
              id="target-goal"
              type="number"
              inputMode="numeric"
              className="ft-input w-full"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
            />
          </div>

          <div>
            <span className="ft-label">Training days</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAY_KEYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn('ft-chip', trainingDays.includes(day) && 'ft-chip--active')}
                  aria-pressed={trainingDays.includes(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ft-label" htmlFor="target-date">
              Deadline (optional)
            </label>
            <input
              id="target-date"
              type="date"
              className="ft-input w-full"
              value={targetDate}
              min={dayjs().format('YYYY-MM-DD')}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank and the app projects a date from how fast you are actually improving.
            </p>
          </div>

          <div>
            <span className="ft-label">How hard to push</span>
            <div className="space-y-2 mt-1">
              <button
                type="button"
                onClick={() => setTestEveryDay(false)}
                className={cn(
                  'ft-card ft-card-interactive w-full text-left p-3',
                  !testEveryDay && 'border-primary'
                )}
                aria-pressed={!testEveryDay}
              >
                <p className="text-sm font-semibold">Test + volume (recommended)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  One all-out day a week, the rest submax. Same weekly volume, far less fatigue —
                  two max-effort days on one muscle usually stalls within a month.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTestEveryDay(true)}
                className={cn(
                  'ft-card ft-card-interactive w-full text-left p-3',
                  testEveryDay && 'border-primary'
                )}
                aria-pressed={testEveryDay}
              >
                <p className="text-sm font-semibold">Max effort every session</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All-out set 1 on every training day, no planned deloads. Faster early, harder to
                  sustain past about 60 {noun}.
                </p>
              </button>
            </div>
          </div>

          <button
            type="button"
            className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg"
            disabled={!valid}
            onClick={handleCreate}
          >
            Create target
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
