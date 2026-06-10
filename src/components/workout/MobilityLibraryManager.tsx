'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Eye, Flame, ImageIcon, Link2, Trash2, Wind, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { getAllMobilityExercises, groupMobilityByMuscle } from '@/workout/mobilityLibrary';
import { MUSCLE_COLORS, SPLIT_NAMES } from '@/workout/constants';
import type { BodyPartFilter, ImageUploadFilter, MobilityExercise, MobilityType, MuscleGroup } from '@/workout/types';
import {
  defaultMobilityImageUrl,
  getVariationsMissingUploadedImage,
  mobilityImageKey,
  mobilityStorageId,
  toSubVariationLabel,
  validateImageHttpUrl,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

interface MobilityLibraryManagerProps {
  mobilityType: MobilityType;
  search: string;
  bodyPart: BodyPartFilter;
  imageFilter: ImageUploadFilter;
}

function mobilityHasMissingImage(
  mobilityId: string,
  variations: string[],
  getImage: (mobilityId: string, variation: string) => string | undefined
): boolean {
  return getVariationsMissingUploadedImage(mobilityStorageId(mobilityId), variations, (_exId, v) =>
    getImage(mobilityId, v)
  ).length > 0;
}

function getMobilityVariationsMissingImage(
  mobilityId: string,
  variations: string[],
  getImage: (mobilityId: string, variation: string) => string | undefined
): string[] {
  return getVariationsMissingUploadedImage(mobilityStorageId(mobilityId), variations, (_exId, v) =>
    getImage(mobilityId, v)
  );
}

export function MobilityLibraryManager({
  mobilityType,
  search,
  bodyPart,
  imageFilter,
}: MobilityLibraryManagerProps) {
  const {
    getMobilityImage,
    setMobilityImage,
    removeMobilityImage,
    uploadMobilityImageFromFile,
  } = useWorkoutStore();

  const [collapsedMuscles, setCollapsedMuscles] = useState<Set<string>>(new Set());
  const [urlEditKey, setUrlEditKey] = useState<string | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);

  const allExercises = useMemo(() => getAllMobilityExercises(mobilityType), [mobilityType]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allExercises.filter((ex) => {
      const matchSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.targetMuscles.some((m) => m.toLowerCase().includes(q)) ||
        ex.splitIds.some((s) => SPLIT_NAMES[s].toLowerCase().includes(q)) ||
        ex.variations.some((v) => v.toLowerCase().includes(q));
      const matchBodyPart =
        bodyPart === 'All' || ex.targetMuscles.includes(bodyPart as MuscleGroup);
      const matchImage =
        imageFilter === 'all' ||
        mobilityHasMissingImage(ex.id, ex.variations, getMobilityImage);
      return matchSearch && matchBodyPart && matchImage;
    });
  }, [allExercises, search, bodyPart, imageFilter, getMobilityImage]);

  const grouped = useMemo(() => groupMobilityByMuscle(filtered), [filtered]);

  const { totalVariations, missingImageCount } = useMemo(() => {
    let variations = 0;
    let missing = 0;
    for (const ex of filtered) {
      const displayVars =
        imageFilter === 'missing'
          ? getMobilityVariationsMissingImage(ex.id, ex.variations, getMobilityImage)
          : ex.variations;
      variations += displayVars.length;
      missing += getMobilityVariationsMissingImage(ex.id, ex.variations, getMobilityImage).length;
    }
    return { totalVariations: variations, missingImageCount: missing };
  }, [filtered, imageFilter, getMobilityImage]);

  const toggleMuscle = (muscle: string) => {
    setCollapsedMuscles((prev) => {
      const next = new Set(prev);
      if (next.has(muscle)) next.delete(muscle);
      else next.add(muscle);
      return next;
    });
  };

  const applyImageUrl = useCallback(
    (mobilityId: string, variation: string) => {
      const key = mobilityImageKey(mobilityId, variation);
      const trimmed = (urlInputs[key] ?? '').trim();
      const error = validateImageHttpUrl(trimmed);
      if (error) {
        toast.error(error);
        return;
      }
      setMobilityImage(mobilityId, variation, trimmed);
      setUrlEditKey(null);
      toast.success('Image saved');
    },
    [setMobilityImage, urlInputs]
  );

  const renderVariationRow = (ex: MobilityExercise, variation: string, varIndex: number) => {
    const storedImage = getMobilityImage(ex.id, variation);
    const thumb = storedImage ?? defaultMobilityImageUrl(ex.id);
    const rowKey = mobilityImageKey(ex.id, variation);
    const urlOpen = urlEditKey === rowKey;
    const urlValue = urlInputs[rowKey] ?? (storedImage?.startsWith('http') ? storedImage : '');

    return (
      <li key={rowKey} className="ft-library-variation-item">
        <div className="ft-sequence-variation-row ft-library-variation-row">
          <span className="ft-sequence-sub-index">{toSubVariationLabel(varIndex)})</span>
          <img
            src={thumb}
            alt=""
            className="ft-today-variation-thumb shrink-0 !w-7 !h-7"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultMobilityImageUrl(ex.id);
            }}
          />
          <span className="text-sm text-foreground/90 flex-1 min-w-0 truncate">{variation}</span>
          <div className="flex items-center gap-0.5 shrink-0">
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
            {storedImage && (
              <button
                type="button"
                className="ft-library-icon-btn ft-library-icon-btn--danger"
                onClick={() => removeMobilityImage(ex.id, variation)}
                aria-label={`Remove image for ${variation}`}
                title="Remove image"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {urlOpen && (
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
                    void uploadMobilityImageFromFile(ex.id, variation, file).then(() => {
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

  const renderExerciseBlock = (ex: MobilityExercise, index: number) => {
    const variations =
      imageFilter === 'missing'
        ? getMobilityVariationsMissingImage(ex.id, ex.variations, getMobilityImage)
        : ex.variations;
    const splitLabels = ex.splitIds.map((s) => SPLIT_NAMES[s]).join(', ');

    return (
      <div key={ex.id} className="ft-sequence-exercise-block ft-library-exercise-block">
        <div className="ft-sequence-row ft-sequence-row--exercise">
          <span className="ft-sequence-index">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{ex.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {splitLabels} · {ex.repsLabel ?? '—'} · {variations.length} variation
              {variations.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 shrink-0 justify-end max-w-[40%]">
            {ex.targetMuscles.map((m) => (
              <span
                key={m}
                className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${MUSCLE_COLORS[m] ?? 'hsl(var(--primary))'}20`,
                  color: MUSCLE_COLORS[m] ?? 'hsl(var(--primary))',
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="ft-sequence-variations">
          <ul className="ft-sequence-variation-list">
            {variations.map((v, i) => renderVariationRow(ex, v, i))}
          </ul>
        </div>
      </div>
    );
  };

  const typeLabel = mobilityType === 'warmup' ? 'warm-up' : 'stretch';
  const TypeIcon = mobilityType === 'warmup' ? Flame : Wind;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> {typeLabel}{' '}
          moves ·{' '}
          <span className="font-semibold text-foreground tabular-nums">{totalVariations}</span>{' '}
          {imageFilter === 'missing' ? 'variations need images' : 'variations'}
          {imageFilter === 'all' && missingImageCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {' '}
              · {missingImageCount} not uploaded
            </span>
          )}
        </p>
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full inline-flex items-center gap-1.5',
            mobilityType === 'warmup'
              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
              : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
          )}
        >
          <TypeIcon className="h-3.5 w-3.5" />
          {mobilityType === 'warmup' ? 'Warm-up' : 'Stretching'}
        </span>
      </div>

      {grouped.length === 0 ? (
        <div className="ft-card ft-card-padded text-center text-muted-foreground text-sm">
          {imageFilter === 'missing'
            ? `All ${typeLabel} variations have images uploaded — nothing left to add.`
            : `No ${typeLabel} moves match your filters.`}
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
    </div>
  );
}
