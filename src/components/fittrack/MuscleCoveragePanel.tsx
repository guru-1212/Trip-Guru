'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Sparkles } from 'lucide-react';
import type { CustomExercise, SplitId, TodayExercisePick } from '@/workout/types';
import {
  computeMuscleStates,
  getCoverageSuggestions,
  getExerciseTargets,
  getSplitSubMuscles,
  type SubMuscleId,
} from '@/workout/muscleCoverage';
import { cn } from '@/lib/utils';

// three.js loads only when this panel mounts — never in the initial bundle.
const MuscleBody3D = dynamic(() => import('@/components/fittrack/MuscleBody3D'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
    </div>
  ),
});

const LEGEND = [
  { color: '#ef4444', label: 'To Hit' },
  { color: '#22c55e', label: 'Covered' },
  { color: '#86efac', label: 'Assisted' },
  { color: '#52525b', label: 'Not Today' },
];

interface MuscleCoveragePanelProps {
  splitId: SplitId;
  picks: TodayExercisePick[];
  customExercises: CustomExercise[];
  /** Add a suggested exercise to today's picks (default variation). */
  onAddExercise: (exerciseId: string) => void;
  disabled?: boolean;
}

export function MuscleCoveragePanel({
  splitId,
  picks,
  customExercises,
  onAddExercise,
  disabled = false,
}: MuscleCoveragePanelProps) {
  const [highlight, setHighlight] = useState<SubMuscleId[]>([]);

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

      <div className="h-64 sm:h-72">
        <MuscleBody3D states={states} highlight={highlight} />
      </div>
      <p className="text-center text-[10px] font-medium text-muted-foreground">
        Drag to rotate — picks turn their target muscles green
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
    </div>
  );
}
