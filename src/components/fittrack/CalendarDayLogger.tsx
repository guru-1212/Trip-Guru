'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Pencil, Zap, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { SessionEditor } from '@/components/fittrack/SessionEditor';
import { FastLogModal } from '@/components/workout/FastLogModal';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { SPLIT_DEFINITIONS, SPLIT_ICONS, SPLIT_NAMES } from '@/workout/constants';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  buildFastLogSession,
  formatExerciseSetsSummary,
  formatWeight,
  getDayKeyForDate,
  getFastLogSuggestions,
  getScheduledSplitsForDay,
  type FastLogSuggestion,
} from '@/workout/utils';
import type { SplitId, WeightUnit, WorkoutExercise, WorkoutSession } from '@/workout/types';
import { cn } from '@/lib/utils';

interface CalendarDayLoggerProps {
  /** Calendar day (YYYY-MM-DD) to show; null keeps the dialog closed. */
  date: string | null;
  onClose: () => void;
}

function ExerciseLines({ exercises, unit }: { exercises: WorkoutExercise[]; unit: WeightUnit }) {
  return (
    <div className="space-y-1">
      {exercises.map((ex) => (
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
  );
}

/**
 * Click-a-day dialog for the attendance calendars: shows what was logged that
 * day, or — for a day with nothing logged — the weekday's planned workout with
 * a one-tap "log it with my last numbers" button.
 */
export function CalendarDayLogger({ date, onClose }: CalendarDayLoggerProps) {
  const { workouts, profile, saveWorkout, updateWorkout } = useWorkoutStore();
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const unit = profile.prefs.unit;

  const handleLog = (source: WorkoutSession, logDate: string) => {
    const session = buildFastLogSession(source, logDate);
    if (!session) {
      toast.error('That workout has no completed sets to log');
      return;
    }
    saveWorkout(session);
    setPickerDate(null);
    onClose();
  };

  const planned = useMemo(
    () => (date ? getScheduledSplitsForDay(profile, getDayKeyForDate(date)) : []),
    [date, profile]
  );
  const suggestions = useMemo(
    () => (date ? getFastLogSuggestions(date, profile, workouts) : []),
    [date, profile, workouts]
  );
  const pickerSplit = suggestions[0]?.splitId ?? planned[0] ?? null;

  return (
    <>
      {date && !pickerDate && (
        <DaySheet
          date={date}
          workouts={workouts}
          planned={planned}
          suggestions={suggestions}
          unit={unit}
          onClose={onClose}
          onLog={handleLog}
          onSaveEdit={updateWorkout}
          onChoose={() => setPickerDate(date)}
        />
      )}
      <FastLogModal
        open={pickerDate !== null}
        workouts={workouts}
        preferredSplit={pickerSplit}
        unit={unit}
        fixedDate={pickerDate ?? undefined}
        onClose={() => setPickerDate(null)}
        onLog={handleLog}
      />
    </>
  );
}

interface SuggestionCardProps {
  suggestion: FastLogSuggestion;
  date: string;
  unit: WeightUnit;
  onLog: (source: WorkoutSession, date: string) => void;
}

/** One planned workout with its last logged sessions to pick from; the latest is preselected. */
function SuggestionCard({ suggestion, date, unit, onLog }: SuggestionCardProps) {
  const { splitId, sources } = suggestion;
  const [pickedId, setPickedId] = useState<string | null>(sources[0]?.id ?? null);
  const split = SPLIT_DEFINITIONS.find((s) => s.id === splitId);
  const source = sources.find((w) => w.id === pickedId) ?? sources[0] ?? null;
  const preview = source ? buildFastLogSession(source, date) : null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{split ? SPLIT_ICONS[split.icon] : ''}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{SPLIT_NAMES[splitId]}</p>
          <p className="text-xs text-muted-foreground">
            {sources.length > 1
              ? 'Pick which earlier session to copy'
              : sources.length === 1
              ? 'Same sets and weights as your last session'
              : 'No workout of this type to copy yet'}
          </p>
        </div>
      </div>

      {source && preview ? (
        <>
          <div className="space-y-2" role="radiogroup" aria-label={`${SPLIT_NAMES[splitId]} sessions`}>
            {sources.map((w, i) => {
              const selected = w.id === source.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPickedId(w.id)}
                  className={cn(
                    'w-full text-left rounded-lg border px-3 py-2 flex items-center gap-3 transition-colors',
                    selected ? 'border-primary bg-background' : 'border-border/60 hover:bg-background/60'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {dayjs(w.date).format('ddd, MMM D')}
                      {i === 0 && w.date < date && (
                        <span className="ml-2 text-xs font-medium text-primary">Latest</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w.exercises.length} exercises · {w.totalSets} sets · {formatWeight(w.totalVolume, unit)}
                    </p>
                  </div>
                  {selected && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="max-h-32 overflow-y-auto pr-1">
            <ExerciseLines exercises={preview.exercises} unit={unit} />
          </div>
          <button
            type="button"
            className="ft-btn ft-btn--primary ft-btn--block"
            onClick={() => onLog(source, date)}
          >
            <Zap className="h-4 w-4" />
            Log {SPLIT_NAMES[splitId]} for {dayjs(date).format('MMM D')}
          </button>
        </>
      ) : (
        <Link href="/fittrack/workout" className="ft-btn ft-btn--secondary ft-btn--block">
          Start it from the Workout page
        </Link>
      )}
    </div>
  );
}

interface DaySheetProps {
  date: string;
  workouts: WorkoutSession[];
  planned: SplitId[];
  suggestions: FastLogSuggestion[];
  unit: WeightUnit;
  onClose: () => void;
  onLog: (source: WorkoutSession, date: string) => void;
  onSaveEdit: (updated: WorkoutSession) => void;
  onChoose: () => void;
}

function DaySheet({
  date,
  workouts,
  planned,
  suggestions,
  unit,
  onClose,
  onLog,
  onSaveEdit,
  onChoose,
}: DaySheetProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Escape / clicking outside backs out of an edit first instead of silently
  // discarding it by closing the whole dialog.
  const dismiss = () => (editingId ? setEditingId(null) : onClose());
  useDialogFocus(true, modalRef, dismiss);

  const day = dayjs(date);
  const isFuture = date > dayjs().format('YYYY-MM-DD');
  const sessions = workouts.filter((w) => w.date === date);
  const planText = planned.length
    ? planned.map((s) => SPLIT_NAMES[s]).join(' → ')
    : 'Rest day on your plan';

  return (
    <div
      ref={backdropRef}
      className="ft-overlay"
      style={{ zIndex: 110 }}
      onClick={(e) => {
        if (e.target === backdropRef.current) dismiss();
      }}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-day-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="ft-modal ft-modal-lg w-full max-w-lg space-y-5 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="calendar-day-title" className="ft-title">
                {day.format('dddd, MMM D')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {day.format('YYYY')} ·{' '}
                {sessions.length > 0
                  ? `${sessions.length} session${sessions.length === 1 ? '' : 's'} logged`
                  : isFuture
                  ? 'Upcoming'
                  : 'Not logged'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ft-btn ft-btn--ghost ft-btn--icon" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sessions.length > 0 && (
          <div className={cn('space-y-3', !editingId && 'max-h-60 overflow-y-auto pr-1')}>
            {sessions.map((w) => (
              <div key={w.id} className="rounded-xl border border-border px-4 py-3 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{w.splitName}</p>
                  <div className="flex items-center gap-3">
                    {editingId !== w.id && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {w.totalSets} sets · {formatWeight(w.totalVolume, unit)}
                      </p>
                    )}
                    {editingId !== w.id && w.exercises.some((ex) => formatExerciseSetsSummary(ex, unit)) && (
                      <button
                        type="button"
                        onClick={() => setEditingId(w.id)}
                        className="ft-btn ft-btn--ghost ft-btn--sm inline-flex items-center gap-1.5"
                        aria-label={`Edit ${w.splitName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {editingId === w.id ? (
                  <SessionEditor
                    session={w}
                    unit={unit}
                    onSave={(updated) => {
                      onSaveEdit(updated);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ExerciseLines
                    exercises={w.exercises.filter((ex) => formatExerciseSetsSummary(ex, unit))}
                    unit={unit}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Plan for {day.format('dddd')}: <span className="font-medium text-foreground">{planText}</span>
        </p>

        {isFuture ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-3">
            You can log this day once it arrives.
          </p>
        ) : (
          <>
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.splitId}
                suggestion={suggestion}
                date={date}
                unit={unit}
                onLog={onLog}
              />
            ))}

            <button type="button" onClick={onChoose} className="ft-btn ft-btn--secondary ft-btn--block">
              {sessions.length > 0 && suggestions.length === 0
                ? 'Log another workout'
                : planned.length === 0
                ? 'Trained anyway? Choose a workout'
                : 'Choose a different workout'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
