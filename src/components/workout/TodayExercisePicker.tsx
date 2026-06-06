'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import type { CustomExercise, LibraryExercise, MuscleGroup, SplitId } from '@/workout/types';
import { MUSCLE_COLORS } from '@/workout/constants';
import { groupLibraryExercisesByMuscle } from '@/workout/utils';
import { cn } from '@/lib/utils';

interface TodayExercisePickerProps {
  splitId: SplitId;
  exercises: LibraryExercise[];
  picks: Map<string, string>;
  onPicksChange: (picks: Map<string, string>) => void;
  onExercisesChange: (exercises: LibraryExercise[]) => void;
  getVariationsForExercise: (exerciseId: string, baseVariations: string[]) => string[];
  onAddVariation: (exerciseId: string, variation: string) => void;
  customExercises: CustomExercise[];
  onCreateCustomExercise: (data: Omit<CustomExercise, 'id'>, remember: boolean) => CustomExercise;
  onRememberSplitExercise?: (exerciseId: string) => void;
  getVariationImage: (exerciseId: string, variation: string) => string | undefined;
}

export function TodayExercisePicker({
  splitId,
  exercises,
  picks,
  onPicksChange,
  onExercisesChange,
  getVariationsForExercise,
  onAddVariation,
  customExercises,
  onCreateCustomExercise,
  onRememberSplitExercise,
  getVariationImage,
}: TodayExercisePickerProps) {
  const grouped = groupLibraryExercisesByMuscle(exercises, splitId);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [search, setSearch] = useState('');
  const [rememberAdded, setRememberAdded] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('Chest');
  const [newVariation, setNewVariation] = useState('Standard');
  const [pendingAddId, setPendingAddId] = useState<string | null>(null);
  const [pendingVariation, setPendingVariation] = useState('Standard');
  const [newVarInputs, setNewVarInputs] = useState<Record<string, string>>({});
  const [fullImagePreview, setFullImagePreview] = useState<{ src: string; alt: string } | null>(null);

  const pickerIds = new Set(exercises.map((e) => e.id));

  const customAsLibrary: LibraryExercise[] = customExercises.map((c) => ({
    id: c.id,
    name: c.name,
    muscle: c.muscle,
    secondary: c.secondary,
    equipment: c.equipment,
    difficulty: c.difficulty,
    variations: c.variations,
    tips: c.notes ? [c.notes] : [],
    splitIds: [],
    category: [c.muscle],
  }));

  const addableExercises = useMemo(() => {
    const all = [...EXERCISE_LIBRARY, ...customAsLibrary];
    const q = search.toLowerCase().trim();
    return all.filter((ex) => {
      if (pickerIds.has(ex.id)) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscle.toLowerCase().includes(q) ||
        (ex.secondary?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [search, pickerIds, customAsLibrary]);

  const toggle = (ex: LibraryExercise) => {
    const next = new Map(picks);
    if (next.has(ex.id)) {
      next.delete(ex.id);
    } else {
      next.set(ex.id, ex.variations[0] ?? 'Standard');
    }
    onPicksChange(next);
  };

  const setVariation = (exerciseId: string, variation: string) => {
    if (!picks.has(exerciseId)) return;
    const next = new Map(picks);
    next.set(exerciseId, variation);
    onPicksChange(next);
  };

  const selectAll = () => {
    const next = new Map(picks);
    for (const ex of exercises) {
      if (!next.has(ex.id)) next.set(ex.id, ex.variations[0] ?? 'Standard');
    }
    onPicksChange(next);
  };

  const clearAll = () => onPicksChange(new Map());

  const addExerciseWithVariation = (ex: LibraryExercise, variation: string) => {
    const nextPicks = new Map(picks);
    nextPicks.set(ex.id, variation);
    onPicksChange(nextPicks);

    if (!pickerIds.has(ex.id)) {
      onExercisesChange([...exercises, ex]);
      if (rememberAdded && onRememberSplitExercise) onRememberSplitExercise(ex.id);
    }

    setPendingAddId(null);
    setSearch('');
    toast.success(`${ex.name} added to today's picks`);
  };

  const handleCreateCustom = () => {
    if (!newName.trim()) {
      toast.error('Enter an exercise name');
      return;
    }
    const variation = newVariation.trim() || 'Standard';
    const created = onCreateCustomExercise(
      {
        name: newName.trim(),
        muscle: newMuscle,
        equipment: 'Custom',
        difficulty: 'Beginner',
        variations: [variation],
        notes: '',
      },
      rememberAdded
    );
    const lib: LibraryExercise = {
      id: created.id,
      name: created.name,
      muscle: created.muscle,
      secondary: created.secondary,
      equipment: created.equipment,
      difficulty: created.difficulty,
      variations: created.variations,
      tips: created.notes ? [created.notes] : [],
      splitIds: [splitId],
      category: [created.muscle],
    };
    addExerciseWithVariation(lib, variation);
    setNewName('');
    setNewVariation('Standard');
    setShowCreate(false);
  };

  const submitInlineVariation = (exerciseId: string, baseVariations: string[]) => {
    const trimmed = (newVarInputs[exerciseId] ?? '').trim();
    if (!trimmed) return;
    onAddVariation(exerciseId, trimmed);
    setVariation(exerciseId, trimmed);
    setNewVarInputs((prev) => ({ ...prev, [exerciseId]: '' }));
  };

  const openVariationPreview = (src: string, alt: string) => {
    setFullImagePreview({ src, alt });
  };

  const renderVariationList = (
    ex: LibraryExercise,
    selectedVariation: string,
    onSelect: (variation: string) => void,
    showCustomInput = true
  ) => {
    const variations = getVariationsForExercise(ex.id, ex.variations);

    return (
      <div className="ft-today-variation-block">
        <p className="ft-today-variation-label">Select variation</p>
        <ul className="ft-today-variation-list">
          {variations.map((v) => {
            const storedImage = getVariationImage(ex.id, v);
            const isSelected = selectedVariation === v;
            return (
              <li key={v}>
                <div
                  className={cn(
                    'ft-today-variation-option',
                    isSelected && 'ft-today-variation-option--selected'
                  )}
                >
                  <button
                    type="button"
                    className="ft-today-variation-option-main"
                    onClick={() => onSelect(v)}
                  >
                    <span
                      className={cn(
                        'ft-today-variation-radio',
                        isSelected && 'ft-today-variation-radio--on'
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {storedImage && (
                      <img src={storedImage} alt="" className="ft-today-variation-thumb" />
                    )}
                    <span className="ft-today-variation-name">{v}</span>
                  </button>
                  {storedImage && (
                    <button
                      type="button"
                      className="ft-today-variation-view"
                      onClick={() => openVariationPreview(storedImage, `${ex.name} — ${v}`)}
                      aria-label={`View image for ${v}`}
                      title="View variation image"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {showCustomInput && (
          <div className="ft-today-variation-custom">
            <label className="ft-today-variation-custom-label">Or add custom</label>
            <div className="flex gap-2">
              <input
                className="ft-input !h-9 text-sm flex-1"
                placeholder="e.g. Incline, Sumo..."
                value={newVarInputs[ex.id] ?? ''}
                onChange={(e) => setNewVarInputs((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submitInlineVariation(ex.id, ex.variations)}
              />
              <button
                type="button"
                className="ft-btn ft-btn--secondary ft-btn--sm shrink-0"
                onClick={() => submitInlineVariation(ex.id, ex.variations)}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ft-today-picker ft-card ft-card-padded space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="ft-title text-base">Today&apos;s Picks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose exercises and variations for today
          </p>
        </div>
        <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
          {picks.size} of {exercises.length}
        </span>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={selectAll} className="ft-btn ft-btn--ghost ft-btn--sm">
          Select all
        </button>
        <button type="button" onClick={clearAll} className="ft-btn ft-btn--ghost ft-btn--sm">
          Clear
        </button>
      </div>

      <div className="space-y-4">
        {grouped.map(({ muscle, exercises: muscleExercises }) => (
          <div key={muscle} className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className="w-1 h-4 rounded-full shrink-0"
                style={{ backgroundColor: MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))' }}
              />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {muscle}
              </h3>
            </div>
            <ul className="space-y-2">
              {muscleExercises.map((ex) => {
                const checked = picks.has(ex.id);
                return (
                  <li key={ex.id} className="space-y-2">
                    <label
                      className={cn(
                        'ft-today-picker-row',
                        checked && 'ft-today-picker-row--selected'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggle(ex)}
                      />
                      <span
                        className={cn(
                          'ft-today-picker-check',
                          checked && 'ft-today-picker-check--checked'
                        )}
                        aria-hidden
                      >
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="text-sm font-medium truncate flex-1">{ex.name}</span>
                      {checked && (
                        <span className="text-xs text-primary font-medium shrink-0 truncate max-w-[40%]">
                          {picks.get(ex.id)}
                        </span>
                      )}
                      {!checked && (
                        <span className="text-xs text-muted-foreground shrink-0">{ex.equipment}</span>
                      )}
                    </label>
                    {checked &&
                      renderVariationList(ex, picks.get(ex.id) ?? ex.variations[0] ?? 'Standard', (v) =>
                        setVariation(ex.id, v)
                      )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="ft-btn ft-btn--ghost ft-btn--block"
        >
          <Plus className="h-4 w-4" />
          {showAddPanel ? 'Hide add exercise' : 'Exercise not in list? Add exercise & variation'}
        </button>

        {showAddPanel && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="ft-input !pl-10"
                placeholder="Search exercises to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={rememberAdded}
                onChange={(e) => setRememberAdded(e.target.checked)}
                className="rounded accent-primary"
              />
              Remember for this split
            </label>

            {!showCreate ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="ft-btn ft-btn--secondary ft-btn--sm ft-btn--block"
              >
                <Plus className="h-4 w-4" />
                Create custom exercise
              </button>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-semibold">New exercise</p>
                <input
                  className="ft-input"
                  placeholder="Exercise name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="ft-select"
                    value={newMuscle}
                    onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                  >
                    {(['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'] as MuscleGroup[]).map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    className="ft-input"
                    placeholder="Variation"
                    value={newVariation}
                    onChange={(e) => setNewVariation(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="ft-btn ft-btn--secondary flex-1"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </button>
                  <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={handleCreateCustom}>
                    Create & add
                  </button>
                </div>
              </div>
            )}

            {pendingAddId ? (
              (() => {
                const ex =
                  addableExercises.find((e) => e.id === pendingAddId) ??
                  EXERCISE_LIBRARY.find((e) => e.id === pendingAddId) ??
                  customAsLibrary.find((e) => e.id === pendingAddId);
                if (!ex) return null;
                return (
                  <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-semibold">{ex.name}</p>
                    {renderVariationList(ex, pendingVariation, setPendingVariation, false)}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="ft-btn ft-btn--secondary flex-1"
                        onClick={() => setPendingAddId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="ft-btn ft-btn--primary flex-1"
                        onClick={() => addExerciseWithVariation(ex, pendingVariation)}
                      >
                        Add to picks
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : addableExercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                {search ? 'No matching exercises' : 'All library exercises are already listed above'}
              </p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {addableExercises.slice(0, 12).map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAddId(ex.id);
                        setPendingVariation(ex.variations[0] ?? 'Standard');
                      }}
                      className="w-full ft-today-picker-row text-left"
                    >
                      <span className="text-sm font-medium truncate flex-1">{ex.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{ex.muscle}</span>
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {fullImagePreview && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFullImagePreview(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setFullImagePreview(null)}
                className="self-end p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors"
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={fullImagePreview.src}
                alt={fullImagePreview.alt}
                className="max-w-full max-h-[calc(90vh-5rem)] object-contain rounded-xl shadow-2xl"
              />
              <p className="text-sm font-medium text-white/80 text-center px-4">{fullImagePreview.alt}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
