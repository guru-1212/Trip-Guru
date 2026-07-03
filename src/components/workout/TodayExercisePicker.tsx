'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { Check, Eye, GripVertical, ListOrdered, Lock, LockOpen, Plus, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PinConfirm, FINISH_WORKOUT_PIN } from '@/components/workout/PinConfirm';
import { MuscleCoveragePanel } from '@/components/fittrack/MuscleCoveragePanel';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import type {
  CustomExercise,
  LibraryExercise,
  MuscleGroup,
  SplitId,
  TodayExercisePick,
  WorkoutSession,
} from '@/workout/types';
import { MUSCLE_COLORS } from '@/workout/constants';
import {
  countVariationsInTodayPicks,
  defaultExerciseImageUrl,
  exerciseMatchesSearch,
  exerciseBelongsToSplit,
  exerciseSearchRank,
  generateId,
  getMatchingVariations,
  groupLibraryExercisesByMuscle,
  toSubVariationLabel,
  variationMatchesSearch,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

interface TodayExercisePickerProps {
  splitId: SplitId;
  exercises: LibraryExercise[];
  picks: TodayExercisePick[];
  onPicksChange: (picks: TodayExercisePick[]) => void;
  onExercisesChange: (exercises: LibraryExercise[]) => void;
  getVariationsForExercise: (exerciseId: string, baseVariations: string[]) => string[];
  onAddVariation: (exerciseId: string, variation: string) => void;
  customExercises: CustomExercise[];
  onCreateCustomExercise: (data: Omit<CustomExercise, 'id'>, remember: boolean) => CustomExercise;
  onRememberSplitExercise?: (exerciseId: string) => void;
  getVariationImage: (exerciseId: string, variation: string) => string | undefined;
  sequenceLocked: boolean;
  onSequenceLockedChange: (locked: boolean) => void;
  recentSessions?: WorkoutSession[];
  onRepeatSession?: (session: WorkoutSession) => void;
}

interface SearchDropdownItem {
  exerciseId: string;
  exerciseName: string;
  muscle: LibraryExercise['muscle'];
  variation: string;
  imageUrl: string;
  isSelected: boolean;
  isVariationMatch: boolean;
}

function findPickIndex(picks: TodayExercisePick[], exerciseId: string): number {
  return picks.findIndex((p) => p.exerciseId === exerciseId);
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
  sequenceLocked,
  onSequenceLockedChange,
  recentSessions = [],
  onRepeatSession,
}: TodayExercisePickerProps) {
  const grouped = groupLibraryExercisesByMuscle(exercises, splitId);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const pickedVariationCount = useMemo(() => countVariationsInTodayPicks(picks), [picks]);
  const totalVariationCount = useMemo(
    () =>
      exercises.reduce(
        (sum, ex) => sum + getVariationsForExercise(ex.id, ex.variations).length,
        0
      ),
    [exercises, getVariationsForExercise]
  );
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [addPanelSearch, setAddPanelSearch] = useState('');
  const [rememberAdded, setRememberAdded] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('Chest');
  const [newVariation, setNewVariation] = useState('Standard');
  const [pendingAddId, setPendingAddId] = useState<string | null>(null);
  const [pendingVariations, setPendingVariations] = useState<string[]>(['Standard']);
  const [newVarInputs, setNewVarInputs] = useState<Record<string, string>>({});
  const [fullImagePreview, setFullImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockPinError, setUnlockPinError] = useState(false);
  const [showSequenceModal, setShowSequenceModal] = useState(false);

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

  const pickerQuery = pickerSearch.toLowerCase().trim();

  const searchResults = useMemo(() => {
    if (!pickerQuery) return [];
    return exercises
      .filter((ex) => {
        const variations = getVariationsForExercise(ex.id, ex.variations);
        return exerciseMatchesSearch(ex, pickerSearch, variations);
      })
      .sort((a, b) => {
        const aVars = getVariationsForExercise(a.id, a.variations);
        const bVars = getVariationsForExercise(b.id, b.variations);
        const rankDiff =
          exerciseSearchRank(a, pickerSearch, aVars) - exerciseSearchRank(b, pickerSearch, bVars);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name);
      });
  }, [exercises, pickerSearch, pickerQuery, getVariationsForExercise]);

  const searchDropdownItems = useMemo((): SearchDropdownItem[] => {
    if (!pickerQuery) return [];
    const items: SearchDropdownItem[] = [];
    for (const ex of searchResults) {
      const allVariations = getVariationsForExercise(ex.id, ex.variations);
      const variationsToShow = getMatchingVariations(allVariations, pickerSearch);
      for (const variation of variationsToShow) {
        items.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          muscle: ex.muscle,
          variation,
          imageUrl: getVariationImage(ex.id, variation) ?? defaultExerciseImageUrl(ex.id),
          isSelected: picks.some((p) => p.exerciseId === ex.id && p.variation === variation),
          isVariationMatch: variationMatchesSearch(variation, pickerSearch),
        });
      }
    }
    return items.sort((a, b) => {
      if (a.isVariationMatch !== b.isVariationMatch) return a.isVariationMatch ? -1 : 1;
      const exA = exercises.find((e) => e.id === a.exerciseId);
      const exB = exercises.find((e) => e.id === b.exerciseId);
      if (exA && exB) {
        const aVars = getVariationsForExercise(exA.id, exA.variations);
        const bVars = getVariationsForExercise(exB.id, exB.variations);
        const rankDiff =
          exerciseSearchRank(exA, pickerSearch, aVars) - exerciseSearchRank(exB, pickerSearch, bVars);
        if (rankDiff !== 0) return rankDiff;
      }
      const nameCmp = a.exerciseName.localeCompare(b.exerciseName);
      if (nameCmp !== 0) return nameCmp;
      return a.variation.localeCompare(b.variation);
    });
  }, [searchResults, pickerSearch, pickerQuery, getVariationsForExercise, getVariationImage, picks, exercises]);

  const addableExercises = useMemo(() => {
    const all = [...EXERCISE_LIBRARY, ...customAsLibrary].filter((ex) =>
      exerciseBelongsToSplit(ex, splitId)
    );
    return all.filter((ex) => {
      if (pickerIds.has(ex.id)) return false;
      const variations = getVariationsForExercise(ex.id, ex.variations);
      return exerciseMatchesSearch(ex, addPanelSearch, variations);
    });
  }, [addPanelSearch, pickerIds, customAsLibrary, getVariationsForExercise, splitId]);

  const toggle = (ex: LibraryExercise) => {
    if (sequenceLocked) return;
    const exists = picks.some((p) => p.exerciseId === ex.id);
    if (exists) {
      onPicksChange(picks.filter((p) => p.exerciseId !== ex.id));
    } else {
      onPicksChange([
        ...picks,
        { id: generateId(), exerciseId: ex.id, variation: ex.variations[0] ?? 'Standard' },
      ]);
    }
  };

  const toggleVariation = (exerciseId: string, variation: string) => {
    if (sequenceLocked) return;
    const existingIdx = picks.findIndex((p) => p.exerciseId === exerciseId && p.variation === variation);
    if (existingIdx >= 0) {
      onPicksChange(picks.filter((_, i) => i !== existingIdx));
    } else {
      onPicksChange([...picks, { id: generateId(), exerciseId, variation }]);
    }
  };

  const selectFromDropdown = (exerciseId: string, variation: string, exerciseName: string) => {
    if (sequenceLocked) return;
    const alreadySelected = picks.some((p) => p.exerciseId === exerciseId && p.variation === variation);
    if (alreadySelected) {
      toast.success(`${exerciseName} — ${variation} is already in your workout`);
      return;
    }
    onPicksChange([...picks, { id: generateId(), exerciseId, variation }]);
    toast.success(`Added ${exerciseName} — ${variation}`);
  };

  const selectAll = () => {
    if (sequenceLocked) return;
    const next = [...picks];
    const pickedKeys = new Set(picks.map((p) => `${p.exerciseId}::${p.variation}`));
    for (const { exercises: muscleExercises } of grouped) {
      for (const ex of muscleExercises) {
        const defaultVar = ex.variations[0] ?? 'Standard';
        if (!pickedKeys.has(`${ex.id}::${defaultVar}`)) {
          next.push({ id: generateId(), exerciseId: ex.id, variation: defaultVar });
          pickedKeys.add(`${ex.id}::${defaultVar}`);
        }
      }
    }
    onPicksChange(next);
  };

  const clearAll = () => {
    if (sequenceLocked) return;
    onPicksChange([]);
  };

  const removeFromSequence = (pickId: string) => {
    if (sequenceLocked) return;
    onPicksChange(picks.filter((p) => p.id !== pickId));
  };

  const addExerciseWithVariations = (ex: LibraryExercise, variations: string[]) => {
    if (sequenceLocked) return;
    const uniqueVariations = Array.from(new Set(variations.filter(Boolean)));
    if (!uniqueVariations.length) {
      toast.error('Select at least one variation');
      return;
    }

    const nextPicks = [...picks];
    for (const v of uniqueVariations) {
      const exists = nextPicks.some(p => p.exerciseId === ex.id && p.variation === v);
      if (!exists) {
        nextPicks.push({ id: generateId(), exerciseId: ex.id, variation: v });
      }
    }
    onPicksChange(nextPicks);

    if (!pickerIds.has(ex.id)) {
      onExercisesChange([...exercises, ex]);
      if (rememberAdded && onRememberSplitExercise) onRememberSplitExercise(ex.id);
    }

    setPendingAddId(null);
    setPendingVariations(['Standard']);
    setAddPanelSearch('');
    toast.success(`${ex.name} added to today's picks`);
  };

  const togglePendingVariation = (variation: string) => {
    setPendingVariations((prev) => {
      if (prev.includes(variation)) {
        return prev.length === 1 ? prev : prev.filter((v) => v !== variation);
      }
      return [...prev, variation];
    });
  };

  const handleCreateCustom = () => {
    if (sequenceLocked) return;
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
    addExerciseWithVariations(lib, [variation]);
    setNewName('');
    setNewVariation('Standard');
    setShowCreate(false);
  };

  const submitInlineVariation = (exerciseId: string) => {
    if (sequenceLocked) return;
    const trimmed = (newVarInputs[exerciseId] ?? '').trim();
    if (!trimmed) return;
    onAddVariation(exerciseId, trimmed);

    const exists = picks.some((p) => p.exerciseId === exerciseId && p.variation === trimmed);
    if (!exists) {
      onPicksChange([...picks, { id: generateId(), exerciseId, variation: trimmed }]);
    }
    setNewVarInputs((prev) => ({ ...prev, [exerciseId]: '' }));
  };

  const openVariationPreview = (src: string, alt: string) => {
    setFullImagePreview({ src, alt });
  };

  const lockSequence = () => {
    setShowAddPanel(false);
    onSequenceLockedChange(true);
    toast.success('Plan locked and saved to your account');
  };

  const openUnlockDialog = () => {
    setUnlockPin('');
    setUnlockPinError(false);
    setShowUnlockDialog(true);
  };

  const closeUnlockDialog = () => {
    setShowUnlockDialog(false);
    setUnlockPin('');
    setUnlockPinError(false);
  };

  const confirmUnlock = () => {
    if (unlockPin !== FINISH_WORKOUT_PIN) {
      setUnlockPinError(true);
      return;
    }
    onSequenceLockedChange(false);
    closeUnlockDialog();
    toast.success('Plan unlocked');
  };

  const handleLockToggle = () => {
    if (sequenceLocked) openUnlockDialog();
    else lockSequence();
  };

  const renderSequenceRow = (pick: TodayExercisePick, index: number, draggable: boolean) => {
    const ex = exerciseById.get(pick.exerciseId);
    const name = ex?.name ?? pick.exerciseId;
    const muscle = ex?.muscle;
    const variation = pick.variation;
    const storedImage = getVariationImage(pick.exerciseId, variation);

    const row = (
      <div className="ft-sequence-exercise-block mb-3">
        <div className="ft-sequence-row flex items-center justify-between gap-3 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ft-sequence-index">{index + 1}</span>
            {draggable ? (
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
            ) : (
              <Lock className="h-4 w-4 text-primary shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm truncate">{name}</span>
                {muscle && (
                  <span
                    className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                    style={{
                      backgroundColor: `${MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))'}20`,
                      color: MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))',
                    }}
                  >
                    {muscle}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5 truncate">
                {variation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {storedImage && (
              <button
                type="button"
                className="ft-today-variation-view shrink-0 !px-2"
                onClick={() => openVariationPreview(storedImage, `${name} — ${variation}`)}
                aria-label={`View image for ${variation}`}
                title="View variation image"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            {draggable && (
              <button
                type="button"
                onClick={() => removeFromSequence(pick.id)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                aria-label={`Remove ${variation}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );

    if (draggable) {
      return (
        <Reorder.Item key={pick.id} value={pick} id={pick.id}>
          {row}
        </Reorder.Item>
      );
    }

    return <div key={pick.id}>{row}</div>;
  };

  const renderVariationList = (
    ex: LibraryExercise,
    selectedVariations: string[],
    onToggle: (variation: string) => void,
    showCustomInput = true
  ) => {
    const allVariations = getVariationsForExercise(ex.id, ex.variations);

    return (
      <div className={cn('ft-today-variation-block', sequenceLocked && 'ft-today-variation-block--locked')}>
        {selectedVariations.length > 0 && sequenceLocked && (
          <p className="text-[10px] text-muted-foreground">
            Order shown in workout sequence above
          </p>
        )}

        {!sequenceLocked && (
          <>
            <div className="space-y-2">
              <p className="ft-today-variation-label">Variations</p>
              <ul className="ft-today-variation-list">
                {allVariations.map((v) => {
                  const storedImage = getVariationImage(ex.id, v);
                  const isChecked = selectedVariations.includes(v);
                  return (
                    <li key={v}>
                      <div className={cn(
                        "ft-today-variation-option",
                        isChecked && "ft-today-variation-option--selected"
                      )}>
                        <button
                          type="button"
                          className="ft-today-variation-option-main"
                          onClick={() => onToggle(v)}
                        >
                          <span className={cn(
                            "ft-today-variation-check",
                            isChecked && "ft-today-variation-check--on"
                          )} aria-hidden>
                            {isChecked && <Check className="h-2.5 w-2.5" />}
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
            </div>
            {showCustomInput && (
              <div className="ft-today-variation-custom">
                <label className="ft-today-variation-custom-label">Or add custom</label>
                <div className="flex gap-2">
                  <input
                    className="ft-input !h-9 text-sm flex-1"
                    placeholder="e.g. Incline, Sumo..."
                    value={newVarInputs[ex.id] ?? ''}
                    onChange={(e) => setNewVarInputs((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && submitInlineVariation(ex.id)}
                  />
                  <button
                    type="button"
                    className="ft-btn ft-btn--secondary ft-btn--sm shrink-0"
                    onClick={() => submitInlineVariation(ex.id)}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="ft-today-picker ft-card ft-card-padded space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="ft-title text-base">Today&apos;s Picks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose exercises and variations for today
          </p>
        </div>
        <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
          {pickedVariationCount} of {totalVariationCount} variations
        </span>
      </div>

      <MuscleCoveragePanel
        splitId={splitId}
        picks={picks}
        customExercises={customExercises}
        disabled={sequenceLocked}
        onAddExercise={(exerciseId) => {
          if (sequenceLocked) return;
          const lib =
            EXERCISE_LIBRARY.find((e) => e.id === exerciseId) ??
            customAsLibrary.find((e) => e.id === exerciseId);
          if (!lib) return;
          const alreadyPicked = picks.some((p) => p.exerciseId === exerciseId);
          if (alreadyPicked) return;
          onPicksChange([
            ...picks,
            { id: generateId(), exerciseId, variation: lib.variations[0] ?? 'Standard' },
          ]);
          toast.success(`Added ${lib.name}`);
        }}
        onRemoveExercise={(exerciseId) => {
          if (sequenceLocked) return;
          onPicksChange(picks.filter((p) => p.exerciseId !== exerciseId));
        }}
        onToggleVariation={(exerciseId, variation) => {
          if (sequenceLocked) return;
          const idx = picks.findIndex(
            (p) => p.exerciseId === exerciseId && p.variation === variation
          );
          if (idx >= 0) {
            onPicksChange(picks.filter((_, i) => i !== idx));
          } else {
            onPicksChange([...picks, { id: generateId(), exerciseId, variation }]);
          }
        }}
        getVariations={getVariationsForExercise}
        getVariationImage={getVariationImage}
      />

      <div className={cn('ft-picker-search', sequenceLocked && 'opacity-50 pointer-events-none')}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <input
            className="ft-input !pl-10 !pr-10"
            placeholder="Search exercises or variations (e.g. bench press, incline)…"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            disabled={sequenceLocked}
            aria-label="Search exercises and variations"
            aria-expanded={pickerQuery ? searchDropdownItems.length > 0 : false}
            aria-controls="picker-search-dropdown"
            autoComplete="off"
          />
          {pickerSearch && (
            <button
              type="button"
              onClick={() => setPickerSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors z-10"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {pickerQuery && (
            <div
              id="picker-search-dropdown"
              className="ft-picker-search-dropdown"
              role="listbox"
              aria-label="Search results"
            >
              {searchDropdownItems.length === 0 ? (
                <p className="ft-picker-search-empty">
                  No exercises or variations match &ldquo;{pickerSearch.trim()}&rdquo;
                </p>
              ) : (
                <ul className="ft-picker-search-list">
                  {searchDropdownItems.map((item) => (
                    <li
                      key={`${item.exerciseId}::${item.variation}`}
                      className={cn(
                        'ft-picker-search-item',
                        item.isVariationMatch && 'ft-picker-search-item--match',
                        item.isSelected && 'ft-picker-search-item--selected'
                      )}
                      role="option"
                      aria-selected={item.isSelected}
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
                          className={cn(
                            'ft-btn ft-btn--sm',
                            item.isSelected ? 'ft-btn--secondary' : 'ft-btn--primary'
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            selectFromDropdown(item.exerciseId, item.variation, item.exerciseName)
                          }
                          disabled={item.isSelected}
                        >
                          {item.isSelected ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Added
                            </>
                          ) : (
                            'Select'
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={selectAll}
          disabled={sequenceLocked}
          className="ft-btn ft-btn--ghost ft-btn--sm disabled:opacity-40 disabled:pointer-events-none"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={sequenceLocked}
          className="ft-btn ft-btn--ghost ft-btn--sm disabled:opacity-40 disabled:pointer-events-none"
        >
          Clear
        </button>
      </div>

      {onRepeatSession && recentSessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Recent workouts
          </p>
          <div className="flex gap-2 flex-wrap">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onRepeatSession(session)}
                disabled={sequenceLocked}
                className="ft-btn ft-btn--ghost ft-btn--sm disabled:opacity-40 disabled:pointer-events-none"
              >
                {dayjs(session.date).format('ddd, MMM D')} · {session.exercises.length} ex
              </button>
            ))}
          </div>
        </div>
      )}

      {picks.length > 0 && (
        <div className="sticky top-4 z-[40] ft-card ft-card-padded !p-3 shadow-lg border-primary/20 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ListOrdered className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">Workout Sequence</h3>
              <p className="text-[10px] text-muted-foreground truncate">
                {picks.length} variations selected for today
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSequenceModal(true)}
            className="ft-btn ft-btn--primary ft-btn--sm shrink-0 shadow-sm"
          >
            Change Sequence
          </button>
        </div>
      )}

      <div className={cn('space-y-4', sequenceLocked && 'ft-today-picker-locked')}>
        {sequenceLocked && (
          <p className="text-xs text-primary font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Exercises and variations are locked
          </p>
        )}
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
                const pickVariations = picks.filter(p => p.exerciseId === ex.id).map(p => p.variation);
                const checked = pickVariations.length > 0;
                return (
                  <li key={ex.id} className="space-y-2">
                    <label
                      className={cn(
                        'ft-today-picker-row',
                        checked && 'ft-today-picker-row--selected',
                        sequenceLocked && 'ft-today-picker-row--locked'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={sequenceLocked}
                        onChange={() => {
                           if (checked) {
                             onPicksChange(picks.filter(p => p.exerciseId !== ex.id));
                           } else {
                             onPicksChange([...picks, { id: generateId(), exerciseId: ex.id, variation: ex.variations[0] ?? 'Standard' }]);
                           }
                        }}
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
                          {pickVariations.join(', ')}
                        </span>
                      )}
                      {!checked && (
                        <span className="text-xs text-muted-foreground shrink-0">{ex.equipment}</span>
                      )}
                    </label>
                    {checked &&
                      renderVariationList(ex, pickVariations, (v) => toggleVariation(ex.id, v))}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className={cn('border-t border-border pt-4 space-y-3', sequenceLocked && 'opacity-50 pointer-events-none')}>
        <button
          type="button"
          onClick={() => !sequenceLocked && setShowAddPanel(!showAddPanel)}
          disabled={sequenceLocked}
          className="ft-btn ft-btn--ghost ft-btn--block disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {sequenceLocked
            ? 'Unlock to add exercises'
            : showAddPanel
              ? 'Hide add exercise'
              : 'Exercise not in list? Add exercise & variation'}
        </button>

        {showAddPanel && !sequenceLocked && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="ft-input !pl-10"
                placeholder="Search exercises to add..."
                value={addPanelSearch}
                onChange={(e) => setAddPanelSearch(e.target.value)}
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
                    {renderVariationList(ex, pendingVariations, togglePendingVariation, false)}
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
                        onClick={() => addExerciseWithVariations(ex, pendingVariations)}
                      >
                        Add to picks
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : addableExercises.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                {addPanelSearch ? 'No matching exercises' : 'All library exercises are already listed above'}
              </p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {addableExercises.slice(0, 12).map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingAddId(ex.id);
                        setPendingVariations([ex.variations[0] ?? 'Standard']);
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
        {showUnlockDialog && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeUnlockDialog}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">Unlock today&apos;s picks</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter PIN to change exercises, variations, and their order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeUnlockDialog}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors shrink-0"
                  aria-label="Close unlock dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <PinConfirm
                value={unlockPin}
                onChange={(v) => {
                  setUnlockPin(v);
                  setUnlockPinError(false);
                }}
                error={unlockPinError}
                label="Enter password to unlock"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ft-btn ft-btn--secondary flex-1"
                  onClick={closeUnlockDialog}
                >
                  Cancel
                </button>
                <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={confirmUnlock}>
                  Unlock
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showSequenceModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSequenceModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex items-center justify-between gap-4 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ListOrdered className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Workout Sequence</h3>
                    <p className="text-xs text-muted-foreground">
                      {sequenceLocked
                        ? 'Training order for today'
                        : 'Drag items to reorder your training sequence'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSequenceModal(false)}
                  className="p-3 rounded-2xl text-muted-foreground hover:bg-muted/60 transition-colors shrink-0"
                  aria-label="Close sequence modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                {sequenceLocked ? (
                  <div className="space-y-2">
                    {picks.map((pick, index) => renderSequenceRow(pick, index, false))}
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={picks}
                    onReorder={onPicksChange}
                    className="space-y-2"
                  >
                    {picks.map((pick, index) => renderSequenceRow(pick, index, true))}
                  </Reorder.Group>
                )}
              </div>

              <div className="p-6 border-t border-border bg-muted/20 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    type="button"
                    onClick={handleLockToggle}
                    className={cn(
                      'ft-btn ft-btn--sm shrink-0 shadow-sm',
                      sequenceLocked ? 'ft-btn--secondary' : 'ft-btn--primary'
                    )}
                  >
                    {sequenceLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <LockOpen className="h-4 w-4" />
                    )}
                    {sequenceLocked ? 'Unlock plan' : 'Lock this plan'}
                  </button>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {sequenceLocked
                      ? 'Synced to your account — enter PIN 0000 to unlock'
                      : 'Lock to save this sequence to your account on all devices'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSequenceModal(false)}
                  className="ft-btn ft-btn--secondary ft-btn--block shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
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
