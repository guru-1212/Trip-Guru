import dayjs from 'dayjs';
import type { ProgressMediaKind, ProgressPhoto } from './types';
import { getWeekStart } from './utils';

// ── Upload constraints ──────────────────────────────────────────────
// Allowed: gif, video, svg, png, jpg, jpeg, webp
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

export const ALLOWED_EXTENSIONS = ['gif', 'svg', 'png', 'jpg', 'jpeg', 'webp'] as const;

/** `accept` attribute for the file input. */
export const PROGRESS_ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/*';

export const MAX_IMAGE_BYTES = 100 * 1024; // 100 KB per image
export const MAX_VIDEO_BYTES = 3 * 1024 * 1024; // 3 MB per video

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split('/').pop() ?? '';
  if (fromType === 'svg+xml') return 'svg';
  if (fromType === 'quicktime') return 'mov';
  return fromType.toLowerCase() || 'bin';
}

export function detectKind(file: File): ProgressMediaKind | null {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('video/')) return 'video';
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) return 'image';
  // Fallback to extension when the browser doesn't report a MIME type.
  const ext = fileExtension(file);
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv', 'avi', 'mkv'].includes(ext)) return 'video';
  if ((ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return 'image';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Raster formats we can safely re-encode/compress with a canvas. */
const RASTER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const RASTER_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function isRasterImage(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (RASTER_MIME.includes(type)) return true;
  return RASTER_EXTENSIONS.includes(fileExtension(file));
}

/** Multi-stage progress for the upload UI. */
export type UploadProgress =
  | { stage: 'compressing' }
  | { stage: 'uploading'; percent: number }
  | { stage: 'saving' };

export interface PreparedUpload {
  blob: Blob;
  kind: ProgressMediaKind;
  ext: string;
  contentType: string;
  compressed: boolean;
  width?: number;
  height?: number;
}

export type PrepareResult = { ok: true; data: PreparedUpload } | { ok: false; error: string };

/**
 * Instant, synchronous check on file pick. Only rejects things compression
 * can't fix: unsupported formats, oversized videos, oversized GIF/SVG.
 * Raster images always pass here — they get compressed at upload time.
 */
export function precheckProgressFile(
  file: File
): { ok: true; kind: ProgressMediaKind } | { ok: false; error: string } {
  const kind = detectKind(file);
  if (!kind) {
    return { ok: false, error: 'Unsupported format. Allowed: JPG, PNG, WEBP, GIF, SVG or video.' };
  }
  if (kind === 'video' && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: `Video is ${formatBytes(file.size)} — max is 3 MB.` };
  }
  if (kind === 'image' && !isRasterImage(file) && file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `${fileExtension(file).toUpperCase()} is ${formatBytes(
        file.size
      )} and can't be compressed — max is 100 KB.`,
    };
  }
  return { ok: true, kind };
}

// ── Client-side image compression (canvas) ──────────────────────────
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

function supportsWebpEncode(): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Downscale + re-encode a raster image until it fits under `maxBytes`.
 * Prefers WEBP (smaller, keeps alpha) and falls back to JPEG.
 */
export async function compressRasterImage(
  file: File,
  maxBytes: number
): Promise<PreparedUpload | null> {
  const img = await loadImageEl(await readFileAsDataUrl(file));
  const useWebp = supportsWebpEncode();
  const type = useWebp ? 'image/webp' : 'image/jpeg';
  const ext = useWebp ? 'webp' : 'jpg';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const scales = [1, 0.85, 0.7, 0.55, 0.45, 0.35, 0.25];
  const qualities = [0.82, 0.72, 0.62, 0.5, 0.4];
  let smallest: PreparedUpload | null = null;

  for (const scale of scales) {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of qualities) {
      const blob = await canvasToBlob(canvas, type, q);
      if (!blob) continue;
      const candidate: PreparedUpload = {
        blob,
        kind: 'image',
        ext,
        contentType: type,
        compressed: true,
        width: w,
        height: h,
      };
      if (!smallest || blob.size < smallest.blob.size) smallest = candidate;
      if (blob.size <= maxBytes) return candidate;
    }
  }
  return smallest && smallest.blob.size <= maxBytes ? smallest : null;
}

/**
 * Prepare a file for upload: validate, and auto-compress raster images to fit
 * the 100 KB cap. GIF/SVG/video are passed through unchanged.
 */
export async function prepareProgressUpload(file: File): Promise<PrepareResult> {
  const kind = detectKind(file);
  if (!kind) {
    return { ok: false, error: 'Unsupported format. Allowed: JPG, PNG, WEBP, GIF, SVG or video.' };
  }

  if (kind === 'video') {
    if (file.size > MAX_VIDEO_BYTES) {
      return { ok: false, error: `Video is ${formatBytes(file.size)} — max is 3 MB.` };
    }
    return {
      ok: true,
      data: {
        blob: file,
        kind,
        ext: fileExtension(file),
        contentType: file.type || 'video/mp4',
        compressed: false,
      },
    };
  }

  // GIF / SVG can't be canvas-compressed without losing animation/vector data.
  if (!isRasterImage(file)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: `${fileExtension(file).toUpperCase()} is ${formatBytes(
          file.size
        )} and can't be compressed — max is 100 KB.`,
      };
    }
    return {
      ok: true,
      data: {
        blob: file,
        kind: 'image',
        ext: fileExtension(file),
        contentType: file.type || 'image/*',
        compressed: false,
      },
    };
  }

  // Raster image → always compress (keeps storage small); fall back to the
  // original only if compression somehow produced a larger file.
  const compressed = await compressRasterImage(file, MAX_IMAGE_BYTES).catch(() => null);
  if (compressed) {
    if (file.size <= MAX_IMAGE_BYTES && compressed.blob.size >= file.size) {
      return {
        ok: true,
        data: {
          blob: file,
          kind: 'image',
          ext: fileExtension(file),
          contentType: file.type || 'image/jpeg',
          compressed: false,
        },
      };
    }
    return { ok: true, data: compressed };
  }

  if (file.size <= MAX_IMAGE_BYTES) {
    return {
      ok: true,
      data: {
        blob: file,
        kind: 'image',
        ext: fileExtension(file),
        contentType: file.type || 'image/jpeg',
        compressed: false,
      },
    };
  }
  return {
    ok: false,
    error: "Couldn't compress this image under 100 KB. Try a smaller photo.",
  };
}

// ── Grouping (daily / weekly) ───────────────────────────────────────
export interface ProgressGroup {
  /** Stable key (a YYYY-MM-DD date for daily, week-start date for weekly). */
  key: string;
  /** Human label, e.g. "Today", "This Week", "Mon, Jul 14 – Sun, Jul 20". */
  label: string;
  /** Secondary line, e.g. weekday + full date, or item count context. */
  sublabel: string;
  photos: ProgressPhoto[];
}

function sortNewestFirst(photos: ProgressPhoto[]): ProgressPhoto[] {
  return [...photos].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.capturedAt - a.capturedAt;
  });
}

function dailyLabel(date: string): { label: string; sublabel: string } {
  const d = dayjs(date);
  const today = dayjs().startOf('day');
  const diff = today.diff(d.startOf('day'), 'day');
  if (diff === 0) return { label: 'Today', sublabel: d.format('dddd, MMM D, YYYY') };
  if (diff === 1) return { label: 'Yesterday', sublabel: d.format('dddd, MMM D, YYYY') };
  return { label: d.format('ddd, MMM D'), sublabel: d.format('YYYY') };
}

function weeklyLabel(weekStart: string): { label: string; sublabel: string } {
  const start = dayjs(weekStart);
  const end = start.add(6, 'day');
  const thisWeekStart = getWeekStart();
  const startDiffWeeks = dayjs(thisWeekStart).diff(start, 'week');
  const range = `${start.format('MMM D')} – ${end.format('MMM D')}`;
  if (startDiffWeeks === 0) return { label: 'This Week', sublabel: range };
  if (startDiffWeeks === 1) return { label: 'Last Week', sublabel: range };
  return { label: range, sublabel: start.format('YYYY') };
}

/** Group photos by calendar day, newest group first. */
export function groupPhotosByDay(photos: ProgressPhoto[]): ProgressGroup[] {
  const byDate = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    const list = byDate.get(p.date) ?? [];
    list.push(p);
    byDate.set(p.date, list);
  }
  return Array.from(byDate.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const { label, sublabel } = dailyLabel(date);
      return { key: date, label, sublabel, photos: sortNewestFirst(byDate.get(date) ?? []) };
    });
}

/** Group photos by Monday-based tracking week, newest group first. */
export function groupPhotosByWeek(photos: ProgressPhoto[]): ProgressGroup[] {
  const byWeek = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    const weekStart = getWeekStart(p.date);
    const list = byWeek.get(weekStart) ?? [];
    list.push(p);
    byWeek.set(weekStart, list);
  }
  return Array.from(byWeek.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((weekStart) => {
      const { label, sublabel } = weeklyLabel(weekStart);
      return { key: weekStart, label, sublabel, photos: sortNewestFirst(byWeek.get(weekStart) ?? []) };
    });
}
