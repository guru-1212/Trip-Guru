'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, X, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { EXERCISE_LIBRARY, getExerciseById } from '@/workout/exerciseLibrary';
import { SPLIT_DEFINITIONS } from '@/workout/constants';
import type { CustomExercise, LibraryExercise, MuscleGroup, SplitId } from '@/workout/types';
import {
  libraryItemToWorkoutExercise,
  exerciseMatchesSearch,
  exerciseSearchRank,
  getMatchingVariations,
  variationMatchesSearch,
  defaultExerciseImageUrl,
  exerciseBelongsToSplit,
  getMuscleOrderForSplit,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

interface AddExerciseModalProps {
  splitId: SplitId;
  currentSelections: Array<{ exerciseId: string; variation: string }>;
  customExercises: CustomExercise[];
  getVariationsForExercise?: (exerciseId: string, baseVariations: string[]) => string[];
  getVariationImage?: (exerciseId: string, variation: string) => string | undefined;
  onAdd: (exerciseId: string, variations: string[], remember: boolean) => void;
  onCreateCustom: (data: Omit<CustomExercise, 'id'>, remember: boolean) => void;
  onClose: () => void;
}

interface SearchDropdownItem {
  exerciseId: string;
  exerciseName: string;
  muscle: LibraryExercise['muscle'];
  variation: string;
  imageUrl: string;
  isVariationMatch: boolean;
}

export function AddExerciseModal({
  splitId,
  currentSelections,
  customExercises,
  getVariationsForExercise,
  getVariationImage,
  onAdd,
  onCreateCustom,
  onClose,
}: AddExerciseModalProps) {
  const splitDef = SPLIT_DEFINITIONS.find((s) => s.id === splitId);
  const muscleOptions = getMuscleOrderForSplit(splitId);
  const [search, setSearch] = useState('');
  const [remember, setRemember] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>(muscleOptions[0] ?? 'Chest');
  const [newVariation, setNewVariation] = useState('Standard');
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const [pendingVariations, setPendingVariations] = useState<string[]>([]);
  const [fullImagePreview, setFullImagePreview] = useState<{ src: string; alt: string } | null>(null);

  const selectedSet = useMemo(
    () => new Set(currentSelections.map((item) => `${item.exerciseId}::${item.variation}`)),
    [currentSelections]
  );

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

  const resolveImage = (exerciseId: string, variation: string) =>
    getVariationImage?.(exerciseId, variation) ?? defaultExerciseImageUrl(exerciseId);

  const available = useMemo(() => {
    const all = [...EXERCISE_LIBRARY, ...customAsLibrary].filter((ex) =>
      exerciseBelongsToSplit(ex, splitId)
    );
    return all
      .map((ex) => {
        const variations = getVariationsForExercise
          ? getVariationsForExercise(ex.id, ex.variations)
          : ex.variations;
        const availableVariations = variations.filter((variation) => !selectedSet.has(`${ex.id}::${variation}`));
        return { exercise: ex, variations, availableVariations };
      })
      .filter(({ exercise, variations, availableVariations }) => {
        if (!availableVariations.length) return false;
        return exerciseMatchesSearch(exercise, search, variations);
      });
  }, [search, customAsLibrary, getVariationsForExercise, selectedSet, splitId]);

  const searchQuery = search.toLowerCase().trim();

  const searchDropdownItems = useMemo((): SearchDropdownItem[] => {
    if (!searchQuery) return [];
    const items: SearchDropdownItem[] = [];
    for (const { exercise, variations, availableVariations } of available) {
      const variationsToShow = getMatchingVariations(availableVariations, search);
      for (const variation of variationsToShow) {
        items.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscle: exercise.muscle,
          variation,
          imageUrl: resolveImage(exercise.id, variation),
          isVariationMatch: variationMatchesSearch(variation, search),
        });
      }
    }
    return items.sort((a, b) => {
      if (a.isVariationMatch !== b.isVariationMatch) return a.isVariationMatch ? -1 : 1;
      const exA = available.find((item) => item.exercise.id === a.exerciseId)?.exercise;
      const exB = available.find((item) => item.exercise.id === b.exerciseId)?.exercise;
      if (exA && exB) {
        const aVars = getVariationsForExercise
          ? getVariationsForExercise(exA.id, exA.variations)
          : exA.variations;
        const bVars = getVariationsForExercise
          ? getVariationsForExercise(exB.id, exB.variations)
          : exB.variations;
        const rankDiff = exerciseSearchRank(exA, search, aVars) - exerciseSearchRank(exB, search, bVars);
        if (rankDiff !== 0) return rankDiff;
      }
      const nameCmp = a.exerciseName.localeCompare(b.exerciseName);
      if (nameCmp !== 0) return nameCmp;
      return a.variation.localeCompare(b.variation);
    });
  }, [available, search, searchQuery, getVariationsForExercise]);

  const pendingExercise = useMemo(
    () => available.find((item) => item.exercise.id === pendingExerciseId) ?? null,
    [available, pendingExerciseId]
  );

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Enter an exercise name');
      return;
    }
    onCreateCustom(
      {
        name: newName.trim(),
        muscle: newMuscle,
        equipment: 'Custom',
        difficulty: 'Beginner',
        variations: [newVariation.trim() || 'Standard'],
        notes: '',
      },
      remember
    );
    setNewName('');
    setNewVariation('Standard');
    setShowCreate(false);
  };

  const togglePendingVariation = (variation: string) => {
    setPendingVariations((prev) => {
      if (prev.includes(variation)) {
        return prev.length === 1 ? prev : prev.filter((v) => v !== variation);
      }
      return [...prev, variation];
    });
  };

  const openExerciseVariations = (exerciseId: string, availableVariations: string[]) => {
    setPendingExerciseId(exerciseId);
    setPendingVariations([availableVariations[0] ?? 'Standard']);
  };

  const addVariationsDirect = (exerciseId: string, variations: string[], exerciseName: string) => {
    void exerciseName;
    const unique = Array.from(new Set(variations.filter(Boolean)));
    if (!unique.length) return;
    onAdd(exerciseId, unique, remember);
    setPendingExerciseId(null);
    setPendingVariations([]);
    setSearch('');
  };

  const confirmAdd = () => {
    if (!pendingExercise || pendingVariations.length === 0) {
      toast.error('Select at least one variation');
      return;
    }
    onAdd(pendingExercise.exercise.id, pendingVariations, remember);
    setPendingExerciseId(null);
    setPendingVariations([]);
    setSearch('');
  };

  const openVariationPreview = (src: string, alt: string) => {
    setFullImagePreview({ src, alt });
  };

  return (
    <>
      <div className="ft-overlay !items-end sm:!items-center !p-0 sm:!p-4" style={{ zIndex: 110 }} onClick={onClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          className="ft-modal ft-modal-lg !max-h-[90vh] !rounded-b-none sm:!rounded-b-xl flex flex-col !p-0 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="ft-title">Add Exercise</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {splitDef
                  ? `${splitDef.name} exercises only — search or pick a variation`
                  : 'Search the library or create custom'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="ft-btn ft-btn--ghost ft-btn--icon">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div className="relative ft-picker-search !static !p-0 !bg-transparent !backdrop-blur-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <input
                className="ft-input !pl-10 !pr-10"
                placeholder="Search exercises or variations (e.g. cable fly, pec deck)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-expanded={searchQuery ? searchDropdownItems.length > 0 : false}
                autoComplete="off"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors z-10"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {searchQuery && (
                <div className="ft-picker-search-dropdown" role="listbox" aria-label="Search results">
                  {searchDropdownItems.length === 0 ? (
                    <p className="ft-picker-search-empty">
                      No exercises or variations match &ldquo;{search.trim()}&rdquo;
                    </p>
                  ) : (
                    <ul className="ft-picker-search-list">
                      {searchDropdownItems.map((item) => (
                        <li
                          key={`${item.exerciseId}::${item.variation}`}
                          className={cn(
                            'ft-picker-search-item',
                            item.isVariationMatch && 'ft-picker-search-item--match'
                          )}
                          role="option"
                        >
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="ft-picker-search-thumb"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = defaultExerciseImageUrl(item.exerciseId);
                            }}
                          />
                          <div className="ft-picker-search-item-text min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{item.exerciseName}</p>
                            <p className="text-xs text-primary font-medium truncate">{item.variation}</p>
                            <p className="text-[10px] text-muted-foreground">{item.muscle}</p>
                          </div>
                          <div className="ft-picker-search-item-actions shrink-0">
                            <button
                              type="button"
                              className="ft-picker-search-view"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                openVariationPreview(item.imageUrl, `${item.exerciseName} — ${item.variation}`)
                              }
                              aria-label={`View image for ${item.exerciseName} — ${item.variation}`}
                              title="View image"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="ft-btn ft-btn--sm ft-btn--primary"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => addVariationsDirect(item.exerciseId, [item.variation], item.exerciseName)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded accent-primary"
              />
              Remember for this split
            </label>

            {!showCreate ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="ft-btn ft-btn--ghost ft-btn--block"
              >
                <Plus className="h-4 w-4" />
                Create custom exercise
              </button>
            ) : (
              <div className="ft-card ft-card-padded space-y-3 !p-4">
                <p className="text-sm font-semibold">New exercise</p>
                <input
                  className="ft-input"
                  placeholder="Exercise name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="ft-select"
                    value={newMuscle}
                    onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                  >
                  {muscleOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  </select>
                  <input
                    className="ft-input"
                    placeholder="Variation"
                    value={newVariation}
                    onChange={(e) => setNewVariation(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" className="ft-btn ft-btn--secondary flex-1" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={handleCreate}>
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {pendingExercise ? (
                <div className="ft-card ft-card-padded space-y-3 !p-4 border-primary/30 bg-primary/5">
                  <p className="text-sm font-semibold">{pendingExercise.exercise.name}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Select variation(s)</p>
                    <ul className="space-y-1.5">
                      {pendingExercise.availableVariations.map((variation) => {
                        const imageUrl = resolveImage(pendingExercise.exercise.id, variation);
                        const isChecked = pendingVariations.includes(variation);
                        return (
                          <li key={variation}>
                            <div
                              className={cn(
                                'ft-today-variation-option',
                                isChecked && 'ft-today-variation-option--selected'
                              )}
                            >
                              <button
                                type="button"
                                className="ft-today-variation-option-main"
                                onClick={() => togglePendingVariation(variation)}
                              >
                                <img
                                  src={imageUrl}
                                  alt=""
                                  className="ft-today-variation-thumb"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = defaultExerciseImageUrl(
                                      pendingExercise.exercise.id
                                    );
                                  }}
                                />
                                <span className="ft-today-variation-name">{variation}</span>
                              </button>
                              <button
                                type="button"
                                className="ft-today-variation-view"
                                onClick={() =>
                                  openVariationPreview(
                                    imageUrl,
                                    `${pendingExercise.exercise.name} — ${variation}`
                                  )
                                }
                                aria-label={`View image for ${variation}`}
                                title="View variation image"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="ft-btn ft-btn--secondary flex-1"
                      onClick={() => {
                        setPendingExerciseId(null);
                        setPendingVariations([]);
                      }}
                    >
                      Back
                    </button>
                    <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={confirmAdd}>
                      Add to workout
                    </button>
                  </div>
                </div>
              ) : searchQuery ? null : available.length === 0 ? (
                <div className="ft-empty">
                  <p>All exercise variations already added</p>
                </div>
              ) : (
                available.map(({ exercise, availableVariations }) => {
                  const previewVariation = availableVariations[0] ?? exercise.variations[0] ?? 'Standard';
                  const imageUrl = resolveImage(exercise.id, previewVariation);
                  return (
                    <div
                      key={exercise.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => openExerciseVariations(exercise.id, availableVariations)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left bg-transparent border-0 cursor-pointer p-0"
                      >
                        <img
                          src={imageUrl}
                          alt=""
                          className="ft-picker-search-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = defaultExerciseImageUrl(exercise.id);
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {exercise.muscle} · {exercise.equipment} · {availableVariations.length} variation(s)
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="ft-picker-search-view shrink-0"
                        onClick={() =>
                          openVariationPreview(imageUrl, `${exercise.name} — ${previewVariation}`)
                        }
                        aria-label={`View image for ${exercise.name}`}
                        title="View image"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openExerciseVariations(exercise.id, availableVariations)}
                        className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"
                        aria-label={`Add ${exercise.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
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
    </>
  );
}

export function resolveExerciseForWorkout(
  exerciseId: string,
  customExercises: CustomExercise[],
  defaultSets: number
) {
  const lib = getExerciseById(exerciseId);
  if (lib) return libraryItemToWorkoutExercise(lib, defaultSets);
  const custom = customExercises.find((c) => c.id === exerciseId);
  if (custom) return libraryItemToWorkoutExercise(custom, defaultSets);
  return null;
}
