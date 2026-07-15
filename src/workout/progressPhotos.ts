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

export type ProgressValidation =
  | { ok: true; kind: ProgressMediaKind; ext: string }
  | { ok: false; error: string };

/** Validate format + size against the allowed types and per-kind size caps. */
export function validateProgressFile(file: File): ProgressValidation {
  const kind = detectKind(file);
  if (!kind) {
    return {
      ok: false,
      error: 'Unsupported format. Allowed: JPG, PNG, WEBP, GIF, SVG or video.',
    };
  }
  const limit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return {
      ok: false,
      error:
        kind === 'video'
          ? `Video is ${formatBytes(file.size)} — max is 3 MB.`
          : `Image is ${formatBytes(file.size)} — max is 100 KB.`,
    };
  }
  return { ok: true, kind, ext: fileExtension(file) };
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
