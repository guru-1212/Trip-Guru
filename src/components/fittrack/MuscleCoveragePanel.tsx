'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Eye, Plus, Sparkles, X } from 'lucide-react';
import type { CustomExercise, SplitId, TodayExercisePick } from '@/workout/types';
import {
  computeMuscleStates,
  getCoverageSuggestions,
  getExercisesForMuscles,
  getExerciseTargets,
  getSplitSubMuscles,
  type SubMuscleId,
} from '@/workout/muscleCoverage';
import { defaultExerciseImageUrl } from '@/workout/utils';
import { MuscleBodyMap } from '@/components/fittrack/MuscleBodyMap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const LEGEND = [
  { color: '#ef4444', label: 'To Hit' },
  { color: '#22c55e', label: 'Covered' },
  { color: '#86efac', label: 'Assisted' },
  { color: '#cdd2d9', label: 'Not Today' },
];

interface MuscleCoveragePanelProps {
  splitId: SplitId;
  picks: TodayExercisePick[];
  customExercises: CustomExercise[];
  /** Add a suggested exercise to today's picks (default variation). */
  onAddExercise: (exerciseId: string) => void;
  /** Remove an exercise (all its variations) from today's picks. */
  onRemoveExercise?: (exerciseId: string) => void;
  /** Toggle a specific variation in today's picks (add if absent, remove if present). */
  onToggleVariation?: (exerciseId: string, variation: string) => void;
  /** Resolve the (possibly custom-extended) variation list for an exercise. */
  getVariations?: (exerciseId: string, baseVariations: string[]) => string[];
  /** Stored image URL for a variation, if the user set one. */
  getVariationImage?: (exerciseId: string, variation: string) => string | undefined;
  disabled?: boolean;
}

export function MuscleCoveragePanel({
  splitId,
  picks,
  customExercises,
  onAddExercise,
  onRemoveExercise,
  onToggleVariation,
  getVariations,
  getVariationImage,
  disabled = false,
}: MuscleCoveragePanelProps) {
  const [highlight, setHighlight] = useState<SubMuscleId[]>([]);
  const [muscleDialog, setMuscleDialog] = useState<{
    muscles: SubMuscleId[];
    title: string;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);

  const dialogMatches = useMemo(
    () => (muscleDialog ? getExercisesForMuscles(muscleDialog.muscles, splitId) : []),
    [muscleDialog, splitId]
  );
  const pickedIds = useMemo(() => new Set(picks.map((p) => p.exerciseId)), [picks]);
  const pickedKeys = useMemo(
    () => new Set(picks.map((p) => `${p.exerciseId}::${p.variation}`)),
    [picks]
  );
  // Auto-expand the first exercise; '' means the user explicitly collapsed it.
  const effectiveExpanded = expandedId === null ? dialogMatches[0]?.exercise.id : expandedId;

  const resolveImage = (exerciseId: string, variation: string) =>
    getVariationImage?.(exerciseId, variation) ?? defaultExerciseImageUrl(exerciseId);

  const states = useMemo(
    () => computeMuscleStates(splitId, picks, customExercises),
    [splitId, picks, customExercises]
  );

  const suggestions = useMemo(
    () => getCoverageSuggestions(splitId, picks, customExercises),
    [splitId, picks, customExercises]
  );

  const coverage = useMemo(() => {
    const splitMuscles = getSplitSubMuscles(splitId);
    const total = splitMuscles.size;
    let covered = 0;
    splitMuscles.forEach((m) => {
      if (states[m] === 'covered') covered += 1;
    });
    return { covered, total };
  }, [splitId, states]);

  if (splitId === 'rest') return null;

  const allCovered = coverage.total > 0 && coverage.covered === coverage.total;

  return (
    <div className="rounded-3xl border border-border/60 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Muscle Coverage
        </p>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider',
            allCovered ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted/50 text-muted-foreground'
          )}
        >
          {coverage.covered}/{coverage.total} covered
        </span>
      </div>

      <MuscleBodyMap
        states={states}
        highlight={highlight}
        onMuscleClick={
          disabled
            ? undefined
            : (muscles, title) => {
                setExpandedId(null);
                setMuscleDialog({ muscles, title });
              }
        }
      />
      <p className="text-center text-[10px] font-medium text-muted-foreground">
        Tap a muscle for exercises · pinch or drag to zoom &amp; pan · swipe or tap Front/Back to flip
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>

      {suggestions.length > 0 && !disabled && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Not hit yet — try these
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.muscleId}
                type="button"
                onClick={() => onAddExercise(s.exerciseId)}
                onMouseEnter={() =>
                  setHighlight(getExerciseTargets(s.exerciseId, customExercises).primary)
                }
                onMouseLeave={() => setHighlight([])}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-[11px] font-bold transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 active:scale-[0.97]"
              >
                <span className="text-red-500">{s.muscleName}</span>
                <span className="text-muted-foreground">→</span>
                <Plus className="h-3 w-3 text-emerald-500" />
                {s.exerciseName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tap-a-muscle exercise popup */}
      <Dialog
        open={muscleDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMuscleDialog(null);
            setPreview(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{muscleDialog?.title}</DialogTitle>
            <DialogDescription>
              Exercises that hit this muscle — expand to pick variations.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {dialogMatches.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No library exercises target this muscle yet.
              </p>
            )}
            {dialogMatches.map(({ exercise, role, inSplit }) => {
              const variations = getVariations
                ? getVariations(exercise.id, exercise.variations)
                : exercise.variations;
              const pickedCount = picks.filter((p) => p.exerciseId === exercise.id).length;
              const expanded = effectiveExpanded === exercise.id;

              return (
                <div
                  key={exercise.id}
                  className={cn(
                    'rounded-2xl border transition-colors',
                    pickedCount > 0
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-border/60 bg-muted/20'
                  )}
                >
                  {/* Exercise header — tap to expand its variations */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? '' : exercise.id)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                  >
                    <img
                      src={resolveImage(exercise.id, variations[0] ?? 'Standard')}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultExerciseImageUrl(exercise.id);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{exercise.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {exercise.equipment}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider',
                            role === 'primary'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted/60 text-muted-foreground'
                          )}
                        >
                          {role}
                        </span>
                        {!inSplit && (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Other day
                          </span>
                        )}
                      </div>
                    </div>
                    {pickedCount > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">
                        {pickedCount}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        expanded && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Variations */}
                  {expanded && (
                    <ul className="space-y-1 px-2 pb-2">
                      {variations.map((v) => {
                        const picked = pickedKeys.has(`${exercise.id}::${v}`);
                        const img = resolveImage(exercise.id, v);
                        return (
                          <li
                            key={v}
                            className={cn(
                              'flex items-center gap-2 rounded-xl border px-2 py-1.5',
                              picked
                                ? 'border-emerald-500/40 bg-emerald-500/10'
                                : 'border-transparent bg-background/60'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onToggleVariation
                                  ? onToggleVariation(exercise.id, v)
                                  : picked
                                    ? onRemoveExercise?.(exercise.id)
                                    : onAddExercise(exercise.id)
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                  picked
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-border text-transparent'
                                )}
                              >
                                {picked ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                              </span>
                              <img
                                src={img}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-lg object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = defaultExerciseImageUrl(exercise.id);
                                }}
                              />
                              <span className="truncate text-xs font-semibold">{v}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreview({ url: img, label: `${exercise.name} — ${v}` })}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                              aria-label={`View image for ${v}`}
                              title="View image"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Image preview overlay (covers the dialog) */}
          {preview && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/95 p-6 backdrop-blur-sm"
              onClick={() => setPreview(null)}
            >
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                aria-label="Close image"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={preview.url}
                alt={preview.label}
                className="max-h-[70%] max-w-full rounded-2xl object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <p className="text-center text-sm font-bold">{preview.label}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
