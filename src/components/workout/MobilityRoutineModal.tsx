'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  CheckCircle2,
  Circle,
  Camera,
  Link2,
  Trash2,
  Flame,
  Wind,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MobilityExercise, MobilityType, SplitId } from '@/workout/types';
import {
  getWarmupForSplitMerged,
  getStretchForSplitMerged,
} from '@/workout/mobilityLibrary';
import { MUSCLE_COLORS } from '@/workout/constants';
import {
  defaultMobilityImageUrl,
  mobilityImageKey,
} from '@/workout/utils';
import { cn } from '@/lib/utils';

const EMPTY_SAVED_MOBILITY_PICKS: Record<string, string> = {};

interface MobilityRoutineModalProps {
  mode: MobilityType;
  splitId: SplitId;
  splitName: string;
  savedPicks?: Record<string, string>;
  getMobilityImage: (mobilityId: string, variation: string) => string | undefined;
  setMobilityImage: (mobilityId: string, variation: string, imageSrc: string) => void;
  uploadMobilityImageFromFile: (mobilityId: string, variation: string, file: File) => Promise<void>;
  removeMobilityImage: (mobilityId: string, variation: string) => void;
  onComplete: (variationPicks: Record<string, string>) => void;
  onSkip?: () => void;
  onClose?: () => void;
}

export function MobilityRoutineModal({
  mode,
  splitId,
  splitName,
  savedPicks,
  getMobilityImage,
  setMobilityImage,
  uploadMobilityImageFromFile,
  removeMobilityImage,
  onComplete,
  onSkip,
  onClose,
}: MobilityRoutineModalProps) {
  const effectiveSavedPicks = savedPicks ?? EMPTY_SAVED_MOBILITY_PICKS;
  const exercises = useMemo(
    () => (mode === 'warmup' ? getWarmupForSplitMerged(splitId) : getStretchForSplitMerged(splitId)),
    [mode, splitId]
  );

  const [variationPicks, setVariationPicks] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const ex of exercises) {
      initial[ex.id] = effectiveSavedPicks[ex.id] ?? ex.variations[0] ?? 'Standard';
    }
    return initial;
  });

  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [fullPreview, setFullPreview] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const ex of exercises) {
      initial[ex.id] = effectiveSavedPicks[ex.id] ?? ex.variations[0] ?? 'Standard';
    }
    setVariationPicks(initial);
    setDoneSet(new Set());
  }, [exercises, effectiveSavedPicks, mode, splitId]);

  const doneCount = doneSet.size;
  const totalCount = exercises.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const toggleDone = (id: string) => {
    setDoneSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImageUrl = useCallback(
    (mobilityId: string, variation: string) => {
      const key = mobilityImageKey(mobilityId, variation);
      const trimmed = (urlInputs[key] ?? '').trim();
      if (!trimmed) {
        toast.error('Enter an image URL');
        return;
      }
      setMobilityImage(mobilityId, variation, trimmed);
      setUrlInputs((prev) => ({ ...prev, [key]: '' }));
      toast.success('Image saved');
    },
    [urlInputs, setMobilityImage]
  );

  const handleImageUpload = async (mobilityId: string, variation: string, file: File) => {
    try {
      await uploadMobilityImageFromFile(mobilityId, variation, file);
      setUrlInputs((prev) => {
        const next = { ...prev };
        delete next[mobilityImageKey(mobilityId, variation)];
        return next;
      });
    } catch {
      toast.error('Could not process image. Try a smaller file or use an image URL.');
    }
  };

  const title = mode === 'warmup' ? `Warm-up for ${splitName}` : `Cool-down for ${splitName}`;
  const subtitle =
    mode === 'warmup'
      ? 'Complete each movement before starting your lifts'
      : 'Stretch the muscles you trained today';
  const completeLabel = mode === 'warmup' ? 'Start Recording' : 'Continue to Summary';
  const skipLabel = mode === 'warmup' ? 'Skip Warm-up' : 'Skip Stretching';
  const Icon = mode === 'warmup' ? Flame : Wind;

  return (
    <>
      <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-background rounded-t-[2rem] sm:rounded-[2rem] border border-border shadow-2xl overflow-hidden"
        >
          <div className="shrink-0 p-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                    mode === 'warmup' ? 'bg-orange-500/15 text-orange-500' : 'bg-teal-500/15 text-teal-500'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black tracking-tight truncate">{title}</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{subtitle}</p>
                </div>
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    mode === 'warmup' ? 'bg-orange-500' : 'bg-teal-500'
                  )}
                  style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground shrink-0">
                {doneCount}/{totalCount}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 no-scrollbar">
            {exercises.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No {mode === 'warmup' ? 'warm-up' : 'stretch'} routine for this split.
              </p>
            ) : (
              exercises.map((ex, idx) => (
                <MobilityCard
                  key={ex.id}
                  exercise={ex}
                  index={idx + 1}
                  mode={mode}
                  variation={variationPicks[ex.id] ?? ex.variations[0]}
                  done={doneSet.has(ex.id)}
                  imageExpanded={expandedImage === ex.id}
                  urlInputs={urlInputs}
                  getMobilityImage={getMobilityImage}
                  onToggleDone={() => toggleDone(ex.id)}
                  onVariationChange={(v) => setVariationPicks((prev) => ({ ...prev, [ex.id]: v }))}
                  onToggleImageExpand={() =>
                    setExpandedImage((prev) => (prev === ex.id ? null : ex.id))
                  }
                  onPreviewImage={(src, alt) => setFullPreview({ src, alt })}
                  onUrlInputChange={(key, val) =>
                    setUrlInputs((prev) => ({ ...prev, [key]: val }))
                  }
                  onApplyUrl={() => handleImageUrl(ex.id, variationPicks[ex.id] ?? ex.variations[0])}
                  onUpload={(file) =>
                    handleImageUpload(ex.id, variationPicks[ex.id] ?? ex.variations[0], file)
                  }
                  onRemoveImage={() => {
                    removeMobilityImage(ex.id, variationPicks[ex.id] ?? ex.variations[0]);
                    setUrlInputs((prev) => {
                      const next = { ...prev };
                      delete next[mobilityImageKey(ex.id, variationPicks[ex.id] ?? ex.variations[0])];
                      return next;
                    });
                  }}
                />
              ))
            )}
          </div>

          <div className="shrink-0 p-4 sm:p-6 border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              {onSkip && (
                <button
                  type="button"
                  onClick={onSkip}
                  className="ft-btn ft-btn--secondary ft-btn--block ft-btn--lg sm:flex-1"
                >
                  {skipLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => onComplete(variationPicks)}
                className="ft-btn ft-btn--primary ft-btn--block ft-btn--lg sm:flex-1"
              >
                {allDone ? (
                  <>
                    <Check className="h-4 w-4" />
                    {completeLabel}
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    {mode === 'warmup' ? 'Start Recording Anyway' : 'Continue Anyway'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {fullPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95"
            onClick={() => setFullPreview(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 p-3 rounded-2xl bg-white/10 text-white"
              onClick={() => setFullPreview(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={fullPreview.src}
              alt={fullPreview.alt}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface MobilityCardProps {
  exercise: MobilityExercise;
  index: number;
  mode: MobilityType;
  variation: string;
  done: boolean;
  imageExpanded: boolean;
  urlInputs: Record<string, string>;
  getMobilityImage: (mobilityId: string, variation: string) => string | undefined;
  onToggleDone: () => void;
  onVariationChange: (v: string) => void;
  onToggleImageExpand: () => void;
  onPreviewImage: (src: string, alt: string) => void;
  onUrlInputChange: (key: string, val: string) => void;
  onApplyUrl: () => void;
  onUpload: (file: File) => void;
  onRemoveImage: () => void;
}

function MobilityCard({
  exercise,
  index,
  mode,
  variation,
  done,
  imageExpanded,
  urlInputs,
  getMobilityImage,
  onToggleDone,
  onVariationChange,
  onToggleImageExpand,
  onPreviewImage,
  onUrlInputChange,
  onApplyUrl,
  onUpload,
  onRemoveImage,
}: MobilityCardProps) {
  const storedImage = getMobilityImage(exercise.id, variation);
  const thumb = storedImage ?? defaultMobilityImageUrl(exercise.id);
  const urlKey = mobilityImageKey(exercise.id, variation);
  const urlValue = urlInputs[urlKey] ?? (storedImage?.startsWith('http') ? storedImage : '');
  const hasCustomImage = !!storedImage;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors overflow-hidden',
        done
          ? mode === 'warmup'
            ? 'border-orange-500/30 bg-orange-500/5'
            : 'border-teal-500/30 bg-teal-500/5'
          : 'border-border bg-card'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleDone}
            aria-pressed={done}
            aria-label={done ? 'Mark not done' : 'Mark done'}
            className={cn(
              'shrink-0 mt-0.5 h-8 w-8 rounded-xl border flex items-center justify-center transition-colors',
              done
                ? mode === 'warmup'
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-teal-500 bg-teal-500 text-white'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {done ? (
              <CheckCircle2
                className="h-4 w-4"
              />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {index}
              </span>
              <h3 className="font-bold text-sm truncate">{exercise.name}</h3>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {exercise.targetMuscles.map((m) => (
                <span
                  key={m}
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{
                    backgroundColor: `${MUSCLE_COLORS[m] ?? '#888'}22`,
                    color: MUSCLE_COLORS[m] ?? '#888',
                  }}
                >
                  {m}
                </span>
              ))}
              {exercise.repsLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {exercise.repsLabel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {exercise.variations.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onVariationChange(v)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors',
                    variation === v
                      ? mode === 'warmup'
                        ? 'bg-orange-500 text-white'
                        : 'bg-teal-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>

            {exercise.tips.length > 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">{exercise.tips[0]}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPreviewImage(thumb, `${exercise.name} — ${variation}`)}
            className="shrink-0 rounded-xl overflow-hidden border border-border w-14 h-14 hover:ring-2 hover:ring-primary/40 transition-shadow"
          >
            <img
              src={thumb}
              alt={exercise.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultMobilityImageUrl(exercise.id);
              }}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleImageExpand}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <Camera className="h-3.5 w-3.5" />
          {imageExpanded ? 'Hide image upload' : 'Upload variation image'}
          {imageExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <AnimatePresence>
          {imageExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-2 border-t border-border/60 mt-3">
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="url"
                      className="ft-input !h-9 !pl-8 text-xs"
                      placeholder="Paste image URL (https://...)"
                      value={urlValue}
                      onChange={(e) => onUrlInputChange(urlKey, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onApplyUrl();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="ft-btn ft-btn--secondary ft-btn--sm shrink-0 !min-h-[36px]"
                    onClick={onApplyUrl}
                  >
                    Apply
                  </button>
                  {hasCustomImage && (
                    <button
                      type="button"
                      className="ft-btn ft-btn--ghost ft-btn--icon ft-btn--sm !text-red-500 shrink-0"
                      onClick={onRemoveImage}
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <label className="ft-btn ft-btn--ghost ft-btn--sm ft-btn--block cursor-pointer !min-h-[36px]">
                  <Camera className="h-4 w-4" />
                  Upload from device
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onUpload(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
