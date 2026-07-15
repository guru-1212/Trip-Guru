'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Sparkles, Download, Share2, ChevronLeft, ChevronRight, Loader2, CalendarDays, Check } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { RecapCard } from '@/components/fittrack/recap/RecapCard';
import { buildRecap, pickHeroPhoto, type RecapCardData, type RecapScope, type RecapTheme } from '@/workout/recapData';
import { captureCardPng, downloadShareCard, waitForShareCardPaint } from '@/workout/shareCard';
import { getWeekStart, getTrackingWeekRangeLabel } from '@/workout/utils';
import { getWaterLog, getWaterLogsInRange } from '@/firebase/water.firestore';
import { getNutritionLog, getNutritionLogsInRange } from '@/firebase/nutrition.firestore';
import type { WaterLogDoc } from '@/types/water';
import type { NutritionLogDoc } from '@/types/nutrition';
import { cn } from '@/lib/utils';

interface Rendered {
  card: RecapCardData;
  blob: Blob;
  url: string;
}

const TODAY = () => dayjs().format('YYYY-MM-DD');

const BG_OPTIONS: { value: RecapTheme; label: string; swatch: CSSProperties }[] = [
  { value: 'light', label: 'Light', swatch: { background: '#ffffff', border: '1px solid #cbd5e1' } },
  { value: 'dark', label: 'Dark', swatch: { background: '#0f172a' } },
  {
    value: 'transparent',
    label: 'Transparent',
    swatch: {
      backgroundImage:
        'linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%)',
      backgroundColor: '#ffffff',
      backgroundSize: '10px 10px',
      backgroundPosition: '0 0,0 5px,5px -5px,-5px 0',
    },
  },
];

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function cardFilename(card: RecapCardData, key: string, theme: RecapTheme): string {
  return `fittrack-${card.scope}-${card.type}-${key}-${theme}.png`;
}

async function shareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (d?: ShareData) => boolean;
    share?: (d?: ShareData) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'FitTrack Recap' });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  downloadShareCard(blob, filename);
  toast.success('Saved to your device');
}

export default function RecapPage() {
  const { profile, workouts, prs, bodyStats, habits, weeklyGoals, progressPhotos, fittrackOwnerId, hydrated } =
    useWorkoutStore();
  const uid = fittrackOwnerId;

  const [scope, setScope] = useState<RecapScope>('day');
  const [dayKey, setDayKey] = useState<string>(TODAY);
  const [weekStartKey, setWeekStartKey] = useState<string>(() => getWeekStart());
  const [theme, setTheme] = useState<RecapTheme>('light');
  const scopeKey = scope === 'day' ? dayKey : weekStartKey;

  const [cards, setCards] = useState<RecapCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const offscreenRef = useRef<HTMLDivElement>(null);
  const [captureCard, setCaptureCard] = useState<RecapCardData | null>(null);
  const renderedRef = useRef<Rendered[]>([]);
  renderedRef.current = rendered;

  // 1) Build card data for the scope/date (fetches water/diet + hero photo).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const key = scope === 'day' ? dayKey : weekStartKey;
      const water: Record<string, WaterLogDoc> = {};
      const nutrition: Record<string, NutritionLogDoc> = {};
      if (uid) {
        try {
          if (scope === 'day') {
            const [w, n] = await Promise.all([getWaterLog(uid, key), getNutritionLog(uid, key)]);
            if (w) water[key] = w;
            if (n) nutrition[key] = n;
          } else {
            const endKey = dayjs(key).add(6, 'day').format('YYYY-MM-DD');
            const [w, n] = await Promise.all([getWaterLogsInRange(uid, key, endKey), getNutritionLogsInRange(uid, key, endKey)]);
            Object.assign(water, w);
            Object.assign(nutrition, n);
          }
        } catch (err) {
          console.error('[Recap] failed to load water/diet:', err);
        }
      }
      const hero = pickHeroPhoto(progressPhotos, scope, key);
      const photoDataUrl = hero ? await toDataUrl(hero.url) : null;
      if (cancelled) return;
      setCards(
        buildRecap({ scope, dateKey: key, profile, workouts, prs, bodyStats, habits, weeklyGoals, progressPhotos, water, nutrition, photoDataUrl })
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, dayKey, weekStartKey, uid, profile, workouts, prs, bodyStats, habits, weeklyGoals, progressPhotos]);

  // 2) Pre-render every card to a PNG blob (so Share fires within the tap gesture).
  useEffect(() => {
    if (!cards.length) {
      setRendered((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      return;
    }
    let cancelled = false;
    const createdUrls: string[] = [];
    (async () => {
      setRendering(true);
      const out: Rendered[] = [];
      for (const card of cards) {
        if (cancelled) break;
        flushSync(() => setCaptureCard(card));
        await waitForShareCardPaint();
        const node = offscreenRef.current;
        if (!node) continue;
        try {
          const blob = await captureCardPng(node, null, 2);
          const url = URL.createObjectURL(blob);
          createdUrls.push(url);
          out.push({ card, blob, url });
        } catch (err) {
          console.error('[Recap] render failed:', err);
        }
      }
      flushSync(() => setCaptureCard(null));
      if (cancelled) {
        createdUrls.forEach(URL.revokeObjectURL);
        return;
      }
      setRendered((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return out;
      });
      setRendering(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cards, theme]);

  // Revoke object URLs on unmount.
  useEffect(() => () => renderedRef.current.forEach((r) => URL.revokeObjectURL(r.url)), []);

  const shareAll = useCallback(async () => {
    if (!rendered.length) return;
    const files = rendered.map((r) => new File([r.blob], cardFilename(r.card, scopeKey, theme), { type: 'image/png' }));
    const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean; share?: (d?: ShareData) => Promise<void> };
    if (nav.canShare?.({ files }) && nav.share) {
      try {
        await nav.share({ files, title: 'FitTrack Recap' });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    setBusy('Saving…');
    rendered.forEach((r) => downloadShareCard(r.blob, cardFilename(r.card, scopeKey, theme)));
    toast.success(`Saved ${rendered.length} cards`);
    setBusy(null);
  }, [rendered, scopeKey, theme]);

  const downloadAll = useCallback(async () => {
    if (!rendered.length) return;
    setBusy('Saving…');
    for (const r of rendered) {
      downloadShareCard(r.blob, cardFilename(r.card, scopeKey, theme));
      await new Promise((res) => setTimeout(res, 200));
    }
    toast.success(`Downloaded ${rendered.length} cards`);
    setBusy(null);
  }, [rendered, scopeKey, theme]);

  const currentWeekStart = getWeekStart();
  const canGoNextWeek = weekStartKey < currentWeekStart;
  const firstLoading = rendered.length === 0 && (rendering || loading);

  if (!hydrated) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="ft-title text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Recap
          </h1>
          <p className="ft-subtitle mt-1 text-sm">Auto-generated share cards for your day &amp; week — ready for Stories.</p>
        </div>

        {/* Controls */}
        <div className="ft-card ft-card-padded space-y-4">
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-full max-w-xs">
            {(['day', 'week'] as RecapScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors',
                  scope === s ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                )}
              >
                {s === 'day' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>

          {scope === 'day' ? (
            <label className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <input type="date" value={dayKey} max={TODAY()} onChange={(e) => setDayKey(e.target.value)} className="ft-input w-auto" />
            </label>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWeekStartKey(dayjs(weekStartKey).subtract(1, 'week').format('YYYY-MM-DD'))}
                className="ft-btn ft-btn--ghost ft-btn--icon"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold tabular-nums min-w-[150px] text-center">{getTrackingWeekRangeLabel(weekStartKey)}</span>
              <button
                type="button"
                onClick={() => canGoNextWeek && setWeekStartKey(dayjs(weekStartKey).add(1, 'week').format('YYYY-MM-DD'))}
                disabled={!canGoNextWeek}
                className="ft-btn ft-btn--ghost ft-btn--icon disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Background picker */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Background</p>
            <div className="flex gap-3">
              {BG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors',
                    theme === opt.value ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  <span
                    className={cn(
                      'relative h-10 w-10 rounded-full shadow-sm',
                      theme === opt.value && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                    style={opt.swatch}
                  >
                    {theme === opt.value && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-primary drop-shadow" />
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={downloadAll} disabled={!!busy || firstLoading || rendered.length === 0} className="ft-btn ft-btn--secondary disabled:opacity-50">
              <Download className="h-4 w-4" />
              Download all
            </button>
            <button type="button" onClick={shareAll} disabled={!!busy || firstLoading || rendered.length === 0} className="ft-btn ft-btn--primary disabled:opacity-50">
              <Share2 className="h-4 w-4" />
              Share all
            </button>
            {(busy || rendering) && (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {busy ?? 'Rendering…'}
              </span>
            )}
          </div>
        </div>

        {/* Gallery */}
        {firstLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Building your recap…
          </div>
        ) : (
          <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-4 transition-opacity', rendering && 'opacity-50')}>
            {rendered.map((r) => (
              <div key={r.card.id} className="space-y-2">
                <div className="rounded-2xl border border-border overflow-hidden bg-muted/30 shadow-sm">
                  <img src={r.url} alt="" className="block w-full" style={{ aspectRatio: '1080 / 1920', objectFit: 'contain' }} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadShareCard(r.blob, cardFilename(r.card, scopeKey, theme))}
                    disabled={rendering}
                    className="ft-btn ft-btn--secondary ft-btn--sm flex-1 disabled:opacity-50"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shareBlob(r.blob, cardFilename(r.card, scopeKey, theme))}
                    disabled={rendering}
                    className="ft-btn ft-btn--primary ft-btn--sm flex-1 disabled:opacity-50"
                    aria-label="Share"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offscreen full-size capture mount (one card at a time) */}
      <div style={{ position: 'fixed', left: -99999, top: 0, zIndex: -1, pointerEvents: 'none' }} aria-hidden>
        {captureCard && <RecapCard ref={offscreenRef} data={captureCard} theme={theme} />}
      </div>
    </PageTransition>
  );
}
