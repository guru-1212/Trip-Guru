'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Camera,
  Plus,
  X,
  Trash2,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  CalendarDays,
  Play,
  Images,
  Info,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { PinConfirm, FINISH_WORKOUT_PIN } from '@/components/workout/PinConfirm';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import {
  PROGRESS_ACCEPT,
  validateProgressFile,
  groupPhotosByDay,
  groupPhotosByWeek,
  formatBytes,
  type ProgressValidation,
} from '@/workout/progressPhotos';
import type { ProgressMediaKind, ProgressPhoto } from '@/workout/types';
import { cn } from '@/lib/utils';

type ViewMode = 'daily' | 'weekly';

interface PendingUpload {
  file: File;
  previewUrl: string;
  kind: ProgressMediaKind;
  date: string;
  note: string;
}

export default function ProgressPhotosPage() {
  const { progressPhotos, addProgressPhoto, deleteProgressPhoto } = useWorkoutStore();

  const [view, setView] = useState<ViewMode>('daily');
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ProgressPhoto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgressPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the object URL only when the previewed file actually changes (or on
  // unmount) — not on every note/date keystroke, which would kill the preview.
  const pendingUrl = pending?.previewUrl;
  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    };
  }, [pendingUrl]);

  const groups = useMemo(
    () => (view === 'daily' ? groupPhotosByDay(progressPhotos) : groupPhotosByWeek(progressPhotos)),
    [progressPhotos, view]
  );

  const stats = useMemo(() => {
    const weekAgo = dayjs().subtract(7, 'day');
    const thisWeek = progressPhotos.filter((p) => !dayjs(p.date).isBefore(weekAgo, 'day')).length;
    const videos = progressPhotos.filter((p) => p.kind === 'video').length;
    return { total: progressPhotos.length, thisWeek, videos };
  }, [progressPhotos]);

  const handleFilePicked = (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const result: ProgressValidation = validateProgressFile(file);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPending({
      file,
      previewUrl: URL.createObjectURL(file),
      kind: result.kind,
      date: dayjs().format('YYYY-MM-DD'),
      note: '',
    });
  };

  // The URL is revoked by the effect above when `pending` clears.
  const cancelPending = () => setPending(null);

  const confirmUpload = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      await addProgressPhoto(pending.file, { date: pending.date, note: pending.note });
      setPending(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="ft-title text-2xl font-bold flex items-center gap-2">
              <Camera className="h-6 w-6 text-primary" />
              Progress Photos
            </h1>
            <p className="ft-subtitle mt-1 text-sm">
              Track your transformation — grouped by day and week.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
            aria-label="Add progress photo"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={PROGRESS_ACCEPT}
            className="hidden"
            onChange={(e) => handleFilePicked(e.target.files?.[0])}
          />
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total" value={String(stats.total)} icon={Images} />
          <StatTile label="Last 7 days" value={String(stats.thisWeek)} icon={CalendarDays} />
          <StatTile label="Videos" value={String(stats.videos)} icon={VideoIcon} />
        </div>

        {/* Format / size hint */}
        <div className="ft-card ft-card-padded flex items-start gap-3 bg-muted/20 !py-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            JPG, PNG, WEBP, GIF, SVG or video. Images up to{' '}
            <span className="font-semibold text-foreground">100&nbsp;KB</span>, videos up to{' '}
            <span className="font-semibold text-foreground">3&nbsp;MB</span>. Deleting requires your
            PIN.
          </p>
        </div>

        {/* Compose / upload card */}
        <AnimatePresence>
          {pending && (
            <motion.div
              key="compose-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="ft-card ft-card-padded space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">New progress {pending.kind}</p>
                  <button
                    type="button"
                    onClick={cancelPending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    aria-label="Cancel upload"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-4">
                  <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-border bg-muted/40">
                    {pending.kind === 'video' ? (
                      <video src={pending.previewUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img
                        src={pending.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pending.kind === 'video' ? (
                        <VideoIcon className="h-3 w-3" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                      {formatBytes(pending.file.size)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Date
                      <input
                        type="date"
                        value={pending.date}
                        max={dayjs().format('YYYY-MM-DD')}
                        onChange={(e) =>
                          setPending((p) => (p ? { ...p, date: e.target.value } : p))
                        }
                        className="ft-input mt-1 w-full"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Note <span className="font-normal">(optional)</span>
                      <input
                        type="text"
                        value={pending.note}
                        maxLength={120}
                        placeholder="e.g. morning, fasted, week 4"
                        onChange={(e) =>
                          setPending((p) => (p ? { ...p, note: e.target.value } : p))
                        }
                        className="ft-input mt-1 w-full"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelPending}
                    disabled={uploading}
                    className="ft-btn ft-btn--secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmUpload}
                    disabled={uploading}
                    className="ft-btn ft-btn--primary flex-1"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily / Weekly toggle */}
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-full max-w-xs">
          {(['daily', 'weekly'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors',
                view === mode ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
              )}
            >
              {mode === 'daily' ? 'Daily' : 'Weekly'}
            </button>
          ))}
        </div>

        {/* Gallery */}
        {groups.length === 0 ? (
          <div className="ft-card ft-card-padded flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Camera className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-bold">No progress photos yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap <span className="font-semibold text-foreground">Add</span> to upload your first
                photo or video.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-7">
            {groups.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-black uppercase tracking-widest text-foreground truncate">
                      {group.label}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">{group.sublabel}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                    {group.photos.length} {group.photos.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {group.photos.map((photo) => (
                    <MediaTile
                      key={photo.id}
                      photo={photo}
                      onOpen={() => setPreview(photo)}
                      onDelete={() => setDeleteTarget(photo)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setPreview(null)}
          >
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-4 right-4 p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="relative z-10 w-full max-w-3xl max-h-[86vh] flex flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {preview.kind === 'video' ? (
                <video
                  src={preview.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[74vh] rounded-xl shadow-2xl"
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.note ?? preview.fileName}
                  className="max-w-full max-h-[74vh] object-contain rounded-xl shadow-2xl"
                />
              )}
              <div className="text-center px-4">
                <p className="text-sm font-semibold text-white">
                  {dayjs(preview.date).format('dddd, MMM D, YYYY')} ·{' '}
                  {dayjs(preview.capturedAt).format('h:mm A')}
                </p>
                {preview.note && <p className="text-xs text-white/70 mt-0.5">{preview.note}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN-gated delete */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteDialog
            key="delete-dialog"
            photo={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={async () => {
              const target = deleteTarget;
              setDeleteTarget(null);
              await deleteProgressPhoto(target);
            }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
      <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

function MediaTile({
  photo,
  onOpen,
  onDelete,
}: {
  photo: ProgressPhoto;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/40">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 w-full h-full"
        aria-label={`Open progress ${photo.kind} from ${dayjs(photo.date).format('MMM D')}`}
      >
        {photo.kind === 'video' ? (
          <>
            <video src={photo.url} className="w-full h-full object-cover" muted preload="metadata" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </span>
          </>
        ) : (
          <img
            src={photo.url}
            alt={photo.note ?? photo.fileName}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}
      </button>

      <span className="pointer-events-none absolute bottom-1 left-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
        {dayjs(photo.capturedAt).format('h:mm A')}
      </span>

      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 transition-opacity hover:bg-red-500 focus:opacity-100 group-hover:opacity-100"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DeleteDialog({
  photo,
  onClose,
  onConfirm,
}: {
  photo: ProgressPhoto;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (pin !== FINISH_WORKOUT_PIN) {
      setError(true);
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <Trash2 className="h-6 w-6" />
          </div>
          <h2 className="ft-title text-lg">Delete this {photo.kind}?</h2>
          <p className="ft-subtitle mt-1.5 text-sm">
            From {dayjs(photo.date).format('MMM D, YYYY')}. This can&apos;t be undone.
          </p>
        </div>
        <PinConfirm
          value={pin}
          onChange={(v) => {
            setPin(v);
            setError(false);
          }}
          error={error}
          label="Enter PIN to delete"
        />
        <div className="flex flex-col gap-2.5">
          <button type="button" className="ft-btn ft-btn--secondary ft-btn--block" onClick={onClose}>
            Keep photo
          </button>
          <button type="button" className="ft-btn ft-btn--danger ft-btn--block" onClick={submit}>
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
