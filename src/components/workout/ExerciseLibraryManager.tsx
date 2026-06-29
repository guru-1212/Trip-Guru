'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Eye,
  ImageIcon,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PinConfirm, FINISH_WORKOUT_PIN } from '@/components/workout/PinConfirm';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import { MUSCLE_COLORS } from '@/workout/constants';
import type {
  BodyPartFilter,
  CustomExercise,
  ImageUploadFilter,
  LibraryExercise,
  MuscleGroup,
} from '@/workout/types';
import {
  canRemoveVariation,
  canRenameVariation,
  defaultExerciseImageUrl,
  exerciseHasMissingUploadedImage,
  exerciseMatchesSearch,
  getVariationsMissingUploadedImage,
  groupLibraryExercisesByMuscleAll,
  toSubVariationLabel,
  validateImageHttpUrl,
  variationImageKey,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

interface ExerciseLibraryManagerProps {
  search: string;
  bodyPart: BodyPartFilter;
  imageFilter: ImageUploadFilter;
}

export function ExerciseLibraryManager({ search, bodyPart, imageFilter }: ExerciseLibraryManagerProps) {
  const {
    customExercises,
    customVariations,
    getVariationsForExercise,
    getVariationImage,
    setVariationImage,
    removeVariationImage,
    uploadVariationImageFromFile,
    addVariation,
    removeVariation,
    renameVariation,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
  } = useWorkoutStore();

  const [collapsedMuscles, setCollapsedMuscles] = useState<Set<string>>(new Set());
  const [urlEditKey, setUrlEditKey] = useState<string | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [newVariationByExercise, setNewVariationByExercise] = useState<Record<string, string>>({});
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CustomExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomExercise | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deletePinError, setDeletePinError] = useState(false);

  const customIds = useMemo(() => new Set(customExercises.map((c) => c.id)), [customExercises]);

  const allExercises = useMemo(() => {
    const custom: LibraryExercise[] = customExercises.map((c) => ({
      id: c.id,
      name: c.name,
      muscle: c.muscle,
      secondary: c.secondary,
      equipment: c.equipment,
      difficulty: c.difficulty,
      variations: c.variations,
      tips: c.notes ? [c.notes] : [],
      splitIds: [],
      category: [c.muscle, 'Isolation'],
    }));
    return [...EXERCISE_LIBRARY, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    return allExercises.filter((ex) => {
      const variations = getVariationsForExercise(ex.id, ex.variations);
      const matchSearch = exerciseMatchesSearch(ex, search, variations);
      const matchBodyPart = bodyPart === 'All' || ex.muscle === bodyPart;
      const matchImage =
        imageFilter === 'all' ||
        exerciseHasMissingUploadedImage(ex.id, variations, getVariationImage);
      return matchSearch && matchBodyPart && matchImage;
    });
  }, [allExercises, search, bodyPart, imageFilter, getVariationsForExercise, getVariationImage]);

  const grouped = useMemo(() => groupLibraryExercisesByMuscleAll(filtered), [filtered]);

  const { totalVariations, missingImageCount } = useMemo(() => {
    let variations = 0;
    let missing = 0;
    for (const ex of filtered) {
      const allVars = getVariationsForExercise(ex.id, ex.variations);
      const displayVars =
        imageFilter === 'missing'
          ? getVariationsMissingUploadedImage(ex.id, allVars, getVariationImage)
          : allVars;
      variations += displayVars.length;
      missing += getVariationsMissingUploadedImage(ex.id, allVars, getVariationImage).length;
    }
    return { totalVariations: variations, missingImageCount: missing };
  }, [filtered, imageFilter, getVariationsForExercise, getVariationImage]);

  const toggleMuscle = (muscle: string) => {
    setCollapsedMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  };

  const applyImageUrl = useCallback(
    (exerciseId: string, variation: string) => {
      const key = variationImageKey(exerciseId, variation);
      const trimmed = (urlInputs[key] ?? '').trim();
      const error = validateImageHttpUrl(trimmed);
      if (error) {
        toast.error(error);
        return;
      }
      setVariationImage(exerciseId, variation, trimmed);
      setUrlEditKey(null);
    },
    [setVariationImage, urlInputs]
  );

  const startRename = (exerciseId: string, variation: string) => {
    const key = variationImageKey(exerciseId, variation);
    setRenamingKey(key);
    setRenameDraft(variation);
  };

  const commitRename = (ex: LibraryExercise, oldName: string) => {
    renameVariation(ex.id, oldName, renameDraft, ex.variations);
    setRenamingKey(null);
    setRenameDraft('');
  };

  const handleAddVariation = (ex: LibraryExercise) => {
    const trimmed = (newVariationByExercise[ex.id] ?? '').trim();
    if (!trimmed) {
      toast.error('Enter a variation name');
      return;
    }
    const existing = getVariationsForExercise(ex.id, ex.variations);
    if (existing.includes(trimmed)) {
      toast.error('Variation already exists');
      return;
    }
    if (customIds.has(ex.id)) {
      updateCustomExercise(ex.id, { variations: [...existing, trimmed] });
    } else {
      addVariation(ex.id, trimmed);
    }
    setNewVariationByExercise((prev) => ({ ...prev, [ex.id]: '' }));
  };

  const renderVariationRow = (ex: LibraryExercise, variation: string, varIndex: number) => {
    const isCustom = customIds.has(ex.id);
    const storedImage = getVariationImage(ex.id, variation);
    const thumb = storedImage ?? defaultExerciseImageUrl(ex.id);
    const rowKey = variationImageKey(ex.id, variation);
    const urlOpen = urlEditKey === rowKey;
    const renaming = renamingKey === rowKey;
    const urlValue =
      urlInputs[rowKey] ?? (storedImage?.startsWith('http') ? storedImage : '');
    const removable = canRemoveVariation(
      isCustom,
      variation,
      getVariationsForExercise(ex.id, ex.variations),
      ex.id,
      ex.variations,
      customVariations
    );
    const renamable = canRenameVariation(
      isCustom,
      variation,
      ex.id,
      ex.variations,
      customVariations
    );

    return (
      <li key={rowKey} className="ft-library-variation-item">
        <div className="ft-sequence-variation-row ft-library-variation-row">
        <span className="ft-sequence-sub-index">{toSubVariationLabel(varIndex)})</span>
        <img
          src={thumb}
          alt=""
          className="ft-today-variation-thumb shrink-0 !w-7 !h-7"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultExerciseImageUrl(ex.id);
          }}
        />
        {renaming ? (
          <input
            className="ft-input !h-8 text-xs flex-1 min-w-0"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename(ex, variation);
              if (e.key === 'Escape') setRenamingKey(null);
            }}
            autoFocus
          />
        ) : (
          <span className="text-sm text-foreground/90 flex-1 min-w-0 truncate">{variation}</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          {renaming ? (
            <>
              <button
                type="button"
                className="ft-library-icon-btn ft-library-icon-btn--primary"
                onClick={() => commitRename(ex, variation)}
                aria-label="Save variation name"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="ft-library-icon-btn"
                onClick={() => setRenamingKey(null)}
                aria-label="Cancel rename"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="ft-library-icon-btn"
                onClick={() => setImagePreview({ src: thumb, alt: `${ex.name} — ${variation}` })}
                aria-label={`Preview ${variation}`}
                title="Preview image"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className={cn('ft-library-icon-btn', urlOpen && 'ft-library-icon-btn--active')}
                onClick={() => setUrlEditKey(urlOpen ? null : rowKey)}
                aria-label={`Set image URL for ${variation}`}
                title="Paste image URL"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
              {renamable && (
                <button
                  type="button"
                  className="ft-library-icon-btn"
                  onClick={() => startRename(ex.id, variation)}
                  aria-label={`Rename ${variation}`}
                  title="Rename variation"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {storedImage && (
                <button
                  type="button"
                  className="ft-library-icon-btn ft-library-icon-btn--danger"
                  onClick={() => removeVariationImage(ex.id, variation)}
                  aria-label={`Remove image for ${variation}`}
                  title="Remove image"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
              )}
              {removable && (
                <button
                  type="button"
                  className="ft-library-icon-btn ft-library-icon-btn--danger"
                  onClick={() => removeVariation(ex.id, variation, ex.variations)}
                  aria-label={`Delete ${variation}`}
                  title="Remove variation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
        </div>
        {urlOpen && !renaming && (
          <div className="ft-library-url-panel">
            <div className="flex gap-2">
              <input
                type="url"
                className="ft-input !h-8 text-xs flex-1 min-w-0"
                placeholder="https://image-url..."
                value={urlValue}
                onChange={(e) =>
                  setUrlInputs((prev) => ({ ...prev, [rowKey]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyImageUrl(ex.id, variation);
                  }
                }}
              />
              <button
                type="button"
                className="ft-btn ft-btn--secondary ft-btn--sm shrink-0"
                onClick={() => applyImageUrl(ex.id, variation)}
              >
                Save
              </button>
            </div>
            <label className="ft-library-file-upload">
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void uploadVariationImageFromFile(ex.id, variation, file).then(() => {
                      setUrlEditKey(null);
                    });
                    e.target.value = '';
                  }
                }}
              />
              Upload from device
            </label>
          </div>
        )}
      </li>
    );
  };

  const renderExerciseBlock = (ex: LibraryExercise, index: number) => {
    const isCustom = customIds.has(ex.id);
    const allVariations = getVariationsForExercise(ex.id, ex.variations);
    const variations =
      imageFilter === 'missing'
        ? getVariationsMissingUploadedImage(ex.id, allVariations, getVariationImage)
        : allVariations;
    const customExercise = customExercises.find((c) => c.id === ex.id);

    return (
      <div key={ex.id} className="ft-sequence-exercise-block ft-library-exercise-block">
        <div className="ft-sequence-row ft-sequence-row--exercise">
          <span className="ft-sequence-index">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{ex.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {ex.equipment} · {ex.difficulty} · {variations.length} variation
              {variations.length === 1 ? '' : 's'}
            </p>
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0"
            style={{
              backgroundColor: `${MUSCLE_COLORS[ex.muscle] ?? 'hsl(var(--primary))'}20`,
              color: MUSCLE_COLORS[ex.muscle] ?? 'hsl(var(--primary))',
            }}
          >
            {ex.muscle}
          </span>
          {isCustom && customExercise && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                className="ft-library-icon-btn"
                onClick={() => {
                  setEditingExercise(customExercise);
                  setShowExerciseForm(true);
                }}
                aria-label={`Edit ${ex.name}`}
                title="Edit exercise"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="ft-library-icon-btn ft-library-icon-btn--danger"
                onClick={() => {
                  setDeleteTarget(customExercise);
                  setDeletePin('');
                  setDeletePinError(false);
                }}
                aria-label={`Delete ${ex.name}`}
                title="Delete exercise"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="ft-sequence-variations">
          <ul className="ft-sequence-variation-list">
            {variations.map((v, i) => renderVariationRow(ex, v, i))}
          </ul>
          <div className="ft-library-add-variation">
            <input
              className="ft-input !h-8 text-xs flex-1 min-w-0"
              placeholder="New variation name..."
              value={newVariationByExercise[ex.id] ?? ''}
              onChange={(e) =>
                setNewVariationByExercise((prev) => ({ ...prev, [ex.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddVariation(ex);
              }}
            />
            <button
              type="button"
              className="ft-btn ft-btn--ghost ft-btn--sm shrink-0"
              onClick={() => handleAddVariation(ex)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> exercises ·{' '}
          <span className="font-semibold text-foreground tabular-nums">{totalVariations}</span>{' '}
          {imageFilter === 'missing' ? 'variations need images' : 'variations'}
          {imageFilter === 'all' && missingImageCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {' '}
              · {missingImageCount} not uploaded
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setEditingExercise(null);
            setShowExerciseForm(true);
          }}
          className="ft-btn ft-btn--primary ft-btn--sm"
        >
          <Plus className="h-4 w-4" />
          Add Exercise
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="ft-card ft-card-padded text-center text-muted-foreground text-sm">
          {imageFilter === 'missing'
            ? 'All variations have images uploaded — nothing left to add.'
            : 'No exercises match your filters.'}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ muscle, exercises }) => {
            const collapsed = collapsedMuscles.has(muscle);
            return (
              <section key={muscle} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleMuscle(muscle)}
                  className="ft-library-muscle-header"
                >
                  <div
                    className="w-1 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: MUSCLE_COLORS[muscle] ?? 'hsl(var(--primary))' }}
                  />
                  <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex-1 text-left">
                    {muscle}
                  </h2>
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                    {exercises.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      collapsed && '-rotate-90'
                    )}
                  />
                </button>
                {!collapsed && (
                  <div className="ft-library-exercise-list space-y-2">
                    {exercises.map((ex, i) => renderExerciseBlock(ex, i))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {imagePreview && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImagePreview(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 right-0 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={imagePreview.src}
                alt={imagePreview.alt}
                className="max-w-full max-h-[calc(90vh-4rem)] object-contain rounded-xl shadow-2xl"
              />
              <p className="text-sm font-medium text-white/80 text-center px-4">{imagePreview.alt}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showExerciseForm && (
        <CustomExerciseFormModal
          initial={editingExercise}
          onClose={() => {
            setShowExerciseForm(false);
            setEditingExercise(null);
          }}
          onSave={(data) => {
            if (editingExercise) updateCustomExercise(editingExercise.id, data);
            else addCustomExercise(data);
            setShowExerciseForm(false);
            setEditingExercise(null);
          }}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="ft-card ft-card-padded max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h2 className="ft-title text-lg font-bold">Delete exercise?</h2>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>{deleteTarget.name}</strong> will be permanently removed.
              </p>
            </div>
            <PinConfirm
              value={deletePin}
              onChange={(v) => {
                setDeletePin(v);
                setDeletePinError(false);
              }}
              error={deletePinError}
              label="Enter password to delete"
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="ft-btn ft-btn--secondary flex-1"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ft-btn ft-btn--danger flex-1"
                onClick={() => {
                  if (deletePin !== FINISH_WORKOUT_PIN) {
                    setDeletePinError(true);
                    return;
                  }
                  deleteCustomExercise(deleteTarget.id);
                  setDeleteTarget(null);
                  setDeletePin('');
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomExerciseFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: CustomExercise | null;
  onClose: () => void;
  onSave: (data: Omit<CustomExercise, 'id'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [muscle, setMuscle] = useState<MuscleGroup>(initial?.muscle ?? 'Chest');
  const [secondary, setSecondary] = useState<MuscleGroup | ''>(initial?.secondary ?? '');
  const [equipment, setEquipment] = useState(initial?.equipment ?? 'Dumbbell');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'Beginner');
  const [variations, setVariations] = useState<string[]>(initial?.variations ?? ['Standard']);
  const [newVar, setNewVar] = useState('');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const muscles: MuscleGroup[] = [
    'Chest',
    'Back',
    'Shoulders',
    'Triceps',
    'Biceps',
    'Legs',
    'Core',
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="ft-card ft-card-padded max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="ft-title text-xl font-bold mb-4">{initial ? 'Edit' : 'Add'} Exercise</h2>
        <div className="space-y-3">
          <div>
            <label className="ft-label">Name</label>
            <input className="ft-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ft-label">Primary Muscle</label>
              <select
                className="ft-input mt-1"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
              >
                {muscles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ft-label">Secondary</label>
              <select
                className="ft-input mt-1"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value as MuscleGroup | '')}
              >
                <option value="">None</option>
                {muscles.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ft-label">Equipment</label>
              <input
                className="ft-input mt-1"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              />
            </div>
            <div>
              <label className="ft-label">Difficulty</label>
              <select
                className="ft-input mt-1"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="ft-label">Variations</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {variations.map((v, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded bg-muted/30 flex items-center gap-1"
                >
                  {v}
                  {variations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVariations(variations.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="ft-input flex-1"
                placeholder="Add variation"
                value={newVar}
                onChange={(e) => setNewVar(e.target.value)}
              />
              <button
                type="button"
                className="ft-btn ft-btn--secondary text-sm"
                onClick={() => {
                  if (newVar.trim()) {
                    setVariations([...variations, newVar.trim()]);
                    setNewVar('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
          <div>
            <label className="ft-label">Notes</label>
            <textarea
              className="ft-input mt-1 min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" className="ft-btn ft-btn--secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ft-btn ft-btn--primary flex-1"
            onClick={() => {
              if (!name.trim()) return;
              onSave({
                name: name.trim(),
                muscle,
                secondary: secondary || undefined,
                equipment,
                difficulty,
                variations: variations.length ? variations : ['Standard'],
                notes,
              });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
